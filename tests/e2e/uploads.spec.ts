import log from "loglevel";
import * as fs from "fs/promises";
import { UploadsAPI } from "../../src/api";
import { ColumnType, ContentType } from "../../src";

log.setLevel("silent", true);

const API_KEY = process.env.DUNE_API_KEY!;
const USER_NAME = process.env.DUNE_API_KEY_OWNER_HANDLE || "your_username";

describe("Uploads API", () => {
  let uploadsClient: UploadsAPI;
  let namespace: string;
  const table_name = "uploads_e2e_test";

  beforeAll(() => {
    uploadsClient = new UploadsAPI(API_KEY);
    namespace = USER_NAME;
  });

  beforeEach((done) => {
    setTimeout(done, 1000);
  });

  it("lists uploaded tables", async () => {
    const response = await uploadsClient.list({ limit: 10 });

    expect(response).toHaveProperty("tables");
    expect(Array.isArray(response.tables)).toBe(true);

    if (response.tables.length > 0) {
      const firstTable = response.tables[0];
      expect(firstTable).toHaveProperty("full_name");
      expect(firstTable).toHaveProperty("is_private");
      expect(firstTable).toHaveProperty("owner");
      expect(firstTable).toHaveProperty("columns");
      expect(firstTable).toHaveProperty("created_at");
      expect(firstTable).toHaveProperty("updated_at");
    }
  });

  it("uploads CSV", async () => {
    const public_success = await uploadsClient.uploadCsv({
      table_name: "ts_client_uploads_test",
      description: "testing csv upload from node via uploads API",
      data: "column1,column2\nvalue1,value2\nvalue3,value4",
    });
    expect(public_success).toEqual(true);

    const private_success = await uploadsClient.uploadCsv({
      table_name: "ts_client_uploads_test_private",
      data: "column1,column2\nvalue1,value2\nvalue3,value4",
      is_private: true,
    });
    expect(private_success).toEqual(true);
  });

  it("creates table", async () => {
    const createResult = await uploadsClient.create({
      namespace,
      table_name,
      description: "e2e test table via uploads API",
      schema: [
        { name: "date", type: ColumnType.Timestamp },
        { name: "dgs10", type: ColumnType.Double },
      ],
      is_private: false,
    });

    expect(createResult).toMatchObject({
      namespace,
      table_name,
      full_name: `dune.${namespace}.${table_name}`,
      example_query: `select * from dune.${namespace}.${table_name} limit 10`,
    });
  });

  it("inserts JSON to Table", async () => {
    const data: Buffer = await fs.readFile("./tests/fixtures/sample_table_insert.json");
    const insertResult = await uploadsClient.insert({
      namespace,
      table_name,
      data,
      content_type: ContentType.NDJson,
    });

    expect(insertResult).toMatchObject({ rows_written: 1 });
  });

  it("inserts CSV to Table", async () => {
    const data = await fs.readFile("./tests/fixtures/sample_table_insert.csv");
    const insertResult = await uploadsClient.insert({
      namespace,
      table_name,
      data,
      content_type: ContentType.Csv,
    });
    expect(insertResult).toMatchObject({ rows_written: 1 });
  });

  it("clears table data", async () => {
    const result = await uploadsClient.clear({
      namespace,
      table_name,
    });
    expect(result).toHaveProperty("message");
    expect(result.message).toContain("successfully cleared");
  });

  it("deletes table", async () => {
    const result = await uploadsClient.delete({
      namespace,
      table_name,
    });
    expect(result).toEqual({
      message: `Table ${namespace}.${table_name} successfully deleted`,
    });
  });
});
