import { QueryParameter, ExecutionState, ExecutionAPI } from "../../src";
import log from "loglevel";
import { QueryEngine } from "../../src/types/requestArgs";
import { BASIC_KEY, PLUS_KEY, expectAsyncThrow } from "./util";
import { sleep } from "../../src/utils";

log.setLevel("silent", true);

describe("ExecutionAPI: native routes", () => {
  let client: ExecutionAPI;
  let testQueryId: number;
  let multiRowQuery: number;

  beforeAll(() => {
    client = new ExecutionAPI(BASIC_KEY);
    // https://dune.com/queries/1215383
    testQueryId = 1215383;
    // https://dune.com/queries/3463180
    multiRowQuery = 3463180;
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

  it("executes with Large tier performance", async () => {
    client = new ExecutionAPI(PLUS_KEY);
    const execution = await client.executeQuery(testQueryId, {
      performance: QueryEngine.Large,
    });
    expect(execution.execution_id).not.toEqual(null);
  });

  it("returns expected results on cancelled query exection", async () => {
    // Execute and check state
    const cancelledExecutionId = "01GEHEC1W8P1V5ENF66R2WY54V";
    const result = await client.getExecutionResults(cancelledExecutionId);
    expect(result).toEqual({
      execution_id: cancelledExecutionId,
      query_id: 1229120,
      state: "QUERY_STATE_CANCELLED",
      // TODO - this is a new field - not present in our type interfaces.
      is_execution_finished: true,
      submitted_at: "2022-10-04T12:08:47.753527Z",
      expires_at: "2024-10-03T12:08:48.790332Z",
      execution_started_at: "2022-10-04T12:08:47.756608607Z",
      cancelled_at: "2022-10-04T12:08:48.790331383Z",
      execution_ended_at: "2022-10-04T12:08:48.790331383Z",
    });
  });

  it("gets Results (with various optinal parameters)", async () => {
    const execution = await client.executeQuery(multiRowQuery);
    // const paramQueryExecution = await client.executeQuery(testQueryId);
    await sleep(2);
    // expect basic query has completed after 2s
    const status = await client.getExecutionStatus(execution.execution_id);
    expect(status.state).toEqual(ExecutionState.COMPLETED);

    // Limit
    let results = await client.getExecutionResults(execution.execution_id, {
      limit: 2,
    });
    expect(results.result?.rows).toEqual([{ number: 5 }, { number: 6 }]);

    // Sample count: apparently doesn't always return the expected number of results.
    await expect(() =>
      client.getExecutionResults(execution.execution_id, {
        sample_count: 2,
      }),
    ).not.toThrow();

    // Sort by:
    results = await client.getExecutionResults(execution.execution_id, {
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

    const resultCSV = await client.getResultCSV(execution.execution_id, { limit: 3 });
    expect(resultCSV.data).toEqual("number\n5\n6\n7\n");
  });

  it("gets Results (with limit)", async () => {
    const {
      results: { execution_id },
    } = await client.getLastExecutionResults(multiRowQuery);
    // expect basic query has completed after 5s
    const status = await client.getExecutionStatus(execution_id);
    expect(status.state).toEqual(ExecutionState.COMPLETED);
    const results = await client.getExecutionResults(execution_id, {
      limit: 2,
    });
    expect(results.result?.rows).toEqual([{ number: 3 }, { number: 4 }]);

    const resultCSV = await client.getResultCSV(execution_id, { limit: 3 });
    expect(resultCSV.data).toEqual("number\n3\n4\n5\n");
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
    // This execution was run with StartFrom = 1 on queryId = 3463180.
    const result = await client.getExecutionResults("01J6QN9Z16TP20YCWK6Z2TM0KJ", {
      limit: 2,
      offset: 1,
    });
    expect(result.result?.rows).toEqual([
      {
        number: 6,
      },
      {
        number: 7,
      },
    ]);

    const resultCSV = await client.getResultCSV("01J6QN9Z16TP20YCWK6Z2TM0KJ", {
      limit: 1,
      offset: 2,
    });
    const expectedRows = ["number\n", "7\n"];
    expect(resultCSV.data).toEqual(expectedRows.join(""));
  });
});

describe("ExecutionAPI: Errors", () => {
  // TODO these errors can't be reached because post method is private
  // {"error":"unknown parameters (undefined)"}
  // {"error":"Invalid request body payload"}
  let client: ExecutionAPI;

  beforeAll(() => {
    client = new ExecutionAPI(BASIC_KEY);
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

  it("fails with unhandled FAILED_TYPE_UNSPECIFIED when query won't compile", async () => {
    // Execute and check state
    // V1 query: 1348966
    const result = await client.getExecutionResults("01GEHG4AY1Z9JBR3BYB20E7RGH");
    expect(result.error).toEqual({
      type: "FAILED_TYPE_EXECUTION_FAILED",
      message:
        'column "x" does not exist at line 1, position 8 [Execution ID: 01GEHG4AY1Z9JBR3BYB20E7RGH]',
      metadata: { line: 1, column: 8 },
    });

    const result2 = await client.getExecutionResults("01GEHGXHQ25XWMVFJ4G2HZ5MGS");
    expect(result2.error).toEqual({
      type: "FAILED_TYPE_EXECUTION_FAILED",
      message:
        "{42000} [Simba][Hardy] (80) Syntax or semantic analysis error thrown in server while executing query. Error message from server: org.apache.hive.service.cli.HiveSQLException: Error running query: [UNRESOLVED_COLUMN] org.apache.spark.sql.AnalysisException: [UNRESOLVED_COLUMN] A column or function parameter with name `x` cannot be resolved. Did you mean one of the following? []; line [Execution ID: 01GEHGXHQ25XWMVFJ4G2HZ5MGS]",
    });
  });
});
