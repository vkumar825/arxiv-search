import { describe, it, expect } from "vitest";
import { buildFilterExpression } from "./filter-builder.js";

describe("Filter Builder utility tests", () => {
  it("should return an empty string when no filters are provided", () => {
    const result = buildFilterExpression({});
    expect(result).toBe("");
  });

  it("should build expression for a single category", () => {
    const result = buildFilterExpression({ categories: ["cs.AI"] });
    expect(result).toBe('ARRAY_CONTAINS_ANY(categories, ["cs.AI"])');
  });

  it("should build expression for multiple categories", () => {
    const result = buildFilterExpression({
      categories: ["cs.AI", "cs.LG"],
    });
    expect(result).toBe('ARRAY_CONTAINS_ANY(categories, ["cs.AI","cs.LG"])');
  });

  it("should build expression for a single author", () => {
    const result = buildFilterExpression({
      authors: ["Geoffrey Hinton"],
    });
    expect(result).toBe('ARRAY_CONTAINS_ANY(authors, ["Geoffrey Hinton"])');
  });

  it("should build expression for multiple authors", () => {
    const result = buildFilterExpression({
      authors: ["Geoffrey Hinton", "Yann LeCun"],
    });
    expect(result).toBe(
      'ARRAY_CONTAINS_ANY(authors, ["Geoffrey Hinton","Yann LeCun"])',
    );
  });

  it("should format createdDate range with ISO 8601 UTC bounds", () => {
    const result = buildFilterExpression({
      createdDates: ["2023-01-01", "2023-12-31"],
    });
    expect(result).toBe(
      'createdDate >= ISO "2023-01-01T00:00:00Z" and createdDate <= ISO "2023-12-31T23:59:59Z"',
    );
  });

  it("should ignore date arrays if not exactly 2 elements (start and end)", () => {
    const result = buildFilterExpression({
      createdDates: ["2023-01-01"],
    });
    expect(result).toBe("");
  });

  it("should build exact match expression for arxivId", () => {
    const result = buildFilterExpression({ arxivId: "0704.0001" });
    expect(result).toBe('arxivId == "0704.0001"');
  });

  it("should combine multiple different filters with 'and'", () => {
    const result = buildFilterExpression({
      arxivId: "0704.0001",
      categories: ["cs.AI"],
      authors: ["Geoffrey Hinton"],
      createdDates: ["2023-01-01", "2023-12-31"],
    });

    const expected =
      'arxivId == "0704.0001" and ' +
      'ARRAY_CONTAINS_ANY(categories, ["cs.AI"]) and ' +
      'ARRAY_CONTAINS_ANY(authors, ["Geoffrey Hinton"]) and ' +
      'createdDate >= ISO "2023-01-01T00:00:00Z" and createdDate <= ISO "2023-12-31T23:59:59Z"';

    expect(result).toBe(expected);
  });
});
