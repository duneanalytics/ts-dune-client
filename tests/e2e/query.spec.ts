import { QueryParameter, QueryAPI } from "../../src";
import { API_KEY } from "./util";

describe("QueryAPI: CRUD Operations", () => {
  let client: QueryAPI;

  beforeAll(() => {
    client = new QueryAPI(API_KEY);
  });

  // This creates too many queries!
  it.skip("create, get & update", async () => {
    const newQueryId = await client.createQuery({
      name: "Query Name",
      query_sql: "select 1",
      query_parameters: [QueryParameter.text("What", "name")],
      is_private: true,
    });
    const recoveredQuery = await client.readQuery(newQueryId);
    expect(newQueryId).toEqual(newQueryId);
    const updatedQueryId = await client.updateQuery(newQueryId, {
      name: "New Name",
      query_sql: "select 10",
    });
    expect(updatedQueryId).toEqual(recoveredQuery.query_id);
  });

  it.skip("unarchive, make public, make private, rearchive", async () => {
    const queryId = 3530410;
    let query = await client.readQuery(queryId);

    await client.unarchiveQuery(queryId);
    await client.makePublic(queryId);
    query = await client.readQuery(queryId);
    expect(query.is_archived).toEqual(false);
    expect(query.is_private).toEqual(false);

    await client.archiveQuery(queryId);
    await client.makePrivate(queryId);
    query = await client.readQuery(queryId);
    expect(query.is_archived).toEqual(true);
    expect(query.is_private).toEqual(true);
  });
});
