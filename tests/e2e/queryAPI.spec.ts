import { expect } from "chai";
import { QueryParameter, QueryAPI } from "../../src/";
import { PLUS_KEY, BASIC_KEY, expectAsyncThrow } from "./util";

const PREMIUM_PLAN_MESSAGE =
  "Response Error: Query management endpoints are only available in our paid plans. Please upgrade to a paid plan to use it.";

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

  it("unarchive, make public, make private, rearchive", async () => {
    const queryId = 3530410;
    let query = await plusClient.readQuery(queryId);
    expect(query.is_archived).to.be.equal(true);
    expect(query.is_private).to.be.equal(true);

    await plusClient.unarchiveQuery(queryId);
    await plusClient.makePublic(queryId);
    query = await plusClient.readQuery(queryId);
    expect(query.is_archived).to.be.equal(false);
    expect(query.is_private).to.be.equal(false);

    await plusClient.archiveQuery(queryId);
    await plusClient.makePrivate(queryId);
    query = await plusClient.readQuery(queryId);
    expect(query.is_archived).to.be.equal(true);
    expect(query.is_private).to.be.equal(true);
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
