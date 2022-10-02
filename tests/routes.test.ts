// import { expect } from "chai";
import { DuneClient } from "../src/client";

// import * as mocha from "mocha";
import * as chai from "chai";

const expect = chai.expect;
describe("DuneClient: execute", () => {
  it("Sample Test", async () => {
    const client = new DuneClient("incorrect key");
    const x = await client.execute(123);
    expect(2).to.be.oneOf([0, 1]);
  });
});
