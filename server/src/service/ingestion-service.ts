import { getEmbeddings } from "./embedding-service.js";
import { MilvusClient } from "@zilliz/milvus2-sdk-node";
import { BaseSchema } from "../models/arxiv-schema.js";
import logger from "../utils/logger.js";
import cliProgress from "cli-progress";
import { getPipelineInstance } from "../config/pipeline.js";
import { loadDataStream } from "../utils/data-loader.js";
import { retreiveSchemaInfo } from "../models/schema-registry.js";

export const ingestToMilvus = async (
  client: MilvusClient,
  collectionName: string,
  batchSize: number,
  embedBatchSize: number,
) => {
  let batch: any[] = [];
  let objectsToEmbed: BaseSchema[] = [];
  let batchCount = 0;
  const seenIds = new Set<string>(); // keep track of ids already processed
  const LOG_INTERVAL = 10;
  const objects: any = await loadDataStream();
  const SelectedSchema = retreiveSchemaInfo(process.env.SCHEMA_TYPE as string);

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

  const batchIngest = async (data: any[]) => {
    try {
      await client.upsert({
        collection_name: collectionName,
        data: data,
      });
      batchCount += 1;
      progressBar.increment(data.length);

      // keep track of milestone, every 10k batches
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
            { err: error, headline: obj.headline, batch: batchCount },
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
    for await (const obj of objects) {
      const schemaInstance = new SelectedSchema(obj);
      const currentId = schemaInstance.id;
      if (seenIds.has(currentId)) {
        progressBar.increment(1);
        continue;
      }
      seenIds.add(currentId);

      objectsToEmbed.push(schemaInstance);

      if (objectsToEmbed.length >= embedBatchSize) {
        const texts = objectsToEmbed.map((obj: BaseSchema) => obj.text);
        const vectors = await getEmbeddings(texts);

        vectors.forEach((vec, i) => {
          objectsToEmbed[i].vector = vec;
        });

        batch.push(...objectsToEmbed.map((doc: BaseSchema) => doc.object));
        objectsToEmbed = []; // reset array to embed the next batch
      }

      if (batch.length >= batchSize) {
        await batchIngest(batch);
        batch = []; // reset array for next batch
      }
    }
    // embed any remaining objects in objectsToEmbed that didn't reach embedBatchSize
    if (objectsToEmbed.length > 0) {
      const texts = objectsToEmbed.map((obj: BaseSchema) => obj.text);
      const vectors = await getEmbeddings(texts);
      vectors.forEach((vec, i) => {
        objectsToEmbed[i].vector = vec;
      });
      batch.push(...objectsToEmbed.map((doc: BaseSchema) => doc.object));
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
