import { pipeline } from "@huggingface/transformers";

let pipelinePromise = null;

export const getPipelineInstance = async () => {
  if (pipelinePromise) {
    return pipelinePromise;
  }

  try {
    let selectedDevice = process.env.USE_GPU === "true" ? "webgpu" : "cpu";
    pipelinePromise = pipeline(process.env.MODEL_TASK, process.env.MODEL_NAME, {
      device: selectedDevice,
    });
  } catch (error) {
    pipelinePromise = null;
    console.error("Failed to initialize pipeline:", error);
    throw error;
  }

  return pipelinePromise;
};
