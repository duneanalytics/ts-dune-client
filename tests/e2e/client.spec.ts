import { expect } from "chai";
import {
  DuneClient,
  QueryParameter,
  ExecutionState,
  DuneError,
  QueryAPI,
} from "../../src/";
import log from "loglevel";
import { ExecutionPerformance } from "../../src/types/requestPayload";

const { DUNE_API_KEY } = process.env;
const apiKey: string = DUNE_API_KEY ? DUNE_API_KEY : "No API Key";

log.setLevel("silent", true);

const expectAsyncThrow = async (promise: Promise<any>, message?: string | object) => {
  try {
    await promise;
    // Make sure to fail if promise does resolve!
    expect(false).to.be.equal(true);
  } catch (error) {
    if (message) {
      expect(error.message).to.be.deep.equal(message);
      expect(error).instanceOf(DuneError);
    } else {
      expect(error).instanceOf(DuneError);
    }
  }
};

describe("DuneClient: native routes", () => {
  // This doesn't work if run too many times at once:
  // https://discord.com/channels/757637422384283659/1019910980634939433/1026840715701010473
  it("returns expected results on sequence execute-cancel-get_status", async () => {
    const client = new DuneClient(apiKey);
    // Long running query ID.
    const queryID = 1229120;
    // Execute and check state
    const execution = await client.executeQuery(queryID);
    expect(execution.state).to.be.oneOf([
      ExecutionState.PENDING,
      ExecutionState.EXECUTING,
    ]);

    // Cancel execution and verify it was canceled.
    const canceled = await client.cancelExecution(execution.execution_id);
    expect(canceled).to.be.true;

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
    expect(expectedStatus).to.be.deep.equal(strippedStatus);
  });

  it("successfully executes with query parameters", async () => {
    const client = new DuneClient(apiKey);
    const queryID = 1215383;
    const parameters = [
      QueryParameter.text("TextField", "Plain Text"),
      QueryParameter.number("NumberField", 3.1415926535),
      QueryParameter.date("DateField", "2022-05-04 00:00:00"),
      QueryParameter.enum("ListField", "Option 1"),
    ];
    // Execute and check state
    const execution = await client.executeQuery(queryID, {
      query_parameters: parameters,
    });
    expect(execution.execution_id).is.not.null;
  });

  it("execute with Large tier performance", async () => {
    const client = new DuneClient(apiKey);
    const execution = await client.executeQuery(1215383, {
      performance: ExecutionPerformance.Large,
    });
    expect(execution.execution_id).is.not.null;
  });

  it("returns expected results on cancelled query exection", async () => {
    const client = new DuneClient(apiKey);
    // Execute and check state
    const cancelledExecutionId = "01GEHEC1W8P1V5ENF66R2WY54V";
    const result = await client.getExecutionResults(cancelledExecutionId);
    expect(result).to.deep.equal({
      execution_id: cancelledExecutionId,
      query_id: 1229120,
      state: "QUERY_STATE_CANCELLED",
      // TODO - this is a new field - not present in our type interfaces.
      is_execution_finished: true,
      submitted_at: "2022-10-04T12:08:47.753527Z",
      expires_at: "2024-10-03T12:08:48.790332Z",
      execution_started_at: "2022-10-04T12:08:47.756608Z",
      execution_ended_at: "2022-10-04T12:08:48.790331Z",
      cancelled_at: "2022-10-04T12:08:48.790331Z",
    });
  });
});

describe("DuneClient Extensions: refresh", () => {
  it("execute runQuery", async () => {
    const client = new DuneClient(apiKey);
    // https://dune.com/queries/1215383
    const results = await client.runQuery(1215383, [
      QueryParameter.text("TextField", "Plain Text"),
    ]);
    expect(results.result?.rows).to.be.deep.equal([
      {
        date_field: "2022-05-04 00:00:00.000",
        list_field: "Option 1",
        number_field: "3.1415926535",
        text_field: "Plain Text",
      },
    ]);
  });

  it("getsLatestResults", async () => {
    const client = new DuneClient(apiKey);
    // https://dune.com/queries/1215383
    const results = await client.getLatestResult(1215383, [
      QueryParameter.text("TextField", "Plain Text"),
    ]);
    expect(results.result?.rows.length).to.be.greaterThan(0);
  });
});

describe("Premium: CRUD Operations", () => {
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

describe("DuneClient: Errors", () => {
  // TODO these errors can't be reached because post method is private
  // {"error":"unknown parameters (undefined)"}
  // {"error":"Invalid request body payload"}

  it("returns invalid API key", async () => {
    const client = new DuneClient("Bad Key");
    await expectAsyncThrow(client.executeQuery(1), "invalid API Key");
  });
  it("returns Invalid request path (queryId too large)", async () => {
    const client = new DuneClient(apiKey);
    await expectAsyncThrow(
      client.executeQuery(99999999999999999999999999),
      "Invalid request path",
    );
  });
  it("returns query not found error", async () => {
    const client = new DuneClient(apiKey);
    await expectAsyncThrow(client.executeQuery(999999999), "Query not found");
    await expectAsyncThrow(client.executeQuery(0), "Query not found");
  });
  it("returns invalid job id", async () => {
    const client = new DuneClient(apiKey);
    await expectAsyncThrow(client.executeQuery(999999999), "Query not found");

    const invalidJobID = "Wonky Job ID";
    const expectedErrorMessage = `The requested execution ID (ID: ${invalidJobID}) is invalid.`;
    await expectAsyncThrow(client.getExecutionStatus(invalidJobID), expectedErrorMessage);
    await expectAsyncThrow(
      client.getExecutionResults(invalidJobID),
      expectedErrorMessage,
    );
    await expectAsyncThrow(client.cancelExecution(invalidJobID), expectedErrorMessage);
  });
  it("fails execute with unknown query parameter", async () => {
    const client = new DuneClient(apiKey);
    const queryID = 1215383;
    const invalidParameterName = "Invalid Parameter Name";
    await expectAsyncThrow(
      client.executeQuery(queryID, {
        query_parameters: [QueryParameter.text(invalidParameterName, "")],
      }),
      `unknown parameters (${invalidParameterName})`,
    );
  });
  it("does not allow to execute private queries for other accounts.", async () => {
    const client = new DuneClient(apiKey);
    await expectAsyncThrow(client.executeQuery(1348384), "Query not found");
  });
  it("fails with unhandled FAILED_TYPE_UNSPECIFIED when query won't compile", async () => {
    const client = new DuneClient(apiKey);
    // Execute and check state
    // V1 query: 1348966
    await expectAsyncThrow(
      client.getExecutionResults("01GEHG4AY1Z9JBR3BYB20E7RGH"),
      "FAILED_TYPE_EXECUTION_FAILED",
    );
    // V2 -query: :1349019
    await expectAsyncThrow(
      client.getExecutionResults("01GEHGXHQ25XWMVFJ4G2HZ5MGS"),
      "FAILED_TYPE_EXECUTION_FAILED",
    );
  });
});
