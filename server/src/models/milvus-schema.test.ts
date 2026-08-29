import { describe, it, expect, beforeEach, test } from "vitest";
import { SandboxSchema } from "./milvus-schema.js";

describe("SandboxSchema", () => {
  const sampleData = {
    headline: "Test Headline",
    category: "CRIME & JUSTICE",
    short_description: "This is a test description.",
    links: "http://example.com",
  };

  let schema: SandboxSchema;

  beforeEach(() => {
    schema = new SandboxSchema(sampleData);
  });

  describe("Initialization", () => {
    it("should correctly initialize properties from data", () => {
      expect(schema.title).toBe("Test Headline");
      expect(schema.category).toBe("crime-and-justice");
      expect(schema.text).toBe("This is a test description.");
    });

    it("should create a valid ID using createId", () => {
      const expectedId = schema.createId(sampleData);
      expect(schema.id).toBe(expectedId);
    });
  });

  describe("BaseSchema methods", () => {
    it("should set and get vector", () => {
      expect(schema.vector).toBeNull();
      const testVector = [0.1, 0.2, 0.3];
      schema.vector = testVector;
      expect(schema.vector).toEqual(testVector);
    });
  });

  describe("Methods and Getters", () => {
    test("sanitizeCategory should format category strings correctly", () => {
      expect(schema.sanitizeCategory("SCIENCE & TECHNOLOGY")).toBe(
        "science-and-technology",
      );
      expect(schema.sanitizeCategory("WORLD NEWS")).toBe("world-news");
    });

    test("object getter should return formatted object for Milvus insertion", () => {
      schema.vector = [0.1, 0.2];
      const obj = schema.object;
      expect(obj).toEqual({
        id: schema.id,
        headline: "Test Headline",
        category: "crime-and-justice",
        vector: [0.1, 0.2],
      });
    });
  });

  describe("Static properties", () => {
    it("should return correct filterExpression", () => {
      expect(SandboxSchema.filterExpression).toBe('category == "%s"');
    });
  });
});
