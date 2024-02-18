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

/// Payload sent upon requests to Dune API.
export type RequestPayload =
  | GetResultPayload
  | ExecuteQueryPayload
  | UpdateQueryPayload
  | CreateQueryPayload;

/// Utility method used by router to parse request payloads.
export function payloadJSON(payload?: RequestPayload): string {
  return JSON.stringify(payloadRecords(payload));
}

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

export function payloadSearchParams(payload?: RequestPayload): Record<string, any> {
  if (payload !== undefined) {
    if ("query_parameters" in payload) {
      // Destructure to separate parameters and the rest of the payload
      const { query_parameters, ...rest } = payload;
      let result: Record<string, any> = { ...rest };
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

interface BasePayload {
  query_parameters?: QueryParameter[];
}

export interface GetResultPayload extends BasePayload {
  limit?: number;
  offset?: number;
  expectedId?: string;
}

export interface ExecuteQueryPayload extends BasePayload {
  performance: string;
}

/// Payload sent with query update requests.
export interface UpdateQueryPayload extends BasePayload {
  name?: string;
  query_sql?: string;
  description?: string;
  tags?: string[];
}

/// Payload sent with query creation requests.
export interface CreateQueryPayload extends BasePayload {
  name?: string;
  query_sql?: string;
  is_private?: boolean;
}
