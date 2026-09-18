import { pipeline, PipelineType } from "@huggingface/transformers";
import { server as serverLogger } from "../utils/logger.js";

let pipelinePromise: Promise<any> | null = null;

export const getPipelineInstance = async () => {
  if (pipelinePromise) {
    return pipelinePromise;
  }

  try {
    let selectedDevice: any = process.env.USE_GPU === "true" ? "webgpu" : "cpu";
    pipelinePromise = pipeline(
      process.env.MODEL_TASK as PipelineType,
      process.env.MODEL_NAME as string,
      {
        device: selectedDevice,
      },
    );
  } catch (error: any) {
    pipelinePromise = null;
    serverLogger.error({ err: error.message }, "Failed to initialize pipeline");
    throw error;
  }

  return pipelinePromise;
};
