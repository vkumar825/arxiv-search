import { getPipelineInstance } from "../config/pipeline.js";

export const getEmbeddings = async (texts) => {
  const pipeline = await getPipelineInstance();

  const outputs = await pipeline(texts, {
    pooling: "mean",
    normalize: true,
  });

  const embeddings = outputs.tolist();

  if (embeddings.length !== texts.length) {
    throw new Error(
      `Embedding mismatch: Got ${embeddings.length} embeddings for ${texts.length} texts.`,
    );
  }

  return embeddings;
};

