import { expect } from "chai";

import { DuneClient } from "../../src/client";
import {
  DuneError,
  ExecutionResponse,
  ExecutionState,
  GetStatusResponse,
} from "../../src/responseTypes";

const { DUNE_API_KEY } = process.env;
const apiKey: string = DUNE_API_KEY ? DUNE_API_KEY : "No API Key";

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

beforeEach(() => {
  console.log = function () {};
  console.debug = function () {};
  console.error = function () {};
});

describe("DuneClient: execute", () => {
  it("returns expected results on sequence execute-cancel-get_status", async () => {
    const client = new DuneClient(apiKey);
    // Long running query ID.
    const queryID = 1229120;
    // Execute and check state
    const execution = await client.execute(queryID);
    expect(execution.state).to.be.oneOf([
      ExecutionState.PENDING,
      ExecutionState.EXECUTING,
    ]);

    // Cancel execution and verify it was canceled.
    const canceled = await client.cancel_execution(execution.execution_id);
    expect(true).to.be.equal(canceled);

    // Get execution status
    const status = await client.get_status(execution.execution_id);
    const expectedStatus: GetStatusResponse = {
      state: ExecutionState.CANCELLED,
      execution_id: execution.execution_id,
      query_id: queryID,
    };
    expect(expectedStatus).to.be.deep.equal(status);
  });

  it("returns expected results on sequence execute-cancel-get_status", async () => {
    const client = new DuneClient(apiKey);
    // Execute and check state
    const cancelledExecutionId = "01GEHEC1W8P1V5ENF66R2WY54V";
    const result = await client.get_result(cancelledExecutionId);
    expect(result).to.deep.equal({
      execution_id: cancelledExecutionId,
      query_id: 1229120,
      state: "QUERY_STATE_CANCELLED",
      submitted_at: "2022-10-04T12:08:47.753527Z",
      expires_at: "2024-10-03T12:08:48.790332Z",
      execution_started_at: "2022-10-04T12:08:47.756608Z",
      execution_ended_at: "2022-10-04T12:08:48.790331Z",
      cancelled_at: "2022-10-04T12:08:48.790331Z",
    });
  });
});

describe("DuneClient: Errors", () => {
  it("returns invalid API key", async () => {
    const client = new DuneClient("Bad Key");
    await expectAsyncThrow(client.execute(1), "invalid API Key");
  });
  it("returns internal server error (queryId too large)", async () => {
    const client = new DuneClient(apiKey);
    await expectAsyncThrow(client.execute(999999999999999), "An internal error occured");
  });
  it("returns query not found error", async () => {
    const client = new DuneClient(apiKey);
    await expectAsyncThrow(client.execute(999999999), "Query not found");
    await expectAsyncThrow(client.execute(0), "Query not found");
  });
  it("returns invalid job id", async () => {
    const client = new DuneClient(apiKey);
    await expectAsyncThrow(client.execute(999999999), "Query not found");

    const invalidJobID = "Wonky Job ID";
    const expectedErrorMessage = `The requested execution ID (ID: ${invalidJobID}) is invalid.`;
    await expectAsyncThrow(client.get_status(invalidJobID), expectedErrorMessage);
    await expectAsyncThrow(client.get_result(invalidJobID), expectedErrorMessage);
    await expectAsyncThrow(client.cancel_execution(invalidJobID), expectedErrorMessage);
  });
  it("does not allow to execute private queries for other accounts.", async () => {
    const client = new DuneClient(apiKey);
    await expectAsyncThrow(
      client.execute(1348384),
      "User is not allowed to execute the query",
    );
  });
  it("fails with unhandled FAILED_TYPE_UNSPECIFIED when query won't compile", async () => {
    const client = new DuneClient(apiKey);
    // Execute and check state
    // V1 query: 1348966
    await expectAsyncThrow(
      client.get_result("01GEHG4AY1Z9JBR3BYB20E7RGH"),
      "FAILED_TYPE_UNSPECIFIED",
    );
    // V2 -query: :1349019
    await expectAsyncThrow(
      client.get_result("01GEHGXHQ25XWMVFJ4G2HZ5MGS"),
      "FAILED_TYPE_UNSPECIFIED",
    );
  });
});
