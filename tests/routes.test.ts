import { expect } from "chai";
import { DuneClient } from "../src/client";

const { DUNE_API_KEY } = process.env;
const apiKey: string = DUNE_API_KEY ? DUNE_API_KEY : "No API Key";

describe("DuneClient: execute", () => {
  it("Sample Test", async () => {
    const client = new DuneClient(apiKey);
    const x = await client.execute(1258228);
    console.log(JSON.stringify(x));
    expect(2).to.be.oneOf([0, 1]);
  });

  it("Sample Test 2", async () => {
    const client = new DuneClient("Bad Key");
    const x = await client.execute(1258228);
    console.log(JSON.stringify(x));
    expect(2).to.be.oneOf([0, 1]);
  });
});
