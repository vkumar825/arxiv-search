import { Request, Response } from "express";
import { getSearchResults } from "../service/search-service.js";

export const handleSearchRequest = async (req: Request, res: Response) => {
  try {
    const term = req.query.term as string;
    const limit = parseInt(req.query.limit as string) || 10;
    const filter = (req.query.filter as string) || "";

    req.log.info({ term, limit, filter }, "Incoming search request");

    if (!term || term === "") {
      return res.status(400).json({ error: "Search term is required" });
    }

    const searchResults = await getSearchResults(term, limit, filter);

    if (req.baseUrl === "/api/v1") {
      // exclude vector field from the results (because it makes it messy to read)
      const sanitizedResults = searchResults.results.map((item) => {
        const { vector, ...rest } = item;
        return rest;
      });
      return res.status(200).json({ results: sanitizedResults });
    }
  } catch (error: any) {
    req.log.error({ err: error.message }, "Search request failed");
    res.status(500).json({ error: error.message });
  }
};
