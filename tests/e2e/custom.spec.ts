import { CustomAPI } from "../../src/";
import log from "loglevel";
import { BASIC_KEY } from "./util";

log.setLevel("silent", true);

describe("Custom API", () => {
  let client: CustomAPI;
  const slug = "test-custom-api";

  beforeAll(() => {
    client = new CustomAPI(BASIC_KEY);
  });

  // Skip: This endpoint is very "user specific"
  it.skip("retrieves data from custom endpoint", async () => {
    // Note: for DuneClient class this would be `client.custom.getResults`
    const results = await client.getResults({
      handle: "bh2smith",
      slug,
      limit: 1,
    });
    expect(results.result!.rows.length).toEqual(1);
  });
});
