import fs from "node:fs";
import readline from "node:readline";
import linesCount from "file-lines-count";

process.loadEnvFile();
const datasetPath = process.env.RAW_DATASET_PATH as string;
const cleanDatasetPath = process.env.CLEANED_DATASET_PATH as string;

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
    throw new Error(
      `Cleaned arXiv dataset not found at "${cleanDatasetPath}".\n` +
        `Please refer to pipeline/README.md to generate a cleaned dataset from ${datasetPath}`,
    );
  }

  const fileStream = fs.createReadStream(cleanDatasetPath);

  return readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
};
