import os
from pathlib import Path
import shutil
import kagglehub
from dotenv import load_dotenv

load_dotenv()

KAGGLE_USERNAME = os.environ["KAGGLE_USERNAME"]
KAGGLE_KEY = os.environ["KAGGLE_KEY"]
KAGGLE_DATASET = os.environ["KAGGLE_DATASET"]
RAW_DATASET_PATH = os.environ["RAW_DATASET_PATH"]


def fetch_dataset(output_path: Path) -> bool:

    if output_path.is_file():
        print(f"Dataset already exists at {output_path}. Skipping download.")
        return True

    try:
        print("Downloading raw arXiv dataset from Kaggle...")
        kagglehub.dataset_download(
            KAGGLE_DATASET,
            output_dir=str(output_path.parent),
            force_download=True,
        )

        if output_path.is_file():
            print("Successfully downloaded dataset!")
            return True

        return False

    except Exception as e:
        print(f"Failed to download dataset from Kaggle: {e}")
        return False


if __name__ == "__main__":
    raw_dataset_path = Path(__file__).resolve().parent.parent / RAW_DATASET_PATH
    fetch_dataset(output_path=raw_dataset_path)
