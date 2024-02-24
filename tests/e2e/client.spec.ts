import { expect } from "chai";
import { DuneClient, QueryParameter } from "../../src/";
import log from "loglevel";
import { BASIC_KEY } from "./util";

log.setLevel("silent", true);

describe("DuneClient Extensions", () => {
  let client: DuneClient;

  beforeEach(() => {
    client = new DuneClient(BASIC_KEY);
  });

  it("execute runQuery", async () => {
    // https://dune.com/queries/1215383
    const results = await client.runQuery(1215383, {
      query_parameters: [QueryParameter.text("TextField", "Plain Text")],
    });
    expect(results.result?.rows).to.be.deep.equal([
      {
        date_field: "2022-05-04T00:00:00Z",
        list_field: "Option 1",
        number_field: "3.1415926535",
        text_field: "Plain Text",
      },
    ]);
  });

  it("getsLatestResults", async () => {
    // https://dune.com/queries/1215383
    const results = await client.getLatestResult(1215383, [
      QueryParameter.text("TextField", "Plain Text"),
    ]);
    expect(results.result?.rows.length).to.be.greaterThan(0);
  });

  it("getsLatestResultsCSV", async () => {
    // https://dune.com/queries/1215383
    const resultCSV = await client.getLatestResultCSV(1215383, [
      QueryParameter.text("TextField", "Plain Text"),
    ]);
    const expectedRows = [
      "text_field,number_field,date_field,list_field\n",
      "Plain Text,3.1415926535,2022-05-04T00:00:00Z,Option 1\n",
    ];
    expect(resultCSV.data).to.be.eq(expectedRows.join(""));
  });

  it("ensures respected limits on get latest", async () => {
    // https://dune.com/queries/3463180
    const multiRowQueryId = 3463180;
    const limit = 2;
    // These mean nothing here (but they should)
    const query_parameters = [QueryParameter.number("StartFrom", 3)];

    let result = await client.getLatestResult(multiRowQueryId, query_parameters, limit);
    expect(result.result!.rows).to.be.deep.eq([{ number: 3 }, { number: 4 }]);

    const resultCSV = await client.getLatestResultCSV(
      multiRowQueryId,
      query_parameters,
      limit,
    );
    expect(resultCSV.data).to.be.eq(["number\n", "3\n", "4\n"].join(""));
  });

  it("ensures limits respected on runQuery", async () => {
    // https://dune.com/queries/3463180
    const multiRowQueryId = 3463180;
    const limit = 1;
    // These mean nothing here (but they should)
    const query_parameters = [QueryParameter.number("StartFrom", 11)];

    const result = await client.runQuery(multiRowQueryId, { query_parameters }, limit);
    expect(result.result!.rows).to.be.deep.eq([{ number: 11 }]);

    const resultCSV = await client.runQueryCSV(
      multiRowQueryId,
      { query_parameters },
      limit,
    );
    expect(resultCSV.data).to.be.eq(["number\n", "11\n"].join(""));
  });
});
