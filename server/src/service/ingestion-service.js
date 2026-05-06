import { getEmbeddedObjs } from "./embedding-service.js";
import logger from "../utils/logger.js";
import cliProgress from "cli-progress";
import { getPipelineInstance } from "../config/pipeline.js";

export const ingestToMilvus = async (
  client,
  objects,
  collectionName,
  batchSize,
  embedBatchSize,
) => {
  let batch = [];
  let objectsToEmbed = [];
  let batchCount = 0;
  const LOG_INTERVAL = 10;
  const pipeline = await getPipelineInstance();

  const progressBar = new cliProgress.SingleBar({
    format:
      "Ingesting |" +
      "{bar}" +
      "| {percentage}% || {value}/{total} Objects || Failures: {fails} || ETA: {eta}s",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    hideCursor: true,
  });

  progressBar.start(objects.length, 0, { fails: 0 });

  const batchIngest = async (data) => {
    try {
      await client.upsert({
        collection_name: collectionName,
        data: data,
      });
      batchCount += 1;
      progressBar.increment(data.length);

      // keep track of milestone, every 10k batches, and final batch is excluded
      if (batchCount % LOG_INTERVAL === 0 && data.length === batchSize) {
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
            error,
            { headline: obj.headline, batch: batchCount },
            "Failed to ingest object",
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

  try {
    for (const obj of objects) {
      objectsToEmbed.push(obj);

      if (objectsToEmbed.length >= embedBatchSize) {
        const embeddedObjs = await getEmbeddedObjs(pipeline, objectsToEmbed);
        batch.push(...embeddedObjs);
        objectsToEmbed = []; // reset array to embed the next subset

        if (batch.length >= batchSize) {
          await batchIngest(batch);
          batch = []; // reset array for next batch
        }
      }
    }

    // embed any remaining objects in objectsToEmbed that didn't reach embedBatchSize
    if (objectsToEmbed.length > 0) {
      const leftoverEmbeds = await getEmbeddedObjs(pipeline, objectsToEmbed);
      batch.push(...leftoverEmbeds);
    }

    if (batch.length > 0) {
      logger.info({ finalBatchSize: batch.length }, "Ingesting final batch");
      await batchIngest(batch);
    }

    logger.info("Completed ingesting objects to Milvus.");
  } catch (error) {
    logger.error(error, "Failed to ingest objects to Milvus");
    throw error;
  } finally {
    progressBar.stop();
  }
};
