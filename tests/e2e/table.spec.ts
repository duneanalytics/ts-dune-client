import log from "loglevel";
import { PLUS_KEY, USER_NAME } from "./util";
import * as fs from "fs/promises";
import { TableAPI } from "../../src/api";
import { ColumnType, ContentType } from "../../src";

log.setLevel("silent", true);

describe("Table API", () => {
  let tableClient: TableAPI;
  let namespace: string;
  const table_name = "dataset_e2e_test";

  beforeAll(() => {
    tableClient = new TableAPI(PLUS_KEY);
    namespace = USER_NAME;
  });

  beforeEach((done) => {
    setTimeout(done, 1000); // Wait for 1000 milliseconds
  });

  it("uploads CSV", async () => {
    const public_success = await tableClient.uploadCsv({
      table_name: "ts_client_test",
      description: "testing csv upload from node",
      data: "column1,column2\nvalue1,value2\nvalue3,value4",
    });
    expect(public_success).toEqual(true);

    const private_success = await tableClient.uploadCsv({
      table_name: "ts_client_test_private",
      data: "column1,column2\nvalue1,value2\nvalue3,value4",
      is_private: true,
    });
    expect(private_success).toEqual(true);
  });

  // Skipped because needs valid user name.
  it.skip("creates table", async () => {
    const createResult = await tableClient.create({
      namespace,
      table_name,
      description: "e2e test table",
      schema: [
        { name: "date", type: ColumnType.Timestamp },
        { name: "dgs10", type: ColumnType.Double },
      ],
      is_private: false,
    });

    expect(createResult).toEqual({
      namespace,
      table_name,
      full_name: `dune.${namespace}.${table_name}`,
      example_query: `select * from dune.${namespace}.${table_name} limit 10`,
    });
  });

  it.skip("inserts JSON to Table", async () => {
    const data: Buffer = await fs.readFile("./tests/fixtures/sample_table_insert.json");
    const insertResult = await tableClient.insert({
      namespace,
      table_name,
      data,
      content_type: ContentType.NDJson,
    });

    expect(insertResult).toEqual({ rows_written: 1 });
  });

  it.skip("inserts CSV to Table", async () => {
    const data = await fs.readFile("./tests/fixtures/sample_table_insert.csv");
    const insertResult = await tableClient.insert({
      namespace,
      table_name,
      data,
      content_type: ContentType.Csv,
    });
    expect(insertResult).toEqual({ rows_written: 1 });
  });

  it.skip("deletes table", async () => {
    const result = await tableClient.delete({
      namespace,
      table_name,
    });
    expect(result).toEqual({
      message: `Table ${namespace}.dataset_e2e_test successfully deleted`,
    });
  });
});
