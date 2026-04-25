import { pipeline } from "@huggingface/transformers";

process.loadEnvFile();

let pipelinePromise = null;

export const getPipelineInstance = async () => {
  if (pipelinePromise) {
    return pipelinePromise;
  }

  pipelinePromise = pipeline(
    process.env.MODEL_TASK,
    process.env.MODEL_NAME,
  ).catch((error) => {
    pipelinePromise = null;
    console.error("Failed to initialize pipeline:", error);
    throw error;
  });

  return pipelinePromise;
};

export const getEmbeddedObjs = async (pipeline, objects) => {
  const texts = objects.map((obj) => obj.short_description);
  const embeddedObjs = [];

  const output = await pipeline(texts, {
    pooling: "mean",
    normalize: true,
  });

  const embeddings = output.tolist();

  if (embeddings.length !== texts.length) {
    throw new Error(
      `Embedding mismatch: Got ${embeddings.length} embeddings for ${objects.length} texts.`,
    );
  }

  const createId = (headline) => {
    return crypto.createHash("sha256").update(headline).digest("hex");
  };

  for (let i = 0; i < objects.length; i++) {
    embeddedObjs.push({
      id: createId(objects[i].headline),
      headline: objects[i].headline,
      vector: embeddings[i],
      category: objects[i].category,
    });
  }

  return embeddedObjs;
};
