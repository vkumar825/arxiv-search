# arxiv-search

`arxiv-search` is a sandbox environment to test out the basic functionalities of Milvus vector database using the NodeJS SDK (now fully migrated to TypeScript!).

## Getting Started

Follow these steps to get the project up and running on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (and npm) installed.
- [Docker](https://www.docker.com/) and Docker Compose installed.

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd arxiv-search
   ```

2. **Environment Variables:**
   Create a `.env` file in the root directory based on the provided example.
   ```bash
   cp .env.example .env
   ```

3. **Start the Milvus Database:**
   Use the provided shell script (which runs `docker-compose.yml`) to start Milvus.
   ```bash
   ./run-docker.sh start
   ```
   *(You can also use `./run-docker.sh stop` to stop it, or `./run-docker.sh delete` to delete data).*

4. **Install Node dependencies:**
   Navigate to the `server` directory and install the required packages:
   ```bash
   cd server
   npm install
   ```

5. **Viewing Data:**
   To explore the data ingested into Milvus, you can use the built-in Milvus WebUI (accessible at `http://localhost:9091/webui/`). However, using **Attu** is highly recommended for a better experience. You can download the Attu desktop client from their [releases page](https://github.com/zilliztech/attu/releases).


## Usage

Once your Milvus database is running and dependencies are installed, you can use the built-in CLI utility to interact with the database, or use the Express API to perform searches. Ensure you run these commands from the **root directory** of the repository (where your `.env` file is located).

### CLI Commands (milvus-utils.ts)

**View Help:**
To view the help menu with all available commands and options:
```bash
npx tsx ./server/src/scripts/milvus-utils.ts --help
```

**List Resources:**
List all current collections and their associated aliases:
```bash
npx tsx ./server/src/scripts/milvus-utils.ts list
```

**Create Resources:**
Create a new collection or map an alias to a collection:
```bash
# Create a collection
npx tsx ./server/src/scripts/milvus-utils.ts create collection <collectionName>

# Create an alias
npx tsx ./server/src/scripts/milvus-utils.ts create alias <aliasName> <collectionName>
```

**Ingest Data:**
Load objects into a specified Milvus collection:
```bash
npx tsx ./server/src/scripts/milvus-utils.ts ingest <collectionName>
```
*Optional Flags:*
- `-b, --batch-size <number>`: Number of objects to ingest per batch (default: 1000).
- `-e, --embed-batch-size <number>`: Number of objects to process per embedding call (default: 128).

**Drop Resources:**
Remove a collection or an alias from the database:
```bash
# Drop a collection
npx tsx ./server/src/scripts/milvus-utils.ts drop collection <collectionName>

# Drop an alias
npx tsx ./server/src/scripts/milvus-utils.ts drop alias <aliasName>
```

### Using the Search API (Express.js)

**Start the API server:**
Run the `index.ts` entry point to start the Express.js server
```bash
npx tsx ./server/src/index.ts
```
**Make a Search Request:**
By default, the server runs on port 3000 (unless configured otherwise in `.env`). You can use `curl` or your browser to make a GET request to the `/api/v1/search` endpoint:
```bash
curl "http://localhost:3000/api/v1/search?term=machine+learning&limit=5"
```
**Parameters:**
- `term`: (Required) The string query to search for.
- `limit`: (Optional) The maximum number of results to return (default: 10).
- `filter`: (Optional) A categorical filter expression.


## Acknowledgements

Portions of this project were developed in conjunction with Google Gemini (3.1 Pro & Antigravity CLI) for code assistance and debugging. All code, logic, and design were reviewed and supervised by me.