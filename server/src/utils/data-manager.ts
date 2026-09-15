import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import readline from "node:readline";
import linesCount from "file-lines-count";
import StreamZip from "node-stream-zip";

process.loadEnvFile();
const datasetPath = process.env.RAW_DATASET_PATH as string;
const cleanDatasetPath = process.env.CLEANED_DATASET_PATH as string;
const datasetUrl = process.env.DATASET_URL as string;
const kaggleUsername = process.env.KAGGLE_USERNAME;
const kaggleKey = process.env.KAGGLE_KEY;

export const fetchRawDataset = async (): Promise<void> => {
  if (fs.existsSync(datasetPath)) {
    return;
  }

  if (!kaggleUsername || !kaggleKey) {
    throw new Error("Missing Kaggle credentials");
  }

  const targetDir = path.dirname(datasetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const zipPath = path.join(targetDir, "arxiv-dataset.zip");
  const credentials = Buffer.from(`${kaggleUsername}:${kaggleKey}`).toString(
    "base64",
  );

  console.log("Downloading raw arXiv dataset from Kaggle...");

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

  console.log("Extracting dataset...");
  const zip = new StreamZip.async({ file: zipPath });
  await zip.extract(null, path.resolve(targetDir));
  await zip.close();
  await fs.promises.unlink(zipPath);

  console.log("Raw arXiv dataset successfully downloaded and extracted.");
};

export const getTotalLinesCount = async (): Promise<number> => {
  if (!cleanDatasetPath || !fs.existsSync(cleanDatasetPath)) {
    throw new Error(
      `Cannot count lines: cleaned dataset not found at "${cleanDatasetPath}".`,
    );
  }
  return await linesCount(cleanDatasetPath);
};

export const processJSONLines = async (): Promise<readline.Interface> => {
  if (!cleanDatasetPath || !fs.existsSync(cleanDatasetPath)) {
    if (datasetPath && !fs.existsSync(datasetPath)) {
      await fetchRawDataset();
    }
    throw new Error(
      `Cleaned arXiv dataset not found at "${cleanDatasetPath}".\n` +
        "Please refer to pipeline/README.md to generate a cleaned dataset.",
    );
  }

  const fileStream = fs.createReadStream(cleanDatasetPath);

  return readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
};
