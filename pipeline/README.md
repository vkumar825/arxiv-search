# arXiv Data Cleaning Pipeline

This pipeline processes and cleans the raw Cornell arXiv dataset (`arxiv-metadata-oai-snapshot.json`) into a normalized, structured JSONL format (`arxiv-metadata-cleaned.jsonl`) ready for vector embedding and ingestion into Milvus.

## Features

- **LaTeX to Text Conversion**: Converts LaTeX symbols, and notations in titles and abstracts into clean, readable text using `pylatexenc`.
- **HTML Tag Removal**: Strips lingering HTML elements.
- **Date Normalization**: Parses version timestamps into standardized ISO 8601 UTC dates (`created_date` and `updated_date`).
- **Author & Category Parsing**: Parses author strings into structured lists and splits category codes.
- **Fast I/O & Progress**: Leverages `orjson` for fast serialization/deserialization and displays progress with `tqdm`.
- **Flexible Sampling**: Supports `--limit` and `--step` flags for quick development testing and uniform dataset sampling.

---

## Prerequisites

- **Python**: `>= 3.13`
- **uv** (recommended): [Install uv](https://docs.astral.sh/uv/) (or use standard Python `venv` + `pip`)
- **Environment Configuration**: Ensure your `.env` file exists at the root of the project with the dataset paths set:
  ```dotenv
  RAW_DATASET_PATH=data/arxiv-metadata-oai-snapshot.json
  CLEANED_DATASET_PATH=data/arxiv-metadata-cleaned.jsonl
  ```

---

## Setup

Change directory to the `pipeline` directory and install the dependencies:

### Using `uv` (Recommended)

```bash
cd pipeline
uv sync
```

### Using standard `venv` & `pip`

```bash
cd pipeline
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## Usage

Run `clean.py` from within the `pipeline` directory.

### 1. Full Dataset Run
Processes every record from the raw snapshot:

```bash
uv run clean.py
```

### 2. Limit Records (Development / Quick Testing)
Limits processing to the first $N$ records:

```bash
uv run clean.py --limit 1000
```

### 3. Uniform Sampling with `--step`
Processes every $N^{\text{th}}$ record across the full dataset:

```bash
uv run clean.py --step 20
```

### 4. Combined Sampling & Limit
Process up to 5,000 records, taking every 10th record:

```bash
uv run clean.py --step 10 --limit 5000
```

---

## CLI Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--limit` | `int` | `None` (all) | Maximum number of records to write to the output file. |
| `--step` | `int` | `1` | Interval stride (process every $N^{\text{th}}$ record). |
| `-h, --help`| | | Display help and usage information. |

---

## Running Tests

Unit tests are written using `pytest` and test all cleaning functions (LaTeX conversion, HTML stripping, author parsing, date formatting, etc.):

```bash
uv run pytest
```

---

## Logs

Any record-level errors or LaTeX conversion warnings are logged to:
```
pipeline/logs/clean_errors.log
```
