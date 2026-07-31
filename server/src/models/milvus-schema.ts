import { DataType, FieldType } from "@zilliz/milvus2-sdk-node";
import crypto from "crypto";

export abstract class BaseSchema {
  #vector: number[] | null = null; // using hashtag to set this to private

  constructor() {}

  set vector(vec: number[]) {
    this.#vector = vec;
  }

  get vector(): number[] | null {
    return this.#vector;
  }

  abstract id: string;
  abstract get text(): string;
  abstract get object(): Record<string, any>;
  abstract createId(data: any): string;
}

export class SandboxSchema extends BaseSchema {
  id: string;
  title: string;
  category: string;
  _text: string;

  constructor(data: any) {
    super();
    this.id = this.createId(data);
    this.title = data.headline;
    this.category = this.sanitizeCategory(data.category);
    this._text = data.short_description; // using underscore to avoid naming conflict with the getter
  }

  // This will be called when adding each object in batches for bulk inserts, or doing individual inserts
  get object(): Record<string, any> {
    return {
      id: this.id,
      headline: this.title,
      vector: this.vector,
      category: this.category,
    };
  }

  get text(): string {
    return this._text;
  }

  sanitizeCategory(category: string): string {
    let sanitizedCategory = category
      .toLowerCase()
      .replaceAll("&", "and")
      .replaceAll(" ", "-");

    return sanitizedCategory;
  }

  createId(data: any): string {
    const uniqueId = [data.headline, data.links || "", data.category].join("|");
    return crypto.createHash("sha256").update(uniqueId).digest("hex");
  }

  static get filterExpression(): string {
    return 'category == "%s"';
  }

  // Schema designed for this dataset (https://www.kaggle.com/datasets/setseries/news-category-dataset)
  // Both schema and indexParams getters are used for creating a Milvus Collection
  static get schema(): FieldType[] {
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

  static get indexParams(): any[] {
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
