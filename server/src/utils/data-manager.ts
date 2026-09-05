import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import readline from "node:readline";
import linesCount from "file-lines-count";
import StreamZip from "node-stream-zip";

process.loadEnvFile();
const datasetPath = process.env.DATASET_PATH as string;
const datasetUrl = process.env.DATASET_URL as string;
const KaggleUsername = process.env.KAGGLE_USERNAME;
const KaggleKey = process.env.KAGGLE_KEY;


export const fetchDataset = async (): Promise<void> => {
  if (fs.existsSync(datasetPath)) {
    return;
  }

  if (!KaggleUsername || !KaggleKey) {
    throw new Error("Missing Kaggle credentials");
  }

  const targetDir = path.dirname(datasetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const zipPath = path.join(targetDir, "arxiv-dataset.zip");
  const credentials = Buffer.from(`${KaggleUsername}:${KaggleKey}`).toString("base64");

  console.log("Downloading arXiv dataset from Kaggle...");

  const response = await fetch(datasetUrl, {
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch dataset from Kaggle: ${response.status} ${response.statusText}`,
    );
  }

  if (!response.body) {
    throw new Error("No response body received from Kaggle download");
  }

  const fileStream = fs.createWriteStream(zipPath);
  await pipeline(Readable.fromWeb(response.body as any), fileStream);

  console.log("Extracting dataset archive...");
  const zip = new StreamZip.async({ file: zipPath });
  await zip.extract(null, path.resolve(targetDir));
  await zip.close();
  await fs.promises.unlink(zipPath);

  console.log("Dataset successfully downloaded and extracted.");
};

export const getTotalLinesCount = async (): Promise<number> => {
  await fetchDataset();
  const totalLinesCount = await linesCount(datasetPath);
  return totalLinesCount;
};

export const processJSONLines = async (): Promise<readline.Interface> => {
  await fetchDataset();

  const fileStream = fs.createReadStream(datasetPath);

  return readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
};
