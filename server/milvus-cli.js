#!/usr/bin/env node

import { fileURLToPath } from "url";
import { MilvusClient, DataType } from "@zilliz/milvus2-sdk-node";
import { Command } from "commander";
import csv from "csvtojson";
import { getEmbeddedObjs, getPipelineInstance } from "./embeddings.js";

process.loadEnvFile();

let clientPromise = null;

export const getMilvusClient = async () => {
  if (clientPromise) {
    return clientPromise;
  }

  clientPromise = (async () => {
    try {
      const client = new MilvusClient({
        address: process.env.MILVUS_ADDRESS,
        token: process.env.MILVUS_TOKEN,
      });

      const checkHealth = await client.checkHealth();

      if (!checkHealth.isHealthy) {
        throw new Error(
          `Milvus is unhealthy or unavailable: ${checkHealth.reasons}`,
        );
      }

      return client;
    } catch (error) {
      console.error("Milvus Initialization Error:", error);
      clientPromise = null;
      throw error;
    }
  })();

  return clientPromise;
};

export const closeMilvusClient = async () => {
  if (clientPromise) {
    const client = await clientPromise;
    await client.closeConnection();
    clientPromise = null;
  }
};

export const runMilvusClient =
  (command) =>
  async (...args) => {
    const client = await getMilvusClient();

    try {
      await command(client, ...args);
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    } finally {
      await closeMilvusClient();
    }
  };

