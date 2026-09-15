import { describe, it, expect, beforeAll, vi } from "vitest";
import crypto from "node:crypto";

// Mock process.loadEnvFile before loading the schema module so it doesn't fail if .env is at repo root
vi.spyOn(process, "loadEnvFile").mockImplementation(() => {});

const { ArxivSchema } = await import("./arxiv-schema.js");

describe("ArxivSchema", () => {
  const sampleCleanedRecord = {
    id: "0704.0001",
    authors: ["C. Balázs", "E. L. Berger", "P. M. Nadolsky", "C.-P. Yuan"],
    title: "Calculation of prompt diphoton production cross sections at Tevatron and LHC energies",
    journal_ref: "Phys.Rev.D76:013009,2007",
    doi: ["10.1103/PhysRevD.76.013009"],
    report_no: "ANL-HEP-PR-07-12",
    categories: ["hep-ph"],
    abstract: "A fully differential calculation in perturbative quantum chromodynamics is presented.",
    created_date: "2007-04-02T19:18:42+00:00",
    updated_date: "2007-07-24T20:10:27+00:00",
  };

  describe("Constructor & Field Mapping", () => {
    it("should correctly map all fields from cleaned dataset record", () => {
      const model = new ArxivSchema(sampleCleanedRecord);

      expect(model.arxivId).toBe("0704.0001");
      expect(model.title).toBe(sampleCleanedRecord.title);
      expect(model.journalRef).toBe("Phys.Rev.D76:013009,2007");
      expect(model.doi).toEqual(["10.1103/PhysRevD.76.013009"]);
      expect(model.reportNo).toBe("ANL-HEP-PR-07-12");
      expect(model.categories).toEqual(["hep-ph"]);
      expect(model.authors).toEqual(sampleCleanedRecord.authors);
      expect(model.abstract).toBe(sampleCleanedRecord.abstract);
      expect(model.createdDate).toBe("2007-04-02T19:18:42+00:00");
      expect(model.updatedDate).toBe("2007-07-24T20:10:27+00:00");
      expect(model.vector).toBeNull();
    });

    it("should handle nullable/optional fields when null", () => {
      const recordWithNulls = {
        id: "0704.0063",
        authors: ["Somnath Choudhury"],
        title: "Experimental efforts in search of 76Ge Neutrinoless Double Beta Decay",
        journal_ref: null,
        doi: null,
        report_no: null,
        categories: ["hep-ph"],
        abstract: "Neutrinoless double beta decay is one of the most sensitive approaches.",
        created_date: "2007-04-01T00:15:54+00:00",
        updated_date: "2008-03-12T16:14:26+00:00",
      };

      const model = new ArxivSchema(recordWithNulls);

      expect(model.arxivId).toBe("0704.0063");
      expect(model.journalRef).toBeNull();
      expect(model.doi).toBeNull();
      expect(model.reportNo).toBeNull();
    });
  });

  describe("Deterministic ID Generation", () => {
    it("should generate SHA-256 hash using title and id", () => {
      const model = new ArxivSchema(sampleCleanedRecord);
      const expectedHash = crypto
        .createHash("sha256")
        .update(`${sampleCleanedRecord.title}:${sampleCleanedRecord.id}`)
        .digest("hex");

      expect(model.id).toBe(expectedHash);
      expect(model.id).toHaveLength(64);
    });

    it("should generate unique IDs for records with different ids or titles", () => {
      const model1 = new ArxivSchema(sampleCleanedRecord);
      const model2 = new ArxivSchema({
        ...sampleCleanedRecord,
        id: "0704.0002",
      });
      const model3 = new ArxivSchema({
        ...sampleCleanedRecord,
        title: "Different Title",
      });

      expect(model1.id).not.toBe(model2.id);
      expect(model1.id).not.toBe(model3.id);
      expect(model2.id).not.toBe(model3.id);
    });
  });

  describe("Text & Object Getters", () => {
    it("should combine title and abstract in text getter", () => {
      const model = new ArxivSchema(sampleCleanedRecord);
      expect(model.text).toBe(`${sampleCleanedRecord.title} ${sampleCleanedRecord.abstract}`);
    });

    it("should return object representation matching schema", () => {
      const model = new ArxivSchema(sampleCleanedRecord);
      const obj = model.object;

      expect(obj).toEqual({
        id: model.id,
        arxivId: "0704.0001",
        title: sampleCleanedRecord.title,
        journalRef: "Phys.Rev.D76:013009,2007",
        doi: ["10.1103/PhysRevD.76.013009"],
        reportNo: "ANL-HEP-PR-07-12",
        categories: ["hep-ph"],
        authors: sampleCleanedRecord.authors,
        abstract: sampleCleanedRecord.abstract,
        createdDate: "2007-04-02T19:18:42+00:00",
        updatedDate: "2007-07-24T20:10:27+00:00",
        vector: null,
      });

      // After vector assignment
      const mockVector = Array(384).fill(0.1);
      model.vector = mockVector;
      expect(model.object.vector).toEqual(mockVector);
    });
  });
});
