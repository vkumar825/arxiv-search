import { DataType } from "@zilliz/milvus2-sdk-node";

// schema designed for this dataset (https://www.kaggle.com/datasets/setseries/news-category-dataset)
export const SandboxSchema = [
  {
    name: "id",
    data_type: DataType.VarChar,
    max_length: 64,
    is_primary_key: true,
  },
  {
    name: "vector",
    data_type: DataType.FloatVector,
    dim: 384,
  },
  {
    name: "headline",
    data_type: DataType.VarChar,
    max_length: 256,
  },
  {
    name: "category",
    data_type: DataType.VarChar,
    max_length: 64,
    is_partition_key: true,
  },
];

export const SandboxIndexParams = [
  {
    field_name: "id",
    index_type: "AUTOINDEX",
  },
  {
    field_name: "vector",
    index_type: "AUTOINDEX",
    metric_type: "COSINE",
  },
  {
    field_name: "category",
    index_type: "AUTOINDEX",
  },
];
