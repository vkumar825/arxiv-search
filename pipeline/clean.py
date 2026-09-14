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

MULTIPLE_WHITESPACES_REGEX = re.compile(" +")
NEWLINE_BETWEEN_CHARS_REGEX = re.compile(r"(?<=\w)\n(?=\w)")
HTML_REGEX = re.compile(
    r"</?(?:p|br|div|span|h[1-6]|ul|ol|li|strong|em|img)\b[^>]*>|<a\b[^>]*\bhref\b[^>]*>|</a>"
)

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
    converted_text = NEWLINE_BETWEEN_CHARS_REGEX.sub(" ", converted_text)

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
    record["title"] = remove_html_tags(text=record["title"])
    title_clean = record["title"]

    # doi_clean
    doi_clean = parse_doi(record.get("doi"))

    # categories_clean
    categories_clean = record["categories"].split(" ")

    # abstract_clean
    record["abstract"] = convert_latex_to_text(latex_text=record["abstract"])
    record["abstract"] = remove_html_tags(text=record["abstract"])
    abstract_clean = record["abstract"]

    cleaned_record = {
        "id": record["id"],
        "authors": record["authors"],
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
