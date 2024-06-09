import { CustomAPI } from "../../src/";
import log from "loglevel";
import { BASIC_KEY } from "./util";
import { expect } from "chai";

log.setLevel("debug", true);

describe("DuneClient Extensions", () => {
  let client: CustomAPI;
  const slug = "test-custom-api";

  before(() => {
    client = new CustomAPI(BASIC_KEY);
  });

  // Skip: This endpoint is very "user specific"
  it.skip("executes custom api fetch", async () => {
    const results = await client.getResults({
      username: "bh2smith",
      slug,
      limit: 1,
    });
    expect(results.result!.rows.length).to.equal(1);
  });
});
