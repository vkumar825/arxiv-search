import { SandboxSchema, BaseSchema, ArxivSchema } from "./milvus-schema.js";

export interface SchemaConstructor {
  new (data: any): BaseSchema;
  readonly filterExpression?: string;
  readonly schema: any[];
  readonly indexParams: any[];
}

const schemaRegistry: Record<string, SchemaConstructor> = {
  sandbox: SandboxSchema,
  arxiv: ArxivSchema
};

export const retreiveSchemaInfo = (schemaType: string): SchemaConstructor => {
  const schema = schemaRegistry[schemaType];

  if (!schema) {
    throw new Error(`Schema ${schemaType} not found in the registry.`);
  }

  return schema;
};
