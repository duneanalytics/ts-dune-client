import { QueryParameter, QueryAPI } from "../../src";
import { PLUS_KEY } from "./util";

describe("QueryAPI: Premium - CRUD Operations", () => {
  let plusClient: QueryAPI;

  beforeAll(() => {
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
    expect(newQueryId).toEqual(newQueryId);
    const updatedQueryId = await plusClient.updateQuery(newQueryId, {
      name: "New Name",
      query_sql: "select 10",
    });
    expect(updatedQueryId).toEqual(recoveredQuery.query_id);
  });

  it.skip("unarchive, make public, make private, rearchive", async () => {
    const queryId = 3530410;
    let query = await plusClient.readQuery(queryId);

    await plusClient.unarchiveQuery(queryId);
    await plusClient.makePublic(queryId);
    query = await plusClient.readQuery(queryId);
    expect(query.is_archived).toEqual(false);
    expect(query.is_private).toEqual(false);

    await plusClient.archiveQuery(queryId);
    await plusClient.makePrivate(queryId);
    query = await plusClient.readQuery(queryId);
    expect(query.is_archived).toEqual(true);
    expect(query.is_private).toEqual(true);
  });
});
