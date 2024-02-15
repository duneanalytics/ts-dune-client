import { expect } from "chai";
import { QueryParameter, DuneError, QueryAPI } from "../../src/";
import { apiKey } from "./util";

describe("QueryAPI: Premium - CRUD Operations", () => {
  it("create, get & update", async () => {
    const client = new QueryAPI(apiKey);
    let newQuery = await client.createQuery(
      "Name",
      "select 1",
      [QueryParameter.text("What", "name")],
      true,
    );
    let recoveredQuery = await client.getQuery(newQuery.query_id);
    expect(newQuery.query_id).to.be.equal(recoveredQuery.query_id);
    let updatedQueryId = await client.updateQuery(
      newQuery.query_id,
      "New Name",
      "select 10;",
    );
    expect(updatedQueryId).to.be.equal(recoveredQuery.query_id);
  });
});
