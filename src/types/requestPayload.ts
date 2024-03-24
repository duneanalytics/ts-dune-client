import { QueryParameter } from "./queryParameter";

/// Optional parameters for query exection.
export interface ExecutionParams {
  query_parameters?: QueryParameter[];
  performance?: ExecutionPerformance;
}

/// Choice of execution engine when executing query via API [default = medium]
export enum ExecutionPerformance {
  Medium = "medium",
  Large = "large",
}

export type UploadCSVArgs = {
  table_name: string;
  data: string;
  description?: string;
  is_private?: boolean;
};

/// Payload sent upon requests to Dune API.
export type RequestPayload =
  | GetResultParams
  | ExecuteQueryParams
  | UpdateQueryParams
  | CreateQueryParams
  | UploadCSVArgs;

/// Utility method used by router to parse request payloads.
export function payloadJSON(payload?: RequestPayload): string {
  return JSON.stringify(payloadRecords(payload));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function payloadRecords(payload?: RequestPayload): Record<string, any> {
  if (payload !== undefined) {
    if ("query_parameters" in payload) {
      // Destructure to separate parameters and the rest of the payload
      const { query_parameters, ...rest } = payload;
      return {
        ...rest,
        query_parameters: query_parameters
          ? QueryParameter.unravel(query_parameters)
          : [],
      };
    }
    return payload;
  }
  return {};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function payloadSearchParams(payload?: RequestPayload): Record<string, any> {
  if (payload !== undefined) {
    if ("query_parameters" in payload) {
      // Destructure to separate parameters and the rest of the payload
      const { query_parameters, ...rest } = payload;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: Record<string, any> = { ...rest };
      if (Array.isArray(payload.query_parameters)) {
        for (const qp of payload.query_parameters) {
          result[`params.${qp.name}`] = qp.value;
        }
      }
      return result;
    }
    return payload;
  }
  return {};
}

interface BaseParams {
  query_parameters?: QueryParameter[];
}

export interface GetResultParams extends BaseParams {
  /// Max number of returned results.
  limit?: number;
  /// Which row to start returning results from
  offset?: number;
  expectedId?: string;
}

export interface ExecuteQueryParams extends BaseParams {
  /// Execution engine performance medium (default) or large.
  performance: ExecutionPerformance;
}

/// Payload sent with query update requests.
export interface UpdateQueryParams extends BaseParams {
  /// Updated Name of the query.
  name?: string;
  /// Updated SQL of the query.
  query_sql?: string;
  /// Updated description of the query
  description?: string;
  /// Tags to be added (overrides existing tags).
  tags?: string[];
}

/// Payload sent with query creation requests.
export interface CreateQueryParams extends BaseParams {
  /// Name of query being created
  name?: string;
  /// Description of query being created
  description?: string;
  /// Raw SQL of query being created
  query_sql: string;
  /// Whether the query should be created as private.
  is_private?: boolean;
}
