#!/usr/bin/env node

import { pipeline } from "@huggingface/transformers";
process.loadEnvFile();

let pipelinePromise = null;

export const getPipelineInstance = async () => {
  if (pipelinePromise) {
    return pipelinePromise;
  }

  pipelinePromise = pipeline(process.env.MODEL_TASK, process.env.MODEL_NAME)
    .catch(error => {
            pipelinePromise = null; 
            console.error("Failed to initialize pipeline:", error);
            throw error;
        });

  return pipelinePromise;
};
