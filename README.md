# arxiv-search

`arxiv-search` is a search engine application powered by the Milvus vector database, Node, Express, and React to allow users to find arXiv papers efficiently via hybrid search (semantic + keyword).  

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

   _(You can also use `./run-docker.sh stop` to stop it, or `./run-docker.sh delete` to delete data)._

4. **Install Node dependencies:**
   Navigate to the `server` directory and install the required packages:

   ```bash
   cd server
   npm install
   ```

5. **Dataset Cleaning:**
   Before data can be ingested into Milvus, the raw snapshot must be cleaned into the required JSONL format. For the full guide on running the cleaning script, refer to [`pipeline/README.md`](pipeline/README.md).

6. **Viewing Data:**
   To explore the data ingested into Milvus, you can use the built-in Milvus WebUI (accessible at `http://localhost:9091/webui/`).

   However, using **Attu** is highly recommended for better UI/UX experience. You can download the Attu desktop client from its [releases page](https://github.com/zilliztech/attu/releases).

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

_Optional Flags:_

- `-b, --batch-size <number>`: Number of objects to ingest per batch (default: 1000).
- `-e, --embed-batch-size <number>`: Number of objects to process per embedding call (default: 128).
- `-l, --limit <number>`: Maximum number of objects to ingest (useful for testing/development).

**Drop Resources:**
Remove a collection or an alias from the database:

```bash
# Drop a collection
npx tsx ./server/src/scripts/milvus-utils.ts drop collection <collectionName>

# Drop an alias
npx tsx ./server/src/scripts/milvus-utils.ts drop alias <aliasName>
```

### Running Vitest Tests

This project uses [Vitest](https://vitest.dev/) for unit testing. To run the test suite, ensure your Node dependencies are installed, then run the following from the root directory:

```bash
npx vitest run
```

To run tests in watch mode (ideal during development):

```bash
npx vitest
```

To run a specific test file, pass the path directly:

```bash
npx vitest run server/src/models/milvus-schema.test.ts
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

Portions of this project were developed in conjunction with Google Gemini (via Antigravity CLI) for code assistance and debugging. All code, logic, and design were reviewed and supervised by me.
