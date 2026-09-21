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
    const term = req.query.term as string;
    const limit = parseInt(req.query.limit as string) || 10;
    const arxivId = (req.query.arxivId as string) || "";
    const categories = parseFilterArray(req.query.category as any);
    const authors = parseFilterArray(req.query.author as any);
    const createdDates = parseFilterArray(req.query.createdDate as any);

    req.log.info(
      { term, limit, arxivId, categories, authors, createdDates },
      "Incoming search request",
    );

    if (!term || term === "") {
      return res.status(400).json({ error: "Search term is required" });
    }

    const searchResults = await getSearchResults(
      term,
      limit,
      arxivId,
      categories,
      authors,
      createdDates,
    );

    // exclude vector field from the results (because it makes it messy to read)
    const sanitizedResults = searchResults.results.map((item) => {
      const { vector, ...rest } = item;
      return rest;
    });
    return res.status(200).json({ results: sanitizedResults });
  } catch (error) {
    next(error);
  }
};
