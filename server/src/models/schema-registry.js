import { SandboxSchema } from "./milvus-schema.js";

export const retreiveSchemaInfo = (schemaType) => {
  switch (schemaType) {
    case "sandbox":
      return SandboxSchema;
  }
};
