#!/usr/bin/env node

import express from "express";
import { fileURLToPath } from "url";
import { dirname } from "path";
import path from "node:path";
import { searchRouter } from "./routes/search-route.js";
import { getMilvusClient } from "./config/milvus-client.js";
import ejs from "ejs";

process.loadEnvFile();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EXPRESS_PORT = process.env.EXPRESS_PORT || 3000;
const app = express();

// initialize milvusClient
const milvusClient = await getMilvusClient();

// use built-in Express.js middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// use EJS templating engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use("/api/v1", searchRouter);

app.use(express.static(path.join(__dirname, "public")));

app.listen(EXPRESS_PORT, () => {
  console.log(`Server is running on http://localhost:${EXPRESS_PORT}`);
});
