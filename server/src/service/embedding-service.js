import crypto from "crypto";

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
