# arxiv-search

**arXiv Search** is a search engine application powered by the Milvus vector database, Node, Express, and React to allow users to find arXiv papers efficiently via hybrid search (semantic + keyword).

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
   Install dependencies for both the backend server and client:

   ```bash
   # Server dependencies
   cd server && npm install && cd ..

   # Client dependencies
   cd client && npm install && cd ..
   ```

5. **Dataset Cleaning:**
   Before data can be ingested into Milvus, the raw snapshot must be cleaned into the required JSONL format. For the full guide on running the cleaning script, refer to [`pipeline/README.md`](pipeline/README.md).

6. **Viewing Data:**
   To explore the data ingested into Milvus, you can use the built-in Milvus WebUI (accessible at `http://localhost:9091/webui/`).

   However, using **Attu** is highly recommended for a better UI/UX experience. You can download the Attu desktop client from its [releases page](https://github.com/zilliztech/attu/releases).

## Basic Workflow

To reproduce this project and ingest ~100k papers from scratch:

> **Note:** Ensure Milvus is running first (`./run-docker.sh start`).

**1. Clean Dataset (Sample Every 31st Paper):**

```bash
cd pipeline
uv run clean.py --step 31
cd ..
```

**2. Setup Milvus Collection & Ingest:**

```bash
# 1. Create collection
npx tsx ./server/src/scripts/milvus-utils.ts create collection arxiv

# 2. Assign alias configured in .env
npx tsx ./server/src/scripts/milvus-utils.ts create alias arxiv_alias arxiv

# 3. Ingest cleaned records & generate embeddings
npx tsx ./server/src/scripts/milvus-utils.ts ingest arxiv
```

**3. Run the App:**

```bash
# Terminal 1: API Server (port 3000)
./run-server.sh

# Terminal 2: React Client (port 5173)
cd client && npm run dev
```

## Using the Search API (Express.js)

**Start the API server:**
Start the Express server using the provided helper script with formatted logging:

```bash
./run-server.sh
```

Alternatively, run the entry point directly:

```bash
npx tsx ./server/src/index.ts
```

By default, the server runs on port 3000 (unless configured otherwise in `.env`).

**Endpoint:**
`GET /api/v1/search`

**Parameters:**

| Parameter     | Type     | Required | Default | Description                                                     |
| :------------ | :------- | :------- | :------ | :-------------------------------------------------------------- |
| `term`        | `string` | No\*     | `""`    | Search query for hybrid semantic (BGE) + lexical (BM25) search. |
| `limit`       | `number` | No       | `50`    | Maximum number of results to return.                            |
| `author`      | `string` | No       | `""`    | Filter papers by author name (e.g. `author=Yoshua Bengio`).     |
| `category`    | `string` | No       | `""`    | Filter by category code (e.g. `category=cs.AI`).                |
| `createdDate` | `string` | No       | `""`    | Filter by date range (pass twice: start and end ISO dates).     |
| `arxivId`     | `string` | No       | `""`    | Filter by specific arXiv paper ID (e.g. `arxivId=2202.08371`).  |

_\*Note: Either `term` or at least one filter (`author`, `category`, `createdDate`, `arxivId`) must be supplied._

**Example Requests:**

_(Tip: Pipe curl output into [`jq`](https://jqlang.github.io/jq/) like `curl -s "..." | jq .` to pretty-print the JSON response in your terminal)._

1. **Hybrid Search (Semantic + Keyword):**

   ```bash
   curl -s "http://localhost:3000/api/v1/search?term=attention%20is%20all%20you%20need&limit=5"
   ```

2. **arXiv ID Lookup:**

   ```bash
   curl -s "http://localhost:3000/api/v1/search?arxivId=2202.08371"
   ```

3. **Author Filter:**

   ```bash
   curl -s "http://localhost:3000/api/v1/search?author=Yoshua%20Bengio&limit=10"
   ```

4. **Hybrid Search with Category Filter:**

   ```bash
   curl -s "http://localhost:3000/api/v1/search?term=diffusion%20models&category=cs.CV&limit=10"
   ```

5. **Date Range Filter:**
   ```bash
   curl -s "http://localhost:3000/api/v1/search?category=stat.ML&createdDate=2023-01-01&createdDate=2023-12-31"
   ```

## Running the Web Client (React)

The repository includes a minimalist React frontend in the `client/` directory.

1. Create a `client/.env` file from the example:
   ```bash
   cp client/.env.example client/.env
   ```
2. Start the Vite development server:
   ```bash
   cd client
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.

## Running Tests

Run the backend unit test suite using Vitest from the `server` directory:

```bash
cd server
npm test
```

## Acknowledgements

Portions of this project were developed in conjunction with Google Gemini (via Antigravity CLI) for code assistance and debugging. All code, logic, and design were reviewed and supervised by me.
