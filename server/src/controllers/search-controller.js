import { getSearchResults } from "../service/search-service.js";

export const handleSearchRequest = async (req, res) => {
  try {
    const term = req.query.term;
    const limit = parseInt(req.query.limit) || 10;
    const filter = req.query.filter || "";

    const searchResults = await getSearchResults(term, limit, filter);

    if (req.baseUrl === "/api/v1") {
      if (!term || term === "") {
        return res.status(400).json({ error: "Search term is required" });
      }
      // exclude vector field from the results (because it makes it messy to read)
      const sanitizedResults = searchResults.results.map((item) => {
        const { vector, ...rest } = item;
        return rest;
      });
      return res.json({ results: sanitizedResults });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
