import argparse
import logging
import os
import re
import orjson
from dotenv import load_dotenv
from pathlib import Path
from pylatexenc.latex2text import LatexNodes2Text
from tqdm import tqdm

load_dotenv()
RAW_DATASET_PATH = os.environ["RAW_DATASET_PATH"]
CLEANED_DATASET_PATH = os.environ["CLEANED_DATASET_PATH"]
LOGS_DIR = Path(__file__).resolve().parent / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)
ERROR_LOG_PATH = LOGS_DIR / "clean_errors.log"

logging.basicConfig(
    filename=ERROR_LOG_PATH,
    level=logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

MULTIPLE_WHITESPACES_REGEX = re.compile(" +")
NEWLINE_BETWEEN_CHARS_REGEX = re.compile(r"(?<=\w)\n(?=\w)")
HTML_REGEX = re.compile(
    r"</?(?:p|br|div|span|h[1-6]|ul|ol|li|strong|em|img)\b[^>]*>|<a\b[^>]*\bhref\b[^>]*>|</a>"
)
AUTHORS_SPLIT_REGEX = re.compile(r",\s*(?:and\s+)?|\s+and\s+")
LATEX_CONVERTER = LatexNodes2Text()


def remove_html_tags(text: str):

    removed_html = HTML_REGEX.sub("", text)

    return removed_html.strip()


def normalize_whitespace(text: str):

    normalized_text = text.strip()
    normalized_text = NEWLINE_BETWEEN_CHARS_REGEX.sub(" ", normalized_text)
    normalized_text = MULTIPLE_WHITESPACES_REGEX.sub(" ", normalized_text)

    return normalized_text


def parse_doi(doi: str):

    if doi is None:
        return

    # remove newlines between chars & whitespaces if present
    normalized_doi = normalize_whitespace(doi)

    normalized_doi = normalized_doi.replace("\n", "")
    normalized_doi = normalized_doi.split(" ")

    return normalized_doi


def parse_authors(authors: str):
    authors_list = AUTHORS_SPLIT_REGEX.split(authors)

    for index, author in enumerate(authors_list):
        authors_list[index] = LATEX_CONVERTER.latex_to_text(author).strip()

    return authors_list


def convert_latex_to_text(latex_text: str):

    try:
        converted_text = LATEX_CONVERTER.latex_to_text(latex_text.strip())
    except Exception:
        converted_text = latex_text.strip()

    # replace underscores with a space if followed by a letter/number
    converted_text = re.sub(r"_(?:\{)?(?=[a-zA-Z0-9]{2,})", " ", converted_text)

    # remove any remaining underscores & curly braces if present
    converted_text = re.sub(r"[_{}]", "", converted_text)

    # replace newline with space if it's between alphanumeric characters
    converted_text = NEWLINE_BETWEEN_CHARS_REGEX.sub(" ", converted_text)

    converted_text = converted_text.replace("\n", "")
    converted_text = MULTIPLE_WHITESPACES_REGEX.sub(" ", converted_text)

    return converted_text.strip()


def clean_text(text: str | None) -> str | None:

    if not text:
        return None

    cleaned = convert_latex_to_text(latex_text=text)

    return remove_html_tags(text=cleaned)


def clean_record(record: dict[str, object]) -> dict[str, object]:

    title = record.get("title")
    abstract = record.get("abstract")
    authors = record.get("authors")

    authors_clean = None
    title_clean = None
    doi_clean = None
    categories_clean = None
    abstract_clean = None

    try:
        if authors:
            authors_clean = parse_authors(authors)
        if title:
            title_clean = clean_text(title)
        if record.get("doi"):
            doi_clean = parse_doi(record["doi"])
        if record.get("categories"):
            categories_clean = record["categories"].split()
        if abstract:
            abstract_clean = clean_text(abstract)
    except Exception as e:
        logging.warning("Failed cleaning record %s: %s", record.get("id"), e)

    return {
        "id": record.get("id"),
        "authors": authors,
        "authors_clean": authors_clean,
        "title": title,
        "title_clean": title_clean,
        "journal-ref": record.get("journal-ref"),
        "doi": doi_clean,
        "report-no": record.get("report-no"),
        "categories": categories_clean,
        "abstract": abstract,
        "abstract_clean": abstract_clean,
    }


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
        if limit is not None:
            total_lines = limit
        else:
            total_lines = sum(1 for _ in file)
            file.seek(0)

        for line in tqdm(
            file,
            total=total_lines,
            desc="Cleaning arXiv dataset",
            unit="records",
            colour="green",
            dynamic_ncols=True,
        ):
            if limit is not None and limit_count >= limit:
                break

            line = line.strip()

            if not line:
                continue

            try:
                record = orjson.loads(line)
                cleaned_record = clean_record(record=record)
                outfile.write(orjson.dumps(cleaned_record) + b"\n")
                limit_count += 1
            except Exception as e:
                logging.error("Failed processing record line: %s", e)
                continue


if __name__ == "__main__":
    main()
