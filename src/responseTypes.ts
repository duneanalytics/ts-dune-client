export enum ExecutionState {
  COMPLETED,
  EXECUTING,
  PENDING,
  CANCELLED,
  FAILED,
}

export type ExecutionResponse = {
  executionID: string;
  state: ExecutionState;
};

// TODO - Use camelCase!
export type TimeData = {
  submitted_at: Date;
  execution_started_at?: Date;
  execution_ended_at?: Date;
  // only exists when we have result data
  expires_at?: Date;
  // only exists for cancelled executions
  cancelled_at: Date;
};

export type ResultMetaData = {
  column_names: string[];
  result_set_bytes: number;
  total_row_count: number;
  datapoint_count: number;
  pending_time_millis: number;
  execution_time_millis: number;
};

export type GetStatusResponse = {
  executionID: string;
  queryID: number;
  state: ExecutionState;
  // TODO - add these after
  // times: TimeData;
  // queuePosition?: number;
  // Exists when state COMPLETED
  // resultMetaData?: ResultMetaData;
};

export type ExecutionResult = {
  rows: Map<string, string>[];
  metadata: ResultMetaData;
};

export type ResultsResponse = {
  executionID: string;
  queryID: number;
  state: ExecutionState;
  // times: TimeData
  // only present when state is COMPLETE
  result?: ExecutionResult;
};
