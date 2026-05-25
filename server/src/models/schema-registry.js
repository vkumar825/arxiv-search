import { SandboxSchema } from "./milvus-schema.js";

const schemaRegistry = {
  sandbox: SandboxSchema,
};

export const retreiveSchemaInfo = (schemaType) => {
  const schema = schemaRegistry[schemaType];

  if (!schema) {
    throw new Error(`Schema ${schemaType} not found in the registry.`);
  }

  return schema;
};
