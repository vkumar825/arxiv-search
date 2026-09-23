import { NextFunction, Request, Response } from "express";
import { getSearchResults } from "../service/search-service.js";

const parseFilterArray = (elements: any): string[] => {
  if (!elements) {
    return [];
  }

  if (Array.isArray(elements)) {
    return elements.map(String);
  }

  // if there is only one element, store it in an array
  return [String(elements)];
};

export const handleSearchRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const term = (req.query.term as string) || "";

    const arxivId = (req.query.arxivId as string) || "";
    const categories = parseFilterArray(req.query.category as any);
    const authors = parseFilterArray(req.query.author as any);
    const createdDates = parseFilterArray(req.query.createdDate as any);

    req.log.info(
      { term, arxivId, categories, authors, createdDates },
      "Incoming search request",
    );

    const hasFilter = Boolean(
      arxivId || categories.length || authors.length || createdDates.length,
    );

    if (!term.trim() && !hasFilter) {
      return res
        .status(400)
        .json({ error: "Search term or filter is required" });
    }

    const searchResults = await getSearchResults(
      term,
      arxivId,
      categories,
      authors,
      createdDates,
    );

    return res.status(200).json({ results: searchResults.results || [] });
  } catch (error) {
    next(error);
  }
};
