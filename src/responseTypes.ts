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

export interface ExecutionResponse {
  execution_id: string;
  state: ExecutionState;
}

export interface TimeData {
  submitted_at: Date;
  execution_started_at?: Date;
  execution_ended_at?: Date;
  // only exists when we have result data
  expires_at?: Date;
  // only exists for cancelled executions
  cancelled_at?: Date;
}

export interface ResultMetadata {
  column_names: string[];
  result_set_bytes: number;
  total_row_count: number;
  datapoint_count: number;
  pending_time_millis: number;
  execution_time_millis: number;
}

interface BaseStatusResponse extends TimeData {
  execution_id: string;
  query_id: number;
}
interface IncompleteStatusResponse extends BaseStatusResponse {
  state: Exclude<ExecutionState, ExecutionState.COMPLETED>;
  // TODO - lift Queue Position into base.
  queue_position?: number;
}
interface CompleteStatusResponse extends BaseStatusResponse {
  state: ExecutionState.COMPLETED;
  queue_position?: number;
  result_metadata: ResultMetadata;
}

export type GetStatusResponse = IncompleteStatusResponse | CompleteStatusResponse;

export interface ExecutionResult {
  rows: Record<string, unknown>[];
  metadata: ResultMetadata;
}

export interface ResultsResponse extends TimeData {
  execution_id: string;
  query_id: number;
  state: ExecutionState;
  // only present when state is COMPLETE
  result?: ExecutionResult;
}
