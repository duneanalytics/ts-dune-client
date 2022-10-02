import { expect } from "chai";
import { DuneClient } from "../src/client";
// import {} from "../src/responseTypes"

describe("Sample Test", () => {
  it("testing test", async () => {
    const client = new DuneClient("incorrect key");
    // console.log(client);
    expect(2).to.be.oneOf([0, 1]);
  });
});
