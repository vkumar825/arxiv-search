import { pipeline, PipelineType } from "@huggingface/transformers";

let pipelinePromise: Promise<any> | null = null;

export const getPipelineInstance = async () => {
  if (pipelinePromise) {
    return pipelinePromise;
  }

  try {
    let selectedDevice: any = process.env.USE_GPU === "true" ? "webgpu" : "cpu";
    pipelinePromise = pipeline(process.env.MODEL_TASK as PipelineType, process.env.MODEL_NAME as string, {
      device: selectedDevice,
    });
  } catch (error) {
    pipelinePromise = null;
    console.error("Failed to initialize pipeline:", error);
    throw error;
  }

  return pipelinePromise;
};
