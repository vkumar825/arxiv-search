import { createEmbeddings } from "./embedding-service.js";
import { MilvusClient } from "@zilliz/milvus2-sdk-node";
import { ArxivSchema } from "../models/arxiv-schema.js";
import { ingestion as ingestionLogger } from "../utils/logger.js";
import cliProgress from "cli-progress";
import { getTotalLinesCount, processJSONLines } from "../utils/data-loader.js";

export const ingestToMilvus = async (
  client: MilvusClient,
  collectionName: string,
  batchSize: number,
  embedBatchSize: number,
  limit?: number,
) => {
  const startTime = Date.now();
  let batch: Record<string, any>[] = [];
  let objectsToEmbed: ArxivSchema[] = [];
  let batchCount = 0;
  let embedBatchCount = 0;
  let processedCount = 0;
  let upsertedCount = 0;
  const seenIds = new Set<string>(); // keep track of ids already processed
  const total = limit ?? (await getTotalLinesCount());
  const rl = await processJSONLines();

  // Log milestones every 10% (or at least every batch)
  const milestoneInterval = Math.max(batchSize, Math.floor(total / 10));
  let nextMilestone = milestoneInterval;

  ingestionLogger.info(
    {
      collectionName,
      totalRecords: total,
      batchSize,
      embedBatchSize,
      milestoneInterval,
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

      if (upsertedCount >= nextMilestone) {
        const progressPercent = Math.min(
          100,
          Math.round((upsertedCount / total) * 100),
        );
        const elapsedSeconds = Number(
          ((Date.now() - startTime) / 1000).toFixed(1),
        );
        const recordsPerSecond =
          elapsedSeconds > 0
            ? Number((upsertedCount / elapsedSeconds).toFixed(1))
            : upsertedCount;

        ingestionLogger.info(
          {
            milestone: `${progressPercent}%`,
            upsertedRecords: upsertedCount,
            totalRecords: total,
            batch: batchCount,
            elapsedSeconds,
            recordsPerSecond,
          },
          `Milestone reached: ${upsertedCount}/${total} records (${progressPercent}%) successfully upserted`,
        );

        while (nextMilestone <= upsertedCount) {
          nextMilestone += milestoneInterval;
        }
      }
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
      ingestionLogger.info(
        { finalBatchSize: batch.length },
        "Ingesting final batch",
      );
      await batchIngest(batch);
      batch = [];
    }

    ingestionLogger.info(
      { collectionName },
      "Flushing collection to write segments to disk...",
    );
    const flushStartTime = Date.now();
    await client.flush({ collection_names: [collectionName] });
    const flushDurationMs = Date.now() - flushStartTime;
    ingestionLogger.info(
      { collectionName, durationMs: flushDurationMs },
      "Collection flushed successfully",
    );

    const totalDurationSeconds = Number(
      ((Date.now() - startTime) / 1000).toFixed(2),
    );
    const avgRecordsPerSecond =
      totalDurationSeconds > 0
        ? Number((upsertedCount / totalDurationSeconds).toFixed(1))
        : upsertedCount;

    ingestionLogger.info(
      {
        collectionName,
        totalProcessed: upsertedCount,
        totalBatches: batchCount,
        totalEmbedBatches: embedBatchCount,
        durationSeconds: totalDurationSeconds,
        recordsPerSecond: avgRecordsPerSecond,
      },
      "Ingestion run completed successfully",
    );
  } catch (error) {
    const totalDurationSeconds = Number(
      ((Date.now() - startTime) / 1000).toFixed(2),
    );
    ingestionLogger.error(
      {
        err: error instanceof Error ? error.message : String(error),
        collectionName,
        processedBeforeFailure: processedCount,
        durationSeconds: totalDurationSeconds,
      },
      "Failed to ingest objects to Milvus",
    );
    throw error;
  } finally {
    progressBar.stop();
  }
};
