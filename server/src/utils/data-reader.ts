import path from "node:path";
import csv from "csvtojson";
import fs from "node:fs";
import readline from "node:readline";

process.loadEnvFile();

export const processJSONLines = async () => {
  const datasetPath = process.env.DATASET_PATH as string;

  const fileStream = fs.createReadStream(datasetPath);

  return readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
};
