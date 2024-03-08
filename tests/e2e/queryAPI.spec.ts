import { expect } from "chai";
import { QueryParameter, QueryAPI } from "../../src/";
import { PLUS_KEY, BASIC_KEY, expectAsyncThrow } from "./util";

const PREMIUM_PLAN_MESSAGE =
  "CRUD queries is an advanced feature included only in our premium subscription plans. Please upgrade your plan to use it.";

describe("QueryAPI: Premium - CRUD Operations", () => {
  let plusClient: QueryAPI;

  beforeEach(() => {
    plusClient = new QueryAPI(PLUS_KEY);
  });

  // This creates too many queries!
  it.skip("create, get & update", async () => {
    const newQueryId = await plusClient.createQuery({
      name: "Query Name",
      query_sql: "select 1",
      query_parameters: [QueryParameter.text("What", "name")],
      is_private: true,
    });
    const recoveredQuery = await plusClient.readQuery(newQueryId);
    expect(newQueryId).to.be.equal(newQueryId);
    const updatedQueryId = await plusClient.updateQuery(newQueryId, {
      name: "New Name",
      query_sql: "select 10",
    });
    expect(updatedQueryId).to.be.equal(recoveredQuery.query_id);
  });
});

describe("QueryAPI: Errors", () => {
  let basicClient: QueryAPI;

  beforeEach(() => {
    basicClient = new QueryAPI(BASIC_KEY);
  });

  it("Basic Plan Failure", async () => {
    await expectAsyncThrow(
      basicClient.createQuery({
        name: "Query Name",
        query_sql: "select 1",
      }),
      PREMIUM_PLAN_MESSAGE,
    );
  });
});
