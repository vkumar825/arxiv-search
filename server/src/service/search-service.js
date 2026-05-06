import { getMilvusClient } from "../config/milvus-client.js";
import { getPipelineInstance } from "../config/pipeline.js";

const milvusClient = await getMilvusClient();
const pipeline = await getPipelineInstance();
const ALIAS = process.env.MILVUS_ALIAS;

export const getSearchResults = async (term, limit = 10, filterExpr = "") => {
  const encodedTerm = await pipeline(term, {
    pooling: "mean",
    normalize: true,
  });

  const results = await milvusClient.search({
    collection_name: ALIAS,
    data: [...encodedTerm.data],
    limit: limit,
    filters: filterExpr,
    output_fields: ["*"],
  });

  return results;
};
