import { getPipelineInstance, getEmbeddedObjs } from "./embedding-service.js";

export const ingestToMilvus = async (
  client,
  objects,
  collectionName,
  batchSize,
  embedBatchSize,
) => {
  let batch = [];
  let objectsToEmbed = [];
  const pipeline = await getPipelineInstance();

  const batchIngest = async (data) => {
    try {
      await client.upsert({
        collection_name: collectionName,
        data: data,
      });
    } catch (error) {
      console.log("Failed to ingest batch, retrying them individually...");

      // if batch insert fails, insert each item individually
      for (const obj of data) {
        try {
          await client.upsert({
            collection_name: collectionName,
            data: [obj],
          });
        } catch (error) {
          console.error(`Failed to ingest ${obj.headline}`);
        }
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
          console.log(`Inserting batch of ${batch.length} to Milvus`);
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
      console.log(`Dealing with leftover batches of ${batch.length}`);
      await batchIngest(batch);
    }

    console.log("Completed ingesting objects to Milvus.");
  } catch (error) {
    console.error("Failed to ingest objects to Milvus:", error);
    throw error;
  }
};
