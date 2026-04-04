import { fileURLToPath } from "url";
import { MilvusClient, DataType } from "@zilliz/milvus2-sdk-node";
process.loadEnvFile();

const address = process.env.MILVUS_ADDRESS;
const token = process.env.MILVUS_TOKEN;
const client = new MilvusClient({ address, token });

export const getMilvusCollections = async () => {
  try {
    const res = await client.listCollections();
    const milvusCollectionsList = res.data.map(
      (milvusCollection) => milvusCollection.name,
    );
    return milvusCollectionsList;
  } catch (error) {
    console.error("Failed to retrieve Milvus collections:", error);
  }
};

export const createMilvusCollection = async (name) => {
  const collections = await getMilvusCollections();

  if (collections.includes(name)) {
    console.log(`Milvus collection ${name} already created`);
    return;
  }

  const fields = [
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
      name: "title",
      data_type: DataType.VarChar,
      max_length: 512,
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
  ];

  try {
    await client.createCollection({
      collection_name: name,
      fields: fields,
      index_params: index_params,
    });
    console.log(`Successfully created Milvus collection ${name}`);
  } catch (error) {
    console.error("Failed to create Milvus collection:", error);
  }
};

export const dropMilvusCollection = async (name) => {
  const collections = await getMilvusCollections();

  if (!collections.includes(name)) {
    console.log(`Cannot drop non-existent Milvus collection ${name}`);
    return;
  } else {
    try {
      await client.dropCollection({
        collection_name: name,
      });
      console.log(`Successfully dropped Milvus collection ${name}`);
    } catch (error) {
      console.error("Failed to drop Milvus collection: ", error);
    }
  }
};

const isMain = process.argv[1] == fileURLToPath(import.meta.url);

if (isMain) {
  const [, , command, value] = process.argv;

  // node server/milvus_utils.js create-collection test_collection
  if (command == "create-collection") {
    createMilvusCollection(value);
  }

  // node server/milvus_utils.js drop-collection test_collection
  if (command == "drop-collection") {
    dropMilvusCollection(value);
  }

  // node server/milvus_utils.js get-collections
  if (command == "get-collections") {
    getMilvusCollections();
  }
}
