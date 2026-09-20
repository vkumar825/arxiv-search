#!/usr/bin/env node

import { fileURLToPath } from "url";
import { Command } from "commander";
import { runMilvusClient } from "../config/milvus-client.js";
import { MilvusClient } from "@zilliz/milvus2-sdk-node";
import { ArxivSchema } from "../models/arxiv-schema.js";

process.loadEnvFile();

const getMilvusCollections = async (client: MilvusClient) => {
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

const createMilvusAlias = async (
  client: MilvusClient,
  aliasName: string,
  collectionName: string,
) => {
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

const dropMilvusAlias = async (client: MilvusClient, aliasName: string) => {
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

const reassignMilvusAlias = async (
  client: MilvusClient,
  aliasName: string,
  collectionName: string,
) => {
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

const renameMilvusCollection = async (
  client: MilvusClient,
  oldName: string,
  newName: string,
) => {
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

const dropMilvusCollection = async (client: MilvusClient, name: string) => {
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

const createMilvusCollection = async (client: MilvusClient, name: string) => {
  const collections = await getMilvusCollections(client);

  if (collections.some((c) => c.collection_name === name)) {
    console.log(`Milvus collection ${name} already created`);
    return;
  }

  try {
    await client.createCollection({
      collection_name: name,
      schema: ArxivSchema.schema,
      index_params: ArxivSchema.indexParams,
      functions: ArxivSchema.functions,
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
        "1000",
      )
      .option(
        "-e, --embed-batch-size <number>",
        "number of objects to process per embedding call",
        "128",
      )
      .option("-l, --limit <number>", "maximum number of objects to ingest");

    ingest.action(
      runMilvusClient(async (client, collectionName, options) => {
        const batchSize = parseInt(options.batchSize, 10);
        const embedBatchSize = parseInt(options.embedBatchSize, 10);
        const limit = options.limit ? parseInt(options.limit, 10) : undefined;

        if (limit !== undefined && limit < batchSize) {
          throw new Error(
            `Limit (${limit}) cannot be less than batch size (${batchSize})`,
          );
        }

        // dynamically import the function so it does not load the ingest function at the start
        const { ingestToMilvus } =
          await import("../service/ingestion-service.js");

        await ingestToMilvus(
          client,
          collectionName,
          batchSize,
          embedBatchSize,
          limit,
        );
      }),
    );

    try {
      await program.parseAsync();
    } catch (error) {
      console.error("Failed to run Utilities CLI:", error);
    }
  })();
}
