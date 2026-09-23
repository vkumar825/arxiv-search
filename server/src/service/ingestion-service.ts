import { createEmbeddings } from "./embedding-service.js";
import { MilvusClient } from "@zilliz/milvus2-sdk-node";
import { ArxivSchema } from "../models/arxiv-schema.js";
import { ingestion as ingestionLogger } from "../utils/logger.js";
import cliProgress from "cli-progress";
import { getTotalLinesCount, processJSONLines } from "../utils/data-loader.js";

const getExistingIds = async (
  client: MilvusClient,
  collectionName: string,
  batchSize: number,
): Promise<Set<string>> => {
  try {
    await client.loadCollectionSync({
      collection_name: collectionName,
    });

    const iterator = await client.queryIterator({
      collection_name: collectionName,
      batchSize: batchSize,
      expr: 'id != ""',
      output_fields: ["id"],
    });

    const ids = new Set<string>();

    for await (const element of iterator) {
      if (Array.isArray(element)) {
        for (const item of element) {
          if (item?.id) {
            ids.add(item.id);
          }
        }
      }
    }

    return ids;
  } catch (error) {
    ingestionLogger.error(
      {
        collectionName,
        err: error instanceof Error ? error.message : String(error),
      },
      "Failed to retrieve existing IDs from Milvus",
    );
    throw error;
  }
};

export const ingestToMilvus = async (
  client: MilvusClient,
  collectionName: string,
  batchSize: number,
  embedBatchSize: number,
  limit?: number,
) => {
  let batch: Record<string, any>[] = [];
  let objectsToEmbed: ArxivSchema[] = [];
  let batchCount = 0;
  let embedBatchCount = 0;
  let processedCount = 0;
  let upsertedCount = 0;
  let skippedCount = 0;

  const seenIds = await getExistingIds(client, collectionName, batchSize);
  const existingCount = seenIds.size;

  if (existingCount > 0) {
    ingestionLogger.info(
      { collectionName, existingRecords: existingCount },
      `Found ${existingCount} already ingested records in Milvus; skipping them to avoid re-embedding`,
    );
  }

  const total = limit ?? (await getTotalLinesCount());
  const rl = await processJSONLines();

  ingestionLogger.info(
    {
      collectionName,
      totalRecords: total,
      existingRecords: existingCount,
      batchSize,
      embedBatchSize,
      limit: limit ?? null,
    },
    "Starting arXiv ingestion to Milvus",
  );

  const progressBar = new cliProgress.SingleBar({
    format:
      "Ingesting arXiv records: {percentage}%|{bar}| {value}/{total} [{duration_formatted}<{eta_formatted}, fails: {fails}]",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    hideCursor: true,
  });

  progressBar.start(total, 0, { fails: 0 });

  const batchIngest = async (data: Record<string, any>[]) => {
    const upsertStartTime = Date.now();
    try {
      const batchRes = await client.upsert({
        collection_name: collectionName,
        data: data,
      });

      if (batchRes.status && batchRes.status.error_code !== "Success") {
        throw new Error(batchRes.status.reason || "Batch upsert failed");
      }

      upsertedCount += data.length;
      batchCount += 1;
      const durationMs = Date.now() - upsertStartTime;
      progressBar.increment(data.length);

      ingestionLogger.debug(
        {
          batch: batchCount,
          recordCount: data.length,
          upsertedCount,
          durationMs,
        },
        "Batch upserted to Milvus",
      );
    } catch (error) {
      ingestionLogger.warn(
        "Failed to ingest batch, retrying them individually...",
      );
      let failCount = 0;

      // if batch upsert fails, upsert each item individually
      for (const obj of data) {
        try {
          const singleRes = await client.upsert({
            collection_name: collectionName,
            data: [obj],
          });

          if (singleRes.status && singleRes.status.error_code !== "Success") {
            throw new Error(singleRes.status.reason || "Single upsert failed");
          }
          upsertedCount++;
        } catch (error) {
          failCount++;
          ingestionLogger.error(
            {
              err: error instanceof Error ? error.message : String(error),
              arxivId: obj.arxivId,
              title: obj.title,
              batch: batchCount,
            },
            "Failed to ingest record",
          );
        } finally {
          progressBar.increment(1, { fails: failCount });
        }
      }
      if (failCount === 0) {
        ingestionLogger.info(
          { batch: batchCount },
          "Successfully recovered failed batch via individual inserts",
        );
      } else {
        ingestionLogger.info(
          { batch: batchCount, failCount },
          "Batch recovery completed with partial failures",
        );
      }
    }
  };

  const getEmbeddings = async () => {
    if (objectsToEmbed.length === 0) return;
    const texts = objectsToEmbed.map((obj) => obj.text);
    embedBatchCount += 1;
    const currentEmbedBatch = embedBatchCount;
    const count = texts.length;

    const embedStartTime = Date.now();
    const vectors = await createEmbeddings(texts);
    const durationMs = Date.now() - embedStartTime;

    vectors.forEach((vec, i) => {
      objectsToEmbed[i].denseVector = vec;
    });

    batch.push(...objectsToEmbed.map((doc) => doc.object));
    objectsToEmbed = []; // reset array to embed the next batch

    ingestionLogger.debug(
      {
        embedBatch: currentEmbedBatch,
        count,
        durationMs,
      },
      "Generated embeddings for batch",
    );
  };

  try {
    for await (const line of rl) {
      if (!line.trim()) continue;

      const rawData = JSON.parse(line);
      const schemaInstance = new ArxivSchema(rawData);
      const currentId = schemaInstance.id;

      if (seenIds.has(currentId)) {
        skippedCount++;
        if (limit) {
          progressBar.setTotal(limit + skippedCount);
        }
        progressBar.increment(1);
        continue;
      }
      seenIds.add(currentId);

      objectsToEmbed.push(schemaInstance);
      processedCount++;

      if (objectsToEmbed.length >= embedBatchSize) {
        await getEmbeddings();
      }

      if (batch.length >= batchSize) {
        await batchIngest(batch);
        batch = []; // reset array for next batch
      }

      if (limit && processedCount >= limit) {
        break;
      }
    }

    // embed any remaining objects in objectsToEmbed that didn't reach embedBatchSize
    if (objectsToEmbed.length > 0) {
      await getEmbeddings();
    }

    if (batch.length > 0) {
      await batchIngest(batch);
      batch = [];
    }

    progressBar.stop();

    await client.flush({ collection_names: [collectionName] });

    ingestionLogger.info(
      {
        collectionName,
        upserted: upsertedCount,
        skipped: skippedCount,
      },
      "Ingestion run completed successfully",
    );
  } catch (error) {
    ingestionLogger.error(
      {
        err: error instanceof Error ? error.message : String(error),
        collectionName,
        processedBeforeFailure: processedCount,
      },
      "Failed to ingest objects to Milvus",
    );
    throw error;
  } finally {
    progressBar.stop();
  }
};
