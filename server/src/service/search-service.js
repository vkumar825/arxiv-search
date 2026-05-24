import { getMilvusClient } from "../config/milvus-client.js";
import { getPipelineInstance } from "../config/pipeline.js";
import { retreiveSchemaInfo } from "../models/schema-registry.js";
import { format } from "node:util";

const milvusClient = await getMilvusClient();
const pipeline = await getPipelineInstance();
const ALIAS = process.env.MILVUS_ALIAS;

export const getSearchResults = async (term, limit = 10, filter = "") => {
  const encodedTerm = await pipeline(term, {
    pooling: "mean",
    normalize: true,
  });

  let filterExpression = "";

  if (filter) {
    // get the filterExpression if applicable
    const SelectedSchema = retreiveSchemaInfo(process.env.SCHEMA_TYPE);
    filterExpression = format(SelectedSchema.filterExpression, filter);
  }

  const results = await milvusClient.search({
    collection_name: ALIAS,
    data: [...encodedTerm.data],
    limit: limit,
    filter: filterExpression,
    output_fields: ["*"],
  });

  return results;
};
