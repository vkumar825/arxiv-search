import { getMilvusClient } from "../config/milvus-client.js";
import { getPipelineInstance } from "../config/pipeline.js";
import { buildFilterExpression } from "../utils/filter-builder.js";

const milvusClient = await getMilvusClient();
const pipeline = await getPipelineInstance();
const ALIAS = process.env.MILVUS_ALIAS as string;

export const getSearchResults = async (
  term: string,
  limit: number = 10,
  arxivId: string = "",
  categories: string[] = [],
  authors: string[] = [],
  createdDates: string[] = []
) => {
  const encodedTerm = await pipeline(term, {
    pooling: "mean",
    normalize: true,
  });

  const filterExpression = buildFilterExpression({
    arxivId,
    categories,
    authors,
    createdDates,
  });

  const results = await milvusClient!.search({
    collection_name: ALIAS,
    data: [...encodedTerm.data],
    limit: limit,
    filter: filterExpression,
    output_fields: ["*"],
  });

  return results;
};
