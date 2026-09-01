import { DataType, FieldType } from "@zilliz/milvus2-sdk-node";
import crypto from "node:crypto";

process.loadEnvFile();

const MODEL_DIMENSION = Number(process.env.MODEL_DIMENSION) || 384;

export abstract class BaseSchema {
  #vector: number[] | null = null; // Setting vector as a ECMAScript private field

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
}

export class SandboxSchema extends BaseSchema {
  id: string;
  title: string;
  category: string;
  private _text: string;

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
        dim: MODEL_DIMENSION,
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

export class ArxivSchema extends BaseSchema {
  id: string;
  arxivId: string;
  title: string;
  journalRef: string;
  doi: string;
  categories: string[];
  authors: string[];
  versions: string[];
  private _text: string;

  constructor(data: any) {
    super();
    this.id = this.createId(data);
    this.arxivId = data.id;
    this.title = data.title;
    this.journalRef = data["journal-ref"];
    this.doi = data.doi;
    this.categories = data.categories;
    this.authors = data.authors;
    this.versions = data.versions;
    this._text = data.abstract;
  }

  createId(data: any): string {
    const uniqueId = [data.title, data.id, data.doi || ""].join(":");
    return crypto.createHash("sha256").update(uniqueId).digest("hex");
  }

  get text(): string {
    return this._text;
  }
  get object(): Record<string, any> {
    return {
      id: this.id,
      arxivId: this.arxivId,
      title: this.title,
      journalRef: this.journalRef,
      doi: this.doi,
      categories: this.categories,
      authors: this.authors,
      versions: this.versions,
      abstract: this._text,
      vector: this.vector,
    };
  }
  // Milvus schema designed for this dataset (https://www.kaggle.com/datasets/Cornell-University/arxiv)
  static get schema(): FieldType[] {
    return [
      {
        name: "id",
        data_type: DataType.VarChar,
        max_length: 64,
        is_primary_key: true,
      },
      {
        name: "arxivId",
        data_type: DataType.VarChar,
        max_length: 32,
      },
      {
        name: "title",
        data_type: DataType.VarChar,
        max_length: 512,
      },
      {
        name: "journalRef",
        data_type: DataType.VarChar,
        max_length: 512,
        nullable: true,
      },
      {
        name: "doi",
        data_type: DataType.VarChar,
        max_length: 256,
        nullable: true,
      },
      {
        name: "categories",
        data_type: DataType.Array,
        element_type: DataType.VarChar,
        max_capacity: 32,
        max_length: 64,
      },
      {
        name: "authors",
        data_type: DataType.Array,
        element_type: DataType.VarChar,
        max_capacity: 512,
        max_length: 128,
      },
      {
        name: "versions",
        data_type: DataType.Array,
        element_type: DataType.VarChar,
        max_capacity: 32,
        max_length: 64,
      },
      {
        name: "abstract",
        data_type: DataType.VarChar,
        max_length: 8192,
      },
      {
        name: "vector",
        data_type: DataType.FloatVector,
        dim: MODEL_DIMENSION,
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
        field_name: "categories",
        index_type: "AUTOINDEX",
      },
    ];
  }
}
