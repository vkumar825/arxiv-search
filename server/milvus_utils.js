import { fileURLToPath } from "url";
import { MilvusClient, DataType } from "@zilliz/milvus2-sdk-node";
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
        throw new Error("Milvus is unhealthy or unavailable");
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

export const getMilvusCollections = async () => {
  try {
    const client = await getMilvusClient();
    const res = await client.listCollections();
    return res.data.map((milvusCollection) => ({
      collection_name: milvusCollection.name,
    }));
  } catch (error) {
    console.error("Failed to retrieve Milvus collection(s):", error);
    throw error;
  }
};

export const createMilvusCollection = async (name) => {
  const collections = await getMilvusCollections();

  if (collections.some((c) => c.collection_name === name)) {
    console.log(`Milvus collection ${name} already created`);
    return;
  }

  // schema designed for this dataset (https://www.kaggle.com/datasets/setseries/news-category-dataset)
  const schema = [
    {
      name: "id",
      data_type: DataType.Int64,
      is_primary_key: true,
      auto_id: false,
    },
    {
      name: "vector",
      data_type: DataType.FloatVector,
      dim: 384, // Using Xenova/all-MiniLM-L6-v2 model
    },
    {
      name: "headline",
      data_type: DataType.VarChar,
      max_length: 512,
    },
    {
      name: "category",
      data_type: DataType.VarChar,
      max_length: 64,
      is_partition_key: true,
    },
  ];

  const index_params = [
    {
      field_name: "id",
      index_type: "AUTOINDEX",
    },
    {
      field_name: "vector",
      index_type: "AUTOINDEX",
      metric_type: "COSINE",
    },
    {
      field_name: "category",
      index_type: "AUTOINDEX",
    },
  ];

  try {
    const client = await getMilvusClient();
    await client.createCollection({
      collection_name: name,
      schema: schema,
      index_params: index_params,
    });
    console.log(`Successfully created Milvus collection: ${name}`);
  } catch (error) {
    console.error("Failed to create Milvus collection:", error);
    throw error;
  }
};

export const dropMilvusCollection = async (name) => {
  const collections = await getMilvusCollections();

  if (!collections.some((c) => c.collection_name === name)) {
    console.log(`Cannot drop non-existent Milvus collection: ${name}`);
    return;
  }

  try {
    const client = await getMilvusClient();
    await client.dropCollection({
      collection_name: name,
    });
    console.log(`Successfully dropped Milvus collection: ${name}`);
  } catch (error) {
    console.error("Failed to drop Milvus collection: ", error);
    throw error;
  }
};

const isMain = process.argv[1] == fileURLToPath(import.meta.url);

if (isMain) {
  const [, , command, value] = process.argv;

  (async () => {
    try {
      switch (command) {
        case "create-collection":
          if (!value) throw new Error("Collection name required");
          await createMilvusCollection(value);
          break;
        case "drop-collection":
          if (!value) throw new Error("Collection name required");
          await dropMilvusCollection(value);
          break;
        case "get-collections":
          const collections = await getMilvusCollections();
          console.table(collections);
          break;
        default:
          console.log("Invalid command, please try again");
      }
    } catch (error) {
      console.error("CLI Error:", error);
    } finally {
      const client = await getMilvusClient().catch(() => null);
      if (client) await client.closeConnection();
    }
  })();
}
