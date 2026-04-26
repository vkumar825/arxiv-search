import { getPipelineInstance } from "./embedding-service.js";

export const getSearchResults = async (
  client,
  term,
  collectionName,
  limit = 10,
  filterExpr = "",
) => {
  const pipeline = await getPipelineInstance();

  const encodedTerm = await pipeline(term, {
    pooling: "mean",
    normalize: true,
  });

  const res = await client.search({
    collection_name: collectionName,
    data: [...encodedTerm.data],
    limit: limit,
    filters: filterExpr,
    output_fields: ["*"],
  });

  return res.results.map((result) => result.headline);
};
