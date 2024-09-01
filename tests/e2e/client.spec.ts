import { DuneClient, QueryParameter } from "../../src/";
import log from "loglevel";
import { BASIC_KEY, PLUS_KEY } from "./util";
import * as fs from "fs/promises";

log.setLevel("silent", true);

describe("DuneClient Extensions", () => {
  let client: DuneClient;
  let parameterizedQuery: number;
  let multiRowQuery: number;

  beforeAll(() => {
    client = new DuneClient(BASIC_KEY);
    parameterizedQuery = 1215383;
    multiRowQuery = 3463180;
  });

  it("executes runQuery", async () => {
    // https://dune.com/queries/1215383
    const results = await client.runQuery({
      queryId: parameterizedQuery,
      query_parameters: [QueryParameter.text("TextField", "Plain Text")],
    });
    expect(results.result?.rows).toEqual([
      {
        date_field: "2022-05-04 00:00:00",
        list_field: "Option 1",
        number_field: "3.1415926535",
        text_field: "Plain Text",
      },
    ]);

    // pagination:
    const multiRowResults = await client.runQuery({
      queryId: multiRowQuery,
      query_parameters: [QueryParameter.number("StartFrom", 10)],
    });
    expect(multiRowResults.result?.rows).toEqual(
      [10, 11, 12, 13, 14, 15].map((t) => ({ number: t })),
    );
  });

  it("executes runQuery with filter", async () => {
    const multiRowResults = await client.runQuery({
      queryId: multiRowQuery,
      query_parameters: [QueryParameter.number("StartFrom", 1)],
      filters: "number < 6",
    });
    expect(multiRowResults.result?.rows).toEqual(
      [1, 2, 3, 4, 5].map((t) => ({ number: t })),
    );
  }, 10000);

  it("executes runQueryCSV", async () => {
    // https://dune.com/queries/1215383
    const results = await client.runQueryCSV({
      queryId: parameterizedQuery,
      query_parameters: [QueryParameter.text("TextField", "Plain Text")],
    });
    expect(results.data).toEqual(
      [
        "text_field,number_field,date_field,list_field\n",
        "Plain Text,3.1415926535,2022-05-04 00:00:00,Option 1\n",
      ].join(""),
    );

    // pagination:
    const multiRowResults = await client.runQueryCSV({
      queryId: multiRowQuery,
      query_parameters: [QueryParameter.number("StartFrom", 3)],
      opts: { batchSize: 4 },
    });
    expect(multiRowResults.data).toEqual("number\n3\n4\n5\n6\n7\n8\n");
  });

  it("getsLatestResults", async () => {
    // https://dune.com/queries/1215383
    const results = await client.getLatestResult({
      queryId: 1215383,
      query_parameters: [QueryParameter.text("TextField", "Plain Text")],
    });
    expect(results.result?.rows.length).toBeGreaterThan(0);

    // pagination:
    const multiRowResults = await client.getLatestResult({
      queryId: multiRowQuery,
      query_parameters: [QueryParameter.number("StartFrom", 10)],
      opts: { batchSize: 4 },
    });
    expect(multiRowResults.result?.rows.length).toEqual(6);
  });

  it("downloads CSV", async () => {
    await client.downloadCSV(
      {
        queryId: multiRowQuery,
        query_parameters: [QueryParameter.number("StartFrom", 3)],
      },
      "./out.csv",
    );
    const fileContents = await fs.readFile("./out.csv", { encoding: "utf8" });
    // Compare the contents of the CSV file with the expected string
    expect(fileContents).toEqual("number\n3\n4\n5\n6\n7\n8\n");
    // Remove the CSV file after the comparison
    await fs.unlink("./out.csv");
  });

  it("runSQL", async () => {
    const premiumClient = new DuneClient(PLUS_KEY);
    const results = await premiumClient.runSql({
      query_sql: "select 1",
      archiveAfter: true,
      isPrivate: true,
    });
    const queryID = results.query_id;
    expect(results.result?.rows).toEqual([{ _col0: 1 }]);
    const query = await premiumClient.query.readQuery(queryID);
    expect(query.is_archived).toEqual(true);
  });
});
