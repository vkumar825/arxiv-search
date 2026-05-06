import { SandboxSchema, SandboxIndexParams } from "./sandbox-schema.js";

export const retreiveSchemaInfo = (schemaType) => {
  switch (schemaType) {
    case "sandbox":
      return [SandboxSchema[0], SandboxIndexParams[0]];
  }
};
