export const buildFilterExpression = ({
  arxivId = "",
  categories = [],
  authors = [],
  createdDates = [],
}: {
  arxivId?: string;
  categories?: string[];
  authors?: string[];
  createdDates?: string[];
}): string => {
  const expressions = [];

  if (arxivId && arxivId.trim()) {
    expressions.push(`arxivId == ${JSON.stringify(arxivId.trim())}`);
  }

  if (categories?.length) {
    expressions.push(
      `ARRAY_CONTAINS_ANY(categories, ${JSON.stringify(categories)})`,
    );
  }

  if (authors?.length) {
    expressions.push(`ARRAY_CONTAINS_ANY(authors, ${JSON.stringify(authors)})`);
  }

  if (createdDates?.length == 2) {
    expressions.push(
      `createdDate >= ISO "${createdDates[0]}T00:00:00Z" and createdDate <= ISO "${createdDates[1]}T23:59:59Z"`,
    );
  }

  if (expressions.length > 0) {
    return expressions.join(" and ");
  } else {
    return "";
  }
};
