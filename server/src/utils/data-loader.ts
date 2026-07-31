import path from "node:path";
import csv from "csvtojson";
import fs from "node:fs";

process.loadEnvFile();

export const loadDataStream = async () => {
  const datasetPath = process.env.DATASET_PATH as string;
  const ext = path.extname(datasetPath);

  if (ext === ".csv") {
    return fs.createReadStream(datasetPath).pipe(csv());
  } else if (ext === ".json") {
    throw new Error("JSON streaming not yet implemented");
  }

  throw new Error(`Unsupported file extension: ${ext}`);
};