const ingestToMilvus = async (
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

const getMilvusCollections = async (client) => {
  try {
    const res = await client.listCollections();
    return res.data.map((milvusCollection) => ({
      collection_name: milvusCollection.name,
    }));
  } catch (error) {
    console.error("Failed to retrieve Milvus collection(s):", error);
    throw error;
  }
};

const createMilvusAlias = async (client, aliasName, collectionName) => {
  try {
    await client.createAlias({
      collection_name: collectionName,
      alias: aliasName,
    });
    console.log(
      `Successfully created alias ${aliasName} for collection ${collectionName}`,
    );
  } catch (error) {
    console.error(`Failed to create alias ${aliasName} for ${collectionName}`);
    throw error;
  }
};

const dropMilvusAlias = async (client, aliasName) => {
  try {
    await client.dropAlias({
      alias: aliasName,
    });
    console.log(`Successfully dropped alias: ${aliasName}`);
  } catch (error) {
    console.error(`Failed to drop alias ${aliasName}`);
    throw error;
  }
};

const reassignMilvusAlias = async (client, aliasName, collectionName) => {
  try {
    await client.alterAlias({
      collection_name: collectionName,
      alias: aliasName,
    });
    console.log(`Successfully reassigned Milvus alias to ${collectionName}`);
  } catch (error) {
    console.error("Failed to reassign Milvus alias: ", error);
    throw error;
  }
};

const renameMilvusCollection = async (client, oldName, newName) => {
  try {
    await client.renameCollection({
      collection_name: oldName,
      new_collection_name: newName,
    });
    console.log(
      `Successfully renamed Milvus collection from ${oldName} to ${newName}`,
    );
  } catch (error) {
    console.error("Failed to rename Milvus collection: ", error);
    throw error;
  }
};

const dropMilvusCollection = async (client, name) => {
  const collections = await getMilvusCollections(client);

  if (!collections.some((c) => c.collection_name === name)) {
    console.log(`Cannot drop non-existent Milvus collection: ${name}`);
    return;
  }

  const res = await client.listAliases({ collection_name: name });

  if (Array.isArray(res.aliases) && res.aliases.length > 0) {
    console.log(
      `Detected ${res.aliases.length} alias(es), dropping them first...`,
    );
    for (const alias of res.aliases) {
      await dropMilvusAlias(client, alias);
    }
    console.log("Finished dropping alias(es), now dropping collection...");
  }

  try {
    await client.dropCollection({
      collection_name: name,
    });
    console.log(`Successfully dropped Milvus collection: ${name}`);
  } catch (error) {
    console.error("Failed to drop Milvus collection: ", error);
    throw error;
  }
};

const createMilvusCollection = async (client, name) => {
  const collections = await getMilvusCollections(client);

  if (collections.some((c) => c.collection_name === name)) {
    console.log(`Milvus collection ${name} already created`);
    return;
  }

  // schema designed for this dataset (https://www.kaggle.com/datasets/setseries/news-category-dataset)
  const schema = [
    {
      name: "id",
      data_type: DataType.VarChar,
      max_length: 64,
      is_primary_key: true,
    },
    {
      name: "vector",
      data_type: DataType.FloatVector,
      dim: 384,
    },
    {
      name: "headline",
      data_type: DataType.VarChar,
      max_length: 256,
    },
    {
      name: "category",
      data_type: DataType.VarChar,
      max_length: 64,
      is_partition_key: true,
    },
  ];

  const index_params = [
    {
      field_name: "id",
      index_type: "AUTOINDEX",
    },
    {
      field_name: "vector",
      index_type: "AUTOINDEX",
      metric_type: "COSINE",
    },
    {
      field_name: "category",
      index_type: "AUTOINDEX",
    },
  ];

  try {
    await client.createCollection({
      collection_name: name,
      schema: schema,
      index_params: index_params,
    });
    console.log(`Successfully created Milvus collection: ${name}`);
  } catch (error) {
    console.error("Failed to create Milvus collection:", error);
    throw error;
  }
};

const isMain = process.argv[1] == fileURLToPath(import.meta.url);

if (isMain) {
  (async () => {
    const program = new Command();

    program
      .name("milvus-cli")
      .description("CLI tool for managing the Milvus vector database");

    const create = program
      .command("create")
      .description("create Milvus resources");

    create
      .command("collection <name>")
      .description("create a new collection")
      .action(
        runMilvusClient(async (client, name) => {
          await createMilvusCollection(client, name);
        }),
      );

    create
      .command("alias <aliasName> <collectionName>")
      .description("create alias for a collection")
      .action(
        runMilvusClient(async (client, aliasName, collectionName) => {
          await createMilvusAlias(client, aliasName, collectionName);
        }),
      );

    const drop = program.command("drop").description("Drop Milvus resources");

    drop
      .command("collection <name>")
      .description("drop a collection")
      .action(
        runMilvusClient(async (client, name) => {
          await dropMilvusCollection(client, name);
        }),
      );

    drop
      .command("alias <aliasName>")
      .description("drop an alias")
      .action(
        runMilvusClient(async (client, aliasName) => {
          await dropMilvusAlias(client, aliasName);
        }),
      );

    const list = program.command("list").description("list Milvus resources");

    list.action(
      runMilvusClient(async (client) => {
        // get a list of both collection, and their associated aliases if present
        const collections = await getMilvusCollections(client);
        const aliasMap = new Map();

        try {
          for (const collection of collections) {
            const res = await client.listAliases({
              collection_name: collection.collection_name,
            });
            aliasMap.set(collection.collection_name, res.aliases);
          }
          console.table(
            Array.from(aliasMap, ([key, value]) => ({
              collection_name: key,
              aliases: value,
            })),
          );
        } catch (error) {
          console.error("Failed to retrieve Milvus alias(es):", error);
        }
      }),
    );

    const rename = program
      .command("rename <oldName> <newName>")
      .description("rename a collection");

    rename.action(
      runMilvusClient(async (client, oldName, newName) => {
        await renameMilvusCollection(client, oldName, newName);
      }),
    );

    const reassign = program
      .command("reassign <aliasName> <collectionName>")
      .description("reassign an alias to another collection");

    reassign.action(
      runMilvusClient(async (client, aliasName, collectionName) => {
        await reassignMilvusAlias(client, aliasName, collectionName);
      }),
    );

    const ingest = program
      .command("ingest <collectionName>")
      .description("ingest objects to a Milvus collection")
      .option(
        "-b, --batch-size <number>",
        "number of objects to ingest per batch",
        1000,
      )
      .option(
        "-e, --embed-batch-size <number>",
        "number of objects to process per embedding call",
        128,
      );

    const options = ingest.opts();

    ingest.action(
      runMilvusClient(async (client, collectionName) => {
        const objects = await csv().fromFile(process.env.DATASET_PATH);

        await ingestToMilvus(
          client,
          objects,
          collectionName,
          parseInt(options.batchSize, 10),
          parseInt(options.embedBatchSize, 10),
        );
      }),
    );

    await program.parseAsync();
  })();
}
