export class DuneError extends Error {
  constructor(msg: string) {
    super(msg);
    Object.setPrototypeOf(this, DuneError.prototype);
  }
}

export enum ExecutionState {
  COMPLETED = "QUERY_STATE_COMPLETED",
  EXECUTING = "QUERY_STATE_EXECUTING",
  PENDING = "QUERY_STATE_PENDING",
  CANCELLED = "QUERY_STATE_CANCELLED",
  FAILED = "QUERY_STATE_FAILED",
}

export type ExecutionResponse = {
  execution_id: string;
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
  cancelled_at?: Date;
};

export type ResultMetadata = {
  column_names: string[];
  result_set_bytes: number;
  total_row_count: number;
  datapoint_count: number;
  pending_time_millis: number;
  execution_time_millis: number;
};

export type GetStatusResponse = {
  execution_id: string;
  query_id: number;
  state: ExecutionState;
  // TODO - add these after
  // times: TimeData;
  // queue_position?: number;
  // Exists when state COMPLETED
  // result_metadata?: ResultMetadata;
};

export type ExecutionResult = {
  rows: Map<string, string>[];
  metadata: ResultMetadata;
};

export type ResultsResponse = {
  execution_id: string;
  query_id: number;
  state: ExecutionState;
  // times: TimeData
  // only present when state is COMPLETE
  result?: ExecutionResult;
};
