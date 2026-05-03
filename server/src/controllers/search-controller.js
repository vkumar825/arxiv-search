import { getSearchResults } from "../service/search-service.js";

export const handleSearchRequest = async (req, res) => {
  try {
    const term = req.body.term;

    const searchResults = await getSearchResults(term);
    
    res.render("search.ejs", {results: searchResults.results});

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
