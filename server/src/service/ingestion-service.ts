import { createEmbeddings } from "./embedding-service.js";
import { MilvusClient } from "@zilliz/milvus2-sdk-node";
import { ArxivSchema } from "../models/arxiv-schema.js";
import logger from "../utils/logger.js";
import cliProgress from "cli-progress";
import { processJSONLines } from "../utils/data-reader.js";

export const ingestToMilvus = async (
  client: MilvusClient,
  collectionName: string,
  batchSize: number,
  embedBatchSize: number,
) => {
  let batch: Record<string, any>[] = [];
  let objectsToEmbed: ArxivSchema[] = [];
  let batchCount = 0;
  const seenIds = new Set<string>(); // keep track of ids already processed
  const LOG_INTERVAL = 10;
  const lineReader = await processJSONLines();

  const progressBar = new cliProgress.SingleBar({
    format: "Ingesting | {value} Objects Processed || Failures: {fails}",
    hideCursor: true,
  });

  progressBar.start(0, 0, { fails: 0 });

  const batchIngest = async (data: Record<string, any>[]) => {
    try {
      await client.upsert({
        collection_name: collectionName,
        data: data,
      });
      batchCount += 1;
      progressBar.increment(data.length);

      // keep track of milestone, every 10 batches
      if (batchCount % LOG_INTERVAL === 0) {
        logger.info(
          { processed: batchCount * batchSize },
          "Reached ingestion milestone",
        );
      }
    } catch (error) {
      logger.warn("Failed to ingest batch, retrying them individually...");
      let failCount = 0;

      // if batch insert fails, insert each item individually
      for (const obj of data) {
        try {
          await client.upsert({
            collection_name: collectionName,
            data: [obj],
          });
        } catch (error) {
          failCount++;
          logger.error(
            {
              err: error,
              arxivId: obj.arxivId,
              title: obj.title,
              batch: batchCount,
            },
            "Failed to ingest document",
          );
        } finally {
          progressBar.increment(1, { fails: failCount });
        }
      }
      if (failCount === 0) {
        logger.info(
          { batch: batchCount },
          "Successfully recovered failed batch via individual inserts",
        );
      } else {
        logger.info(
          { batch: batchCount, failCount },
          "Batch recovery completed with partial failures",
        );
      }
    }
  };

  const getEmbeddings = async () => {
    if (objectsToEmbed.length === 0) return;
    const texts = objectsToEmbed.map((obj) => obj.text);
    const vectors = await createEmbeddings(texts);

    vectors.forEach((vec, i) => {
      objectsToEmbed[i].vector = vec;
    });

    batch.push(...objectsToEmbed.map((doc) => doc.object));
    objectsToEmbed = []; // reset array to embed the next batch
  };

  try {
    for await (const line of lineReader) {
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

      if (objectsToEmbed.length >= embedBatchSize) {
        await getEmbeddings();
      }

      if (batch.length >= batchSize) {
        await batchIngest(batch);
        batch = []; // reset array for next batch
      }
    }

    // embed any remaining objects in objectsToEmbed that didn't reach embedBatchSize
    if (objectsToEmbed.length > 0) {
      await getEmbeddings();
    }

    if (batch.length > 0) {
      logger.info({ finalBatchSize: batch.length }, "Ingesting final batch");
      await batchIngest(batch);
      batch = [];
    }

    logger.info("Completed ingesting objects to Milvus.");
  } catch (error) {
    logger.error(error, "Failed to ingest objects to Milvus");
    throw error;
  } finally {
    progressBar.stop();
  }
};
