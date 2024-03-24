import { QueryParameter } from "./queryParameter";
import { ExecutionParams } from "./requestPayload";

export interface Options {
  /// The page size when retriving results.
  batchSize?: number;
  /// How frequently should we check execution status
  pingFrequency?: number;
  maxAgeHours?: number;
}

export interface RunQueryArgs {
  /// ID of the query.
  queryId: number;
  params?: ExecutionParams;
  opts?: Options;
}

export interface LatestResultArgs {
  /// ID of the query.
  queryId: number;
  parameters?: QueryParameter[];
  opts?: Options;
}

export interface RunSqlArgs {
  /// raw sql of query to run (Trino/DuneSQL syntax)
  query_sql: string;
  /// Query execution parameters.
  params?: ExecutionParams;
  /// Name of created query.
  name?: string;
  /// Whether the created query should be private or not (default = true).
  isPrivate?: boolean;
  /// Whether the created query should be archived immediately after execution or not (default = true).
  archiveAfter?: boolean;
  /// Additional options execution options.
  opts?: Options;
}
