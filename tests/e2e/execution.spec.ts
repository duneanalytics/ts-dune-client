import {
  QueryParameter,
  ExecutionState,
  ExecutionAPI,
  DuneClient,
  DuneError,
} from "../../src";
import log from "loglevel";
import { QueryEngine } from "../../src/types/requestArgs";
import { sleep } from "../../src/utils";

log.setLevel("silent", true);

const API_KEY = process.env.DUNE_API_KEY!;

const expectAsyncThrow = async (
  promise: Promise<unknown>,
  message?: string | object,
): Promise<void> => {
  try {
    await promise;
    // Make sure to fail if promise does resolve!
    expect(false).toEqual(true);
  } catch (error: unknown) {
    if (message) {
      expect((error as DuneError).message).toEqual(message);
      expect(error).toBeInstanceOf(DuneError);
    } else {
      expect(error).toBeInstanceOf(DuneError);
    }
  }
};

describe("ExecutionAPI: native routes", () => {
  let client: ExecutionAPI;
  let testQueryId: number;
  let multiRowQuery: number;
  let multiRowExecutionId: string;
  let simpleQueryId: number;
  let simpleExecutionId: string;

  beforeAll(async () => {
    client = new ExecutionAPI(API_KEY);
    // https://dune.com/queries/1215383
    testQueryId = 1215383;
    // https://dune.com/queries/3463180
    multiRowQuery = 3463180;
    // https://dune.com/queries/5898182
    // Simple query: SELECT number FROM UNNEST(ARRAY[0, 1, 2, 3, 4]) AS t(number);
    simpleQueryId = 5898182;

    // Execute simple query once for all tests
    const execution = await client.executeQuery(simpleQueryId);
    simpleExecutionId = execution.execution_id;

    // Wait for it to complete
    let status = await client.getExecutionStatus(simpleExecutionId);
    while (
      status.state === ExecutionState.PENDING ||
      status.state === ExecutionState.EXECUTING
    ) {
      await sleep(1);
      status = await client.getExecutionStatus(simpleExecutionId);
    }
  });

  beforeEach((done) => {
    setTimeout(done, 1000); // Wait for 1000 milliseconds
  });

  // This doesn't work if run too many times at once:
  // https://discord.com/channels/757637422384283659/1019910980634939433/1026840715701010473
  it.skip("returns expected results on sequence execute-cancel-get_status", async () => {
    // Long running query ID.
    const queryID = 1229120;
    // Execute and check state
    const execution = await client.executeQuery(queryID);
    expect([ExecutionState.PENDING, ExecutionState.EXECUTING]).toContain(execution.state);

    // Cancel execution and verify it was canceled.
    const canceled = await client.cancelExecution(execution.execution_id);
    expect(canceled).toEqual(true);

    // Get execution status
    const status = await client.getExecutionStatus(execution.execution_id);
    const expectedStatus = {
      state: ExecutionState.CANCELLED,
      execution_id: execution.execution_id,
      query_id: queryID,
    };
    const strippedStatus = {
      state: status.state,
      execution_id: status.execution_id,
      query_id: status.query_id,
    };
    expect(expectedStatus).toEqual(strippedStatus);
  });

  it("successfully executes with query parameters", async () => {
    const parameters = [
      QueryParameter.text("TextField", "Plain Text"),
      QueryParameter.number("NumberField", 3.1415926535),
      QueryParameter.date("DateField", "2022-05-04 00:00:00"),
      QueryParameter.enum("ListField", "Option 1"),
    ];
    // Execute and check state
    const execution = await client.executeQuery(testQueryId, {
      query_parameters: parameters,
    });
    expect(execution.execution_id).not.toEqual(null);
  });

  it.skip("executes with Large tier performance", async () => {
    // Skipped: This test requires specific premium permissions
    const execution = await client.executeQuery(testQueryId, {
      performance: QueryEngine.Large,
    });
    expect(execution.execution_id).not.toEqual(null);
  });

  it("returns expected results on cancelled query execution", async () => {
    // Execute a query and immediately cancel it
    const execution = await client.executeQuery(multiRowQuery);
    const cancelledExecutionId = execution.execution_id;

    // Cancel the execution
    const wasCancelled = await client.cancelExecution(cancelledExecutionId);
    expect(wasCancelled).toEqual(true);

    // Get the results and verify it shows as cancelled
    const result = await client.getExecutionResults(cancelledExecutionId);
    expect(result.execution_id).toEqual(cancelledExecutionId);
    expect(result.query_id).toEqual(multiRowQuery);
    expect(result.state).toEqual(ExecutionState.CANCELLED);
    // Verify timestamps exist (but don't check exact values since they're dynamic)
    expect(result.submitted_at).toBeDefined();
    expect(result.cancelled_at).toBeDefined();
    expect(result.execution_ended_at).toBeUndefined();
  });

  it("gets Results (with various optinal parameters)", async () => {
    const execution = await client.executeQuery(multiRowQuery);
    multiRowExecutionId = execution.execution_id;
    // const paramQueryExecution = await client.executeQuery(testQueryId);
    await sleep(2);
    // expect basic query has completed after 2s
    const status = await client.getExecutionStatus(multiRowExecutionId);
    expect(status.state).toEqual(ExecutionState.COMPLETED);

    // Limit
    let results = await client.getExecutionResults(multiRowExecutionId, {
      limit: 2,
    });
    expect(results.result?.rows).toEqual([{ number: 5 }, { number: 6 }]);

    // Sample count: apparently doesn't always return the expected number of results.
    await expect(() =>
      client.getExecutionResults(multiRowExecutionId, {
        sample_count: 2,
      }),
    ).not.toThrow();

    // Sort by:
    results = await client.getExecutionResults(multiRowExecutionId, {
      sort_by: "number desc",
      limit: 2,
    });
    expect(results.result?.rows).toEqual([{ number: 10 }, { number: 9 }]);

    // Columns:
    // TODO - reinsert this when the bug is fixed!
    // results = await client.getExecutionResults(paramQueryExecution.execution_id, {
    //   columns: "text_field",
    // });

    // expect(results.result?.rows).toEqual(
    //   [{ text_field: "Plain Text", list_field: "Option 1" }],
    //   `getResults with number,letter columns failed! with ${JSON.stringify(results.result?.rows)}`,
    // );

    const resultCSV = await client.getResultCSV(multiRowExecutionId, { limit: 3 });
    expect(resultCSV.data).toEqual("number\n5\n6\n7\n");
  });

  it("gets Results (with limit)", async () => {
    // Use pre-executed simple query
    const results = await client.getExecutionResults(simpleExecutionId, {
      limit: 2,
    });
    expect(results.result?.rows).toEqual([{ number: 0 }, { number: 1 }]);

    const resultCSV = await client.getResultCSV(simpleExecutionId, { limit: 3 });
    expect(resultCSV.data).toEqual("number\n0\n1\n2\n");
  });

  it("gets LastResult", async () => {
    const { results } = await client.getLastExecutionResults(testQueryId, {
      query_parameters: [QueryParameter.text("TextField", "Plain Text")],
    });
    expect(results.result?.rows).toEqual([
      {
        date_field: "2022-05-04 00:00:00",
        list_field: "Option 1",
        number_field: "3.1415926535",
        text_field: "Plain Text",
      },
    ]);
  });

  it("gets LastResultCSV", async () => {
    // https://dune.com/queries/1215383
    const resultCSV = await client.getLastResultCSV(testQueryId, {
      query_parameters: [QueryParameter.text("TextField", "Plain Text")],
    });
    const expectedRows = [
      "text_field,number_field,date_field,list_field\n",
      "Plain Text,3.1415926535,2022-05-04 00:00:00,Option 1\n",
    ];
    expect(resultCSV.data).toEqual(expectedRows.join(""));
  });

  /// Pagination
  it("uses pagination parameters", async () => {
    // Use pre-executed simple query to test pagination
    // Test pagination with limit and offset
    const result = await client.getExecutionResults(simpleExecutionId, {
      limit: 2,
      offset: 1,
    });
    expect(result.result?.rows).toEqual([
      {
        number: 1,
      },
      {
        number: 2,
      },
    ]);

    // Test CSV results with pagination
    const resultCSV = await client.getResultCSV(simpleExecutionId, {
      limit: 1,
      offset: 2,
    });
    const expectedRows = ["number\n", "2\n"];
    expect(resultCSV.data).toEqual(expectedRows.join(""));
  });

  it("executes raw SQL with executeSql", async () => {
    const execution = await client.executeSql({
      sql: "SELECT * FROM dex.trades WHERE block_time > now() - interval '1' day LIMIT 10",
    });
    expect(execution.execution_id).not.toEqual(null);
    expect(execution.state).toBeDefined();
  });

  it("executes raw SQL with performance parameter", async () => {
    const execution = await client.executeSql({
      sql: "SELECT 1 as test_value",
      performance: QueryEngine.Medium,
    });
    expect(execution.execution_id).not.toEqual(null);
    expect(execution.state).toBeDefined();
  });
});

