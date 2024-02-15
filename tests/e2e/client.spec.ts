import { expect } from "chai";
import { DuneClient, QueryParameter } from "../../src/";
import log from "loglevel";
import { apiKey } from "./util";

log.setLevel("silent", true);

describe("DuneClient Extensions", () => {
  it("execute runQuery", async () => {
    const client = new DuneClient(apiKey);
    // https://dune.com/queries/1215383
    const results = await client.runQuery(1215383, {
      query_parameters: [QueryParameter.text("TextField", "Plain Text")],
    });
    expect(results.result?.rows).to.be.deep.equal([
      {
        date_field: "2022-05-04 00:00:00.000",
        list_field: "Option 1",
        number_field: "3.1415926535",
        text_field: "Plain Text",
      },
    ]);
  });

  it("getsLatestResults", async () => {
    const client = new DuneClient(apiKey);
    // https://dune.com/queries/1215383
    const results = await client.getLatestResult(1215383, [
      QueryParameter.text("TextField", "Plain Text"),
    ]);
    expect(results.result?.rows.length).to.be.greaterThan(0);
  });
});
