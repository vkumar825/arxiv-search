import argparse
import os
import orjson
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()
DATASET_PATH = os.environ["DATASET_PATH"]


def main():

    parser = argparse.ArgumentParser("Process and clean the raw arXiv dataset")

    parser.add_argument(
        "--limit", type=int, help="Limit the number of JSONL lines to process"
    )

    args = parser.parse_args()

    limit = args.limit or None
    limit_count = 0
    raw_dataset_path = Path(__file__).resolve().parent.parent / DATASET_PATH

    with open(raw_dataset_path, "rb") as file:
        for line in file:
            if limit is not None and limit_count >= limit:
                break

            line = line.strip()

            if not line:
                continue

            data = orjson.loads(line)

            limit_count += 1


if __name__ == "__main__":
    main()
