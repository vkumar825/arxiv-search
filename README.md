# Milvus Sandbox

`milvus-sandbox` is a sandbox environment to test out the basic functionalities of Milvus vector database using the NodeJS SDK.

## Features

In this release `v0.1.0`, the currently implemented features are as follows:
- CLI utilities script using `commander.js` to interact with Milvus db
- Create/Drop/Rename Milvus collection
- Utilize Milvus alias mechanism for blue-green deployments
- Logging system through `pino`
- Ingest data into the vector db
- Basic API implemented with `Express.js`

## Getting Started

Follow these steps to get the project up and running on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (and npm) installed.
- [Docker](https://www.docker.com/) and Docker Compose installed.

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd milvus-sandbox
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

Once your Milvus database is running and dependencies are installed, you can use the built-in CLI utility to interact with the database. Ensure you run these commands from the **root directory** of the repository (where your `.env` file is located).

### CLI Commands (milvus-utils.js)

The project includes a `commander.js` script for managing Milvus resources. 

**View Help:**
To view the help menu with all available commands and options:
```bash
./server/src/scripts/milvus-utils.js --help
```

**List Resources:**
List all current collections and their associated aliases:
```bash
./server/src/scripts/milvus-utils.js list
```

**Create Resources:**
Create a new collection or map an alias to a collection:
```bash
# Create a collection
./server/src/scripts/milvus-utils.js create collection <collectionName>

# Create an alias
./server/src/scripts/milvus-utils.js create alias <aliasName> <collectionName>
```

**Ingest Data:**
Load objects into a specified Milvus collection:
```bash
./server/src/scripts/milvus-utils.js ingest <collectionName>
```
*Optional Flags:*
- `-b, --batch-size <number>`: Number of objects to ingest per batch (default: 1000).
- `-e, --embed-batch-size <number>`: Number of objects to process per embedding call (default: 128).

**Drop Resources:**
Remove a collection or an alias from the database:
```bash
# Drop a collection
./server/src/scripts/milvus-utils.js drop collection <collectionName>

# Drop an alias
./server/src/scripts/milvus-utils.js drop alias <aliasName>
```

## Acknowledgements

Portions of this project were developed in conjunction with Google Gemini (3.1 Pro & Antigravity CLI) for code assistance and debugging. All code, logic, and design were reviewed and supervised by me.