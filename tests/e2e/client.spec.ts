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
        date_field: "2022-05-04 00:00:00.000",
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
});
