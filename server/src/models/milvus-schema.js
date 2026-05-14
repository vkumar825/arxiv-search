import { DataType } from "@zilliz/milvus2-sdk-node";
import crypto from "crypto";

class BaseSchema {
  #vector = null; // using hashtag to set this to private

  constructor() {}

  set vector(vec) {
    this.#vector = vec;
  }

  get vector() {
    return this.#vector;
  }

  createId() {
    throw new Error("Method not implemented for BaseSchema class");
  }
}

export class SandboxSchema extends BaseSchema {
  constructor(data) {
    super();
    this.id = this.createId(data);
    this.title = data.headline;
    this.category = data.category;
    this._text = data.short_description; // using underscore to avoid naming conflict with the getter
  }

  // This will be called when adding each object in batches for bulk inserts, or doing individual inserts
  get object() {
    return {
      id: this.id,
      headline: this.title,
      vector: this.vector,
      category: this.category,
    };
  }

  get text() {
    return this._text;
  }

  createId(data) {
    const uniqueId = [
      data.headline,
      data.links,
      data.category,
    ].join("|");
    return crypto.createHash("sha256").update(uniqueId).digest("hex");
  }

  // Schema designed for this dataset (https://www.kaggle.com/datasets/setseries/news-category-dataset)
  // Both schema and indexParams getters are used for creating a Milvus Collection
  static get schema() {
    return [
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
  }

  static get indexParams() {
    return [
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
  }
}
