import { describe, it, expect, vi, beforeEach, test } from "vitest";
import { handleSearchRequest } from "./search-controller.js";
import { getSearchResults } from "../service/search-service.js";
import { NextFunction, Request, Response } from "express";

vi.mock("../service/search-service.js", () => ({
  getSearchResults: vi.fn(),
}));

describe("Search Controller tests", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      baseUrl: "/api/v1",
      query: { term: "test", filter: "" },
      log: {
        info: vi.fn(),
        error: vi.fn(),
      } as any,
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    next = vi.fn();

    vi.mocked(getSearchResults).mockResolvedValue({
      results: [{ id: "1", title: "Paper 1" }],
    } as any);
  });

  it("should return 400 error if both term and filters are missing", async () => {
    req.query!.term = "";
    await handleSearchRequest(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Search term or filter is required",
    });
  });

  it("should return 400 error if term is only whitespace and filters are missing", async () => {
    req.query!.term = "   ";
    await handleSearchRequest(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Search term or filter is required",
    });
  });

  it("should return 200 OK if term is empty but a filter is provided", async () => {
    req.query = {
      term: "",
      author: "Somnath Choudhury",
    };
    await handleSearchRequest(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(getSearchResults).toHaveBeenCalledWith(
      "",
      50,
      "",
      [],
      ["Somnath Choudhury"],
      [],
    );
  });

  it("should return 200 OK for a valid request query", async () => {
    await handleSearchRequest(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      results: [{ id: "1", title: "Paper 1" }],
    });
  });

  it("should return empty array if no results are found", async () => {
    vi.mocked(getSearchResults).mockResolvedValueOnce({
      results: [],
    } as any);

    await handleSearchRequest(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ results: [] });
  });

  test("verify filter parameters are parsed and passed to search service", async () => {
    req.query = {
      term: "quantum",
      arxivId: "0704.0001",
      category: ["quant-ph", "cs.AI"] as any,
      author: "Alice",
      createdDate: ["2023-01-01", "2023-12-31"] as any,
    };
    await handleSearchRequest(req as Request, res as Response, next);

    expect(getSearchResults).toHaveBeenCalledWith(
      "quantum",
      50,
      "0704.0001",
      ["quant-ph", "cs.AI"],
      ["Alice"],
      ["2023-01-01", "2023-12-31"],
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should forward error to next if search service throws", async () => {
    const error = new Error("Milvus search failure");
    vi.mocked(getSearchResults).mockRejectedValueOnce(error);

    await handleSearchRequest(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
