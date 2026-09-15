import { getMilvusClient } from "../config/milvus-client.js";
import { getPipelineInstance } from "../config/pipeline.js";

const milvusClient = await getMilvusClient();
const pipeline = await getPipelineInstance();
const ALIAS = process.env.MILVUS_ALIAS as string;

export const getSearchResults = async (
  term: string,
  limit: number = 10,
  filter: string = "",
) => {
  const encodedTerm = await pipeline(term, {
    pooling: "mean",
    normalize: true,
  });

  const results = await milvusClient!.search({
    collection_name: ALIAS,
    data: [...encodedTerm.data],
    limit: limit,
    filter: filter,
    output_fields: ["*"],
  });

  return results;
};
