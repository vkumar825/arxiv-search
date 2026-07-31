import { SandboxSchema, BaseSchema } from "./milvus-schema.js";

export interface SchemaConstructor {
  new (data: any): BaseSchema;
  readonly filterExpression?: string;
  readonly schema: any[];
  readonly indexParams: any[];
}

const schemaRegistry: Record<string, SchemaConstructor> = {
  sandbox: SandboxSchema,
};

export const retreiveSchemaInfo = (schemaType: string): SchemaConstructor => {
  const schema = schemaRegistry[schemaType];

  if (!schema) {
    throw new Error(`Schema ${schemaType} not found in the registry.`);
  }

  return schema;
};
