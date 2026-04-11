#!/usr/bin/env node

import { fileURLToPath } from "url";
import { MilvusClient, DataType } from "@zilliz/milvus2-sdk-node";
import { Command } from "commander";

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
    console.log(`Successfully created alias ${aliasName} for collection ${collectionName}`);
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

const dropMilvusCollection = async (client, name) => {
  const collections = await getMilvusCollections(client);

  if (!collections.some((c) => c.collection_name === name)) {
    console.log(`Cannot drop non-existent Milvus collection: ${name}`);
    return;
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
      data_type: DataType.Int64,
      is_primary_key: true,
      auto_id: false,
    },
    {
      name: "vector",
      data_type: DataType.FloatVector,
      dim: 384, // Using Xenova/all-MiniLM-L6-v2 model
    },
    {
      name: "headline",
      data_type: DataType.VarChar,
      max_length: 512,
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
      .name("milvus-utils")
      .description(
        "Utilities CLI tool for managing the Milvus vector database",
      );

    const create = program
      .command("create")
      .description("Create Milvus resources");

    create
      .command("collection <name>")
      .description("Create a new collection")
      .action(
        runMilvusClient(async (client, name) => {
          await createMilvusCollection(client, name);
        }),
      );

    create
      .command("alias <aliasName> <collectionName>")
      .description("Create alias for a collection")
      .action(
        runMilvusClient(async (client, aliasName, collectionName) => {
          await createMilvusAlias(client, aliasName, collectionName);
        }),
      );

    const drop = program.command("drop").description("Drop Milvus resources");

    drop
      .command("collection <name>")
      .description("Drop a collection")
      .action(
        runMilvusClient(async (client, name) => {
          await dropMilvusCollection(client, name);
        }),
      );

    drop
      .command("alias <aliasName>")
      .description("Drop an alias")
      .action(
        runMilvusClient(async (client, aliasName) => {
          await dropMilvusAlias(client, aliasName);
        }),
      );

    const list = program.command("list").description("List Milvus resources");

    list.action(
      runMilvusClient(async (client, name) => {
        const collections = await getMilvusCollections(client);
        console.table(collections);
      }),
    );

    await program.parseAsync();
  })();
}
