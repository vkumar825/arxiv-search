import { MilvusClient } from "@zilliz/milvus2-sdk-node";

process.loadEnvFile();

let clientPromise = null;

export const getMilvusClient = async () => {
  if (clientPromise) {
    return clientPromise;
  }

  clientPromise = (async () => {
    try {
      const client = new MilvusClient({
        address: process.env.MILVUS_ADDRESS,
        token: process.env.MILVUS_TOKEN,
      });

      const checkHealth = await client.checkHealth();

      if (!checkHealth.isHealthy) {
        throw new Error(
          `Milvus is unhealthy or unavailable: ${checkHealth.reasons}`,
        );
      }

      return client;
    } catch (error) {
      console.error("Milvus Initialization Error:", error);
      clientPromise = null;
      throw error;
    }
  })();

  return clientPromise;
};

export const runMilvusClient =
  (command) =>
  async (...args) => {
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
