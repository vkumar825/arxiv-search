import { FunctionType } from "@zilliz/milvus2-sdk-node";
import { getMilvusClient } from "../config/milvus-client.js";
import { getPipelineInstance } from "../config/pipeline.js";
import { buildFilterExpression } from "../utils/filter-builder.js";

const milvusClient = await getMilvusClient();
const pipeline = await getPipelineInstance();

const ALIAS = process.env.MILVUS_ALIAS as string

// Hybrid Search tuning constants
const SPARSE_CANDIDATES_LIMIT = 100;
const DENSE_CANDIDATES_LIMIT = 100;
const K_CONSTANT = 60;

export const getSearchResults = async (
  term: string,
  limit: number,
  arxivId: string = "",
  categories: string[] = [],
  authors: string[] = [],
  createdDates: string[] = [],
) => {
  const filterExpression = buildFilterExpression({
    arxivId,
    categories,
    authors,
    createdDates,
  });

  // use .query if search term is not provided
  if (!term || term.trim() === "") {
    const queryResults = await milvusClient.query({
      collection_name: ALIAS,
      filter: filterExpression,
      limit: limit,
      output_fields: [
        "arxivId",
        "authors",
        "title",
        "journalRef",
        "doi",
        "categories",
        "abstract",
        "createdDate",
        "updatedDate",
      ],
    });

    // exclude the "id" field from appearing in the API response
    const sanitizedResults = queryResults.data.map(({ id, ...rest }) => rest);
    return { results: sanitizedResults };
  }

  // prepend bge query instruction to the search term for higher recall
  const encodedTerm = await pipeline(
    `Represent this sentence for searching relevant passages: ${term}`,
    {
      pooling: "mean",
      normalize: true,
    },
  );

  const results = await milvusClient.hybridSearch({
    collection_name: ALIAS,
    data: [
      {
        data: [...encodedTerm.data],
        anns_field: "denseVector",
        limit: DENSE_CANDIDATES_LIMIT,
        expr: filterExpression,
      },
      {
        data: [term],
        anns_field: "sparseVector",
        limit: SPARSE_CANDIDATES_LIMIT,
        expr: filterExpression,
      },
    ],
    rerank: {
      name: "rrf",
      type: FunctionType.RERANK,
      input_field_names: [],
      params: {
        reranker: "rrf",
        k: K_CONSTANT,
      },
    },
    limit: limit,
    output_fields: [
      "arxivId",
      "authors",
      "title",
      "journalRef",
      "doi",
      "categories",
      "abstract",
      "createdDate",
      "updatedDate",
    ],
  });

  return results;
};