describe("ExecutionAPI: Errors", () => {
  // TODO these errors can't be reached because post method is private
  // {"error":"unknown parameters (undefined)"}
  // {"error":"Invalid request body payload"}
  let client: ExecutionAPI;

  beforeAll(() => {
    client = new ExecutionAPI(API_KEY);
  });

  beforeEach((done) => {
    setTimeout(done, 1000); // Wait for 1000 milliseconds
  });

  it("returns invalid API key", async () => {
    const bad_client = new ExecutionAPI("Bad Key");
    await expectAsyncThrow(
      bad_client.executeQuery(1),
      `Response Error: HTTP - Status: 401, Message: {"error":"invalid API Key"}`,
    );
  });

  it("returns query not found error", async () => {
    const message = `Response Error: HTTP - Status: 404, Message: {"error":"Query not found"}`;
    await expectAsyncThrow(client.executeQuery(999999999), message);
    await expectAsyncThrow(client.executeQuery(0), message);
  });

  it("returns invalid job id", async () => {
    const invalidJobID = "Wonky Job ID";
    const errorMessage = `Response Error: HTTP - Status: 400, Message: {"error":"The requested execution ID (ID: ${invalidJobID}) is invalid."}`;
    await expectAsyncThrow(client.getExecutionStatus(invalidJobID), errorMessage);
    await expectAsyncThrow(client.getExecutionResults(invalidJobID), errorMessage);
    await expectAsyncThrow(client.cancelExecution(invalidJobID), errorMessage);
  });
  it("fails execute with unknown query parameter", async () => {
    const queryID = 1215383;
    const invalidParameterName = "Invalid Parameter";
    const errorMessage = `Response Error: HTTP - Status: 400, Message: {"error":"unknown parameters (${invalidParameterName})"}`;
    await expectAsyncThrow(
      client.executeQuery(queryID, {
        query_parameters: [QueryParameter.text(invalidParameterName, "")],
      }),
      errorMessage,
    );
  });
  it("does not allow to execute private queries for other accounts.", async () => {
    await expectAsyncThrow(
      client.executeQuery(1348384),
      `Response Error: HTTP - Status: 404, Message: {"error":"Query not found"}`,
    );
  });

  it("returns error when query execution fails", async () => {
    // Use DuneClient to create a query with bad SQL, execute it, and check the error
    const fullClient = new DuneClient(API_KEY);

    // Create a query with intentionally bad SQL
    const queryId = await fullClient.query.createQuery({
      name: "Test Failed Query",
      query_sql: "SELECT x",
      is_private: true,
    });

    try {
      // Execute the query
      const execution = await fullClient.exec.executeQuery(queryId);

      // Wait a bit for it to fail
      await sleep(3);

      // Get the status - should have an error
      const status = await fullClient.exec.getExecutionStatus(execution.execution_id);
      expect(status.error).toBeDefined();
      expect(status.error?.type).toEqual("FAILED_TYPE_EXECUTION_FAILED");
      expect(status.error?.message).toContain("Column 'x' cannot be resolved");
      expect(status.state).toEqual(ExecutionState.FAILED);

      // Get the results - should also have an error
      const result = await fullClient.exec.getExecutionResults(execution.execution_id);
      expect(result.error).toBeDefined();
      expect(result.error?.type).toEqual("FAILED_TYPE_EXECUTION_FAILED");
      expect(result.error?.message).toContain("Column 'x' cannot be resolved");
      expect(result.state).toEqual(ExecutionState.FAILED);
    } finally {
      // Cleanup: archive the query even if test fails
      await fullClient.query.archiveQuery(queryId);
    }
  });
});
