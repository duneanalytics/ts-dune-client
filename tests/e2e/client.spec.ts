import { expect } from "chai";
import { DuneClient, QueryParameter } from "../../src/";
import log from "loglevel";
import { BASIC_KEY, PLUS_KEY } from "./util";
import * as fs from "fs/promises";

log.setLevel(log.levels.DEBUG, true);

describe("DuneClient Extensions", () => {
  let client: DuneClient;
  let parameterizedQuery: number;
  let multiRowQuery: number;

  beforeEach(() => {
    client = new DuneClient(BASIC_KEY);
    parameterizedQuery = 1215383;
    multiRowQuery = 3463180;
  });

  it("executes runQuery", async () => {
    // https://dune.com/queries/1215383
    const results = await client.runQuery({
      queryId: parameterizedQuery,
      params: {
        query_parameters: [QueryParameter.text("TextField", "Plain Text")],
      },
    });
    expect(results.result?.rows).to.be.deep.equal([
      {
        date_field: "2022-05-04T00:00:00Z",
        list_field: "Option 1",
        number_field: "3.1415926535",
        text_field: "Plain Text",
      },
    ]);

    // pagination:
    const multiRowResults = await client.runQuery({
      queryId: multiRowQuery,
      params: { query_parameters: [QueryParameter.number("StartFrom", 10)] },
      opts: { batchSize: 4 },
    });
    expect(multiRowResults.result?.rows).to.be.deep.equal(
      [10, 11, 12, 13, 14, 15].map((t) => ({ number: t })),
    );
  });

  it("executes runQueryCSV", async () => {
    // https://dune.com/queries/1215383
    const results = await client.runQueryCSV({
      queryId: parameterizedQuery,
      params: {
        query_parameters: [QueryParameter.text("TextField", "Plain Text")],
      },
    });
    expect(results.data).to.be.equal(
      [
        "text_field,number_field,date_field,list_field\n",
        "Plain Text,3.1415926535,2022-05-04 00:00:00.000,Option 1\n",
      ].join(""),
    );

    // pagination:
    const multiRowResults = await client.runQueryCSV({
      queryId: multiRowQuery,
      params: { query_parameters: [QueryParameter.number("StartFrom", 3)] },
      opts: { batchSize: 4 },
    });
    expect(multiRowResults.data).to.be.deep.equal("number\n3\n4\n5\n6\n7\n8\n");
  });

  it.only("getsLatestResults", async () => {
    // https://dune.com/queries/1215383
    const results = await client.getLatestResult({
      queryId: 1215383,
      params: { query_parameters: [QueryParameter.text("TextField", "Plain Text")] },
    });
    expect(results.result?.rows.length).to.be.greaterThan(0);

    // pagination:
    const multiRowResults = await client.getLatestResult({
      queryId: multiRowQuery,
      params: { query_parameters: [QueryParameter.number("StartFrom", 10)] },
      opts: { batchSize: 4 },
    });
    expect(multiRowResults.result?.rows.length).to.be.equal(6);
  });

  it("downloadCSV", async () => {
    await client.downloadCSV(
      {
        queryId: multiRowQuery,
        params: { query_parameters: [QueryParameter.number("StartFrom", 3)] },
      },
      "./out.csv",
    );
    const fileContents = await fs.readFile("./out.csv", { encoding: "utf8" });
    // Compare the contents of the CSV file with the expected string
    expect(fileContents).to.deep.equal("number\n3\n4\n5\n6\n7\n8\n");
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
    expect(results.result?.rows).to.be.deep.equal([{ _col0: 1 }]);
    const query = await premiumClient.query.readQuery(queryID);
    expect(query.is_archived).to.be.equal(true);
  });

  it("uploadCSV", async () => {
    const premiumClient = new DuneClient(PLUS_KEY);
    const public_success = await premiumClient.uploadCsv({
      table_name: "ts_client_test",
      description: "testing csv upload from node",
      data: "column1,column2\nvalue1,value2\nvalue3,value4",
    });
    expect(public_success).to.be.equal(true);

    const private_success = await premiumClient.uploadCsv({
      table_name: "ts_client_test_private",
      data: "column1,column2\nvalue1,value2\nvalue3,value4",
      is_private: true,
    });
    expect(private_success).to.be.equal(true);
  });
});
