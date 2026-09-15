import { DataType, FieldType } from "@zilliz/milvus2-sdk-node";
import crypto from "node:crypto";

process.loadEnvFile();

const MODEL_DIMENSION = Number(process.env.MODEL_DIMENSION) || 384;

export class ArxivSchema {
  id: string;
  arxivId: string;
  title: string;
  journalRef: string;
  doi: string[];
  reportNo: string;
  categories: string[];
  authors: string[];
  abstract: string;
  createdDate: string;
  updatedDate: string;
  vector: number[] | null = null;

  constructor(data: any) {
    this.id = this.createId(data);
    this.arxivId = data.id;
    this.title = data.title;
    this.journalRef = data.journal_ref;
    this.doi = data.doi;
    this.reportNo = data.report_no;
    this.categories = data.categories;
    this.authors = data.authors;
    this.abstract = data.abstract;
    this.createdDate = data.created_date;
    this.updatedDate = data.updated_date;
  }

  createId(data: any): string {
    const uniqueId = [data.title, data.id].join(":");
    return crypto.createHash("sha256").update(uniqueId).digest("hex");
  }

  get text(): string {
    // prepend title to abstract for improved retrieval accuracy
    return `${this.title} ${this.abstract}`;
  }

  get object(): Record<string, any> {
    return {
      id: this.id,
      arxivId: this.arxivId,
      title: this.title,
      journalRef: this.journalRef,
      doi: this.doi,
      reportNo: this.reportNo,
      categories: this.categories,
      authors: this.authors,
      abstract: this.abstract,
      createdDate: this.createdDate,
      updatedDate: this.updatedDate,
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
        name: "authors",
        data_type: DataType.Array,
        element_type: DataType.VarChar,
        max_capacity: 2048,
        max_length: 512,
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
        data_type: DataType.Array,
        element_type: DataType.VarChar,
        max_capacity: 32,
        max_length: 128,
        nullable: true,
      },
      {
        name: "reportNo",
        data_type: DataType.VarChar,
        max_length: 512,
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
        name: "abstract",
        data_type: DataType.VarChar,
        max_length: 8192,
      },
      {
        name: "createdDate",
        data_type: DataType.Timestamptz,
      },
      {
        name: "updatedDate",
        data_type: DataType.Timestamptz,
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
        field_name: "authors",
        index_type: "AUTOINDEX",
      },
      {
        field_name: "categories",
        index_type: "AUTOINDEX",
      },
      {
        field_name: "createdDate",
        index_type: "AUTOINDEX",
      },
      {
        field_name: "updatedDate",
        index_type: "AUTOINDEX",
      },
      {
        field_name: "vector",
        index_type: "AUTOINDEX",
        metric_type: "COSINE",
      },
    ];
  }
}
