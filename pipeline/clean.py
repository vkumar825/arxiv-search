import argparse
import os
import re
import orjson
from dotenv import load_dotenv
from pathlib import Path
from pylatexenc.latex2text import LatexNodes2Text

load_dotenv()
RAW_DATASET_PATH = os.environ["RAW_DATASET_PATH"]
CLEANED_DATASET_PATH = os.environ["CLEANED_DATASET_PATH"]

# regex pattern to substitute multiple whitespaces with single whitespace
MULTIPLE_WHITESPACES_REGEX = re.compile(" +")

LATEX_CONVERTER = LatexNodes2Text()


def parse_authors(authors: str):
    if "and" in authors and "," in authors:
        authors_list = re.split(r", | and ", authors)
    elif "and" in authors:
        authors_list = authors.split(" and ")
    else:
        authors_list = authors.split(",")

    for index, author in enumerate(authors_list):
        authors_list[index] = LATEX_CONVERTER.latex_to_text(author).strip()

    return authors_list


def convert_latex_to_text(latex_text: str):

    converted_text = LATEX_CONVERTER.latex_to_text(latex_text.strip())

    # replace underscores with a space if followed by a letter/number
    converted_text = re.sub(r"_(?:\{)?(?=[a-zA-Z0-9]{2,})", " ", converted_text)

    # remove any remaining underscores & curly braces if present
    converted_text = re.sub(r"[_{}]", "", converted_text)

    # replace newline with space if it's between alphanumeric characters
    converted_text = re.sub(r"(?<=\w)\n(?=\w)", " ", converted_text)

    converted_text = converted_text.replace("\n", "")
    converted_text = MULTIPLE_WHITESPACES_REGEX.sub(" ", converted_text)

    return converted_text.strip()


def clean_record(record: dict[str, object]) -> dict[str, object]:

    # Original fields to preserve
    title = record["title"]
    abstract = record["abstract"]

    # authors_clean
    authors_clean = parse_authors(record["authors"])

    # title_clean
    record["title"] = MULTIPLE_WHITESPACES_REGEX.sub(" ", record["title"])
    record["title"] = convert_latex_to_text(latex_text=record["title"])
    title_clean = record["title"]

    # categories_clean
    categories_clean = record["categories"].split(" ")

    # abstract_clean
    record["abstract"] = convert_latex_to_text(latex_text=record["abstract"])
    abstract_clean = record["abstract"]

    cleaned_record = {
        "id": record["id"],
        "authors": record["authors"],
        "authors_clean": authors_clean,
        "title": title,
        "title_clean": title_clean,
        "journal-ref": record.get("journal-ref"),
        "doi": record.get("doi"),
        "report-no": record.get("report-no"),
        "categories": categories_clean,
        "abstract": abstract,
        "abstract_clean": abstract_clean,
    }

    return cleaned_record


def main():

    parser = argparse.ArgumentParser("Process and clean the raw arXiv dataset")

    parser.add_argument(
        "--limit", type=int, help="Limit the number of JSONL lines to process"
    )

    args = parser.parse_args()

    limit = args.limit or None
    limit_count = 0
    raw_dataset_path = Path(__file__).resolve().parent.parent / RAW_DATASET_PATH
    cleaned_dataset_path = Path(__file__).resolve().parent.parent / CLEANED_DATASET_PATH

    with (
        open(raw_dataset_path, "rb") as file,
        open(cleaned_dataset_path, "wb", buffering=64 * 1024) as outfile,
    ):
        for line in file:
            if limit is not None and limit_count >= limit:
                break

            line = line.strip()

            if not line:
                continue

            record = orjson.loads(line)
            cleaned_record = clean_record(record=record)
            outfile.write(orjson.dumps(cleaned_record) + b"\n")
            limit_count += 1


if __name__ == "__main__":
    main()
