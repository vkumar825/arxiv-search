import { describe, it, expect, vi, beforeEach, test } from "vitest";
import { handleSearchRequest } from "./search-controller.js";
import { getSearchResults } from "../service/search-service.js";
import { Request, Response } from "express";

vi.mock("../service/search-service.js", () => ({
  getSearchResults: vi.fn(),
}));

describe("Search Controller tests", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      baseUrl: "/api/v1",
      query: { term: "test", limit: "10", filter: "" },
      log: {
        info: vi.fn(),
        error: vi.fn(),
      } as any,
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    vi.mocked(getSearchResults).mockResolvedValue({
      results: [{ id: "1", title: "Paper 1", vector: [0.1, 0.2] }],
    } as any);
  });

  it("should return 400 error if term is missing", async () => {
    req.query!.term = "";
    await handleSearchRequest(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Search term is required" });
  });

  it("should return 200 OK for a valid request query", async () => {
    await handleSearchRequest(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      results: [{ id: "1", title: "Paper 1" }],
    });
  });

  test("verify limit is parsed as an integer", async () => {
    req.query!.limit = "15";
    await handleSearchRequest(req as Request, res as Response);

    expect(getSearchResults).toHaveBeenCalledWith("test", 15, "");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("verify invalid limit defaults to 10", async () => {
    req.query!.limit = "invalid";
    await handleSearchRequest(req as Request, res as Response);

    expect(getSearchResults).toHaveBeenCalledWith("test", 10, "");
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
