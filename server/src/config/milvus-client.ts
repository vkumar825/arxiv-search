import { MilvusClient } from "@zilliz/milvus2-sdk-node";
import { server as serverLogger } from "../utils/logger.js";

process.loadEnvFile();

let clientPromise: Promise<MilvusClient> | null = null;

export const getMilvusClient = async () => {
  if (clientPromise) {
    return clientPromise;
  }

  clientPromise = (async () => {
    try {
      const client = new MilvusClient({
        address: process.env.MILVUS_ADDRESS as string,
        token: process.env.MILVUS_TOKEN,
      });

      const checkHealth = await client.checkHealth();

      if (!checkHealth.isHealthy) {
        throw new Error(
          `Milvus is unhealthy or unavailable: ${checkHealth.reasons}`,
        );
      }

      return client;
    } catch (error: any) {
      serverLogger.error({ err: error.message }, "Milvus Initialization Error");
      clientPromise = null;
      throw error;
    }
  })();

  return clientPromise;
};

export const runMilvusClient =
  (command: (client: MilvusClient, ...args: any[]) => Promise<void>) =>
  async (...args: any[]) => {
    const client = await getMilvusClient();

    try {
      await command(client, ...args);
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    } finally {
      await closeMilvusClient();
    }
  };

export const closeMilvusClient = async () => {
  if (clientPromise) {
    const client = await clientPromise;
    await client.closeConnection();
    clientPromise = null;
  }
};
