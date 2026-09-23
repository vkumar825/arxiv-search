import { DataType, FieldType, FunctionType } from "@zilliz/milvus2-sdk-node";
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
  denseVector: number[] | null = null;

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
      denseVector: this.denseVector,
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
        enable_analyzer: true
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
        name: "denseVector",
        data_type: DataType.FloatVector,
        dim: MODEL_DIMENSION,
      },
      {
        name: "sparseVector",
        data_type: DataType.SparseFloatVector,
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
        field_name: "arxivId",
        index_type: "AUTOINDEX",
      },
      {
        field_name: "denseVector",
        index_type: "AUTOINDEX",
        metric_type: "COSINE",
      },
      {
        field_name: "sparseVector",
        index_type: "SPARSE_INVERTED_INDEX",
        metric_type: "BM25",
        params: {
          inverted_index_algo: "DAAT_MAXSCORE",
        },
      },
    ];
  }

  static get functions(): any[] {
    return [
      {
        name: "text_bm25_emb",
        description: "text bm25 function",
        type: FunctionType.BM25,
        input_field_names: ["abstract"],
        output_field_names: ["sparseVector"],
        params: {},
      },
    ];
  }
}
