import {
  ExecutionResponseCSV,
  ExecutionResult,
  ExecutionState,
  ResultsResponse,
  concatResultCSV,
  concatResultResponse,
} from "../../src/";

describe("Type Concatenation", () => {
  it("concatResultCSV", async () => {
    const left = {
      data: "col_1\n1\n2\n",
      next_offset: 1,
      next_uri: "left",
    };
    const right: ExecutionResponseCSV = {
      data: "col_1\n3\n4\n",
      next_offset: 2,
      next_uri: "right",
    };

    const result = concatResultCSV(left, right);
    expect(result).toEqual({
      data: "col_1\n1\n2\n3\n4\n",
      next_offset: 2,
      next_uri: "right",
    });
  });

  it("concatResultResponse", async () => {
    const some_date = new Date("2022-10-04");
    const irrelevantFieldsForTest = {
      is_execution_finished: true,
      submitted_at: some_date,
      expires_at: some_date,
      execution_started_at: some_date,
      cancelled_at: some_date,
      execution_ended_at: some_date,
      query_id: 1,
      state: ExecutionState.COMPLETED,
    };

    const irrelevantMetaFields = {
      column_names: ["bob"],
      datapoint_count: 0,
      execution_time_millis: 0,
      pending_time_millis: 0,
      total_result_set_bytes: 3,
      total_row_count: 3,
    };

    const leftResult: ExecutionResult = {
      rows: [{ bob: 1 }],
      metadata: {
        result_set_bytes: 1,
        row_count: 1,
        ...irrelevantMetaFields,
      },
    };

    const rightResult: ExecutionResult = {
      rows: [{ bob: 2 }, { bob: 3 }],
      metadata: {
        result_set_bytes: 2,
        row_count: 2,
        ...irrelevantMetaFields,
      },
    };

    const left: ResultsResponse = {
      execution_id: "XYZ",
      next_offset: 0,
      next_uri: "left",
      result: leftResult,
      ...irrelevantFieldsForTest,
    };

    const right: ResultsResponse = {
      execution_id: "XYZ",
      next_offset: 1,
      next_uri: "right",
      result: rightResult,
      ...irrelevantFieldsForTest,
    };
    const result = concatResultResponse(left, right);

    expect(result).toEqual({
      execution_id: "XYZ",
      next_offset: 1,
      next_uri: "right",
      result: {
        rows: [...leftResult.rows, ...rightResult.rows],
        metadata: {
          result_set_bytes:
            leftResult.metadata.result_set_bytes + rightResult.metadata.result_set_bytes,
          row_count: leftResult.metadata.row_count + rightResult.metadata.row_count,
          ...irrelevantMetaFields,
        },
      },
      ...irrelevantFieldsForTest,
    });

    // Errors.
    left.execution_id = "Different";
    expect(() => concatResultResponse(left, right)).toThrow(
      `Can't combine results: ExecutionIds (${left.execution_id} != ${right.execution_id})`,
    );
    left.execution_id = right.execution_id;

    right.result = undefined;
    expect(() => concatResultResponse(left, right)).toThrow(
      `Can't combine results: Right Entry has no results`,
    );

    left.result = undefined;
    expect(() => concatResultResponse(left, right)).toThrow(
      `Can't combine results: Left Entry has no results`,
    );
  });
});
