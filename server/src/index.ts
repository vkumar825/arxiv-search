#!/usr/bin/env node

import express from "express";
import { searchRouter } from "./routes/search-route.js";
import { getMilvusClient } from "./config/milvus-client.js";
import { server as serverLogger } from "./utils/logger.js";
import { pinoHttp } from "pino-http";

process.loadEnvFile();

const EXPRESS_PORT = process.env.EXPRESS_PORT || 3000;
const app = express();

const formatHttpLog = (req: any, res: any) =>
  `${req.method} ${req.url} ${res.statusCode} ${res.statusMessage}`;

// use pino-http middleware
app.use(
  pinoHttp({
    logger: serverLogger,
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
    customSuccessMessage: formatHttpLog,
    customErrorMessage: formatHttpLog,
    customErrorObject: (_req, _res, _err, val) => ({
      res: val.res,
      responseTime: val.responseTime,
    }),
  }),
);

// initialize milvusClient
await getMilvusClient();

// use built-in Express.js middlewares
app.use(express.json());

app.use("/api/v1", searchRouter);

app.get("/", (req: express.Request, res: express.Response) => {
  res.json({
    message:
      "arxiv-search API is running. Use /api/v1/search?term=yourterm&limit=10 to search.",
  });
});

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    serverLogger.error(
      { err: err.message, method: req.method, url: req.url },
      "An unexpected server error occurred",
    );

    res.status(500).json({ error: "500 Internal Server Error" });
  },
);

app.listen(EXPRESS_PORT, () => {
  serverLogger.info(
    `arxiv-search API is running on http://localhost:${EXPRESS_PORT}`,
  );
});
