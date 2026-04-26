#!/usr/bin/env node

import { fileURLToPath } from "url";
import { Command } from "commander";
import { getSearchResults } from "./service/search-service.js";
import { runMilvusClient } from "./config/milvus-client.js";

process.loadEnvFile();

const isMain = process.argv[1] == fileURLToPath(import.meta.url);

if (isMain) {
  (async () => {
    const program = new Command();

    program
      .name("search-cli")
      .description("Search CLI tool for searching the Milvus vector database");

    const search = program
      .command("search <term> <collectionName>")
      .description("search for a term and retrieve results")
      .option("-l, --limit <number>", "number of results to retrieve", 10)
      .option(
        "-c, --category <name>",
        "filter results by a specific category name",
      );

    const options = search.opts();

    search.action(
      runMilvusClient(async (client, term, collectionName, options) => {
        const filterExpr = options.category ? `category == "${category}"` : "";

        const results = await getSearchResults(
          client,
          term,
          collectionName,
          parseInt(options.limit),
          filterExpr,
        );

        console.table(results);
        
      }),
    );

    try {
      await program.parseAsync();
    } catch (error) {
      console.error("Failed to run Search CLI:", error);
    }
  })();
}
