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

  it("create, get & update", async () => {
    let newQuery = await plusClient.createQuery(
      "Name",
      "select 1",
      [QueryParameter.text("What", "name")],
      true,
    );
    let recoveredQuery = await plusClient.getQuery(newQuery.query_id);
    expect(newQuery.query_id).to.be.equal(recoveredQuery.query_id);
    let updatedQueryId = await plusClient.updateQuery(
      newQuery.query_id,
      "New Name",
      "select 10;",
    );
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
      basicClient.createQuery("Query Name", "select 1"),
      PREMIUM_PLAN_MESSAGE,
    );
  });
});
