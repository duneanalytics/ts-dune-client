import { QueryParameter } from "./queryParameter";

export type RequestPayload =
  | ExecuteQueryPayload
  | UpdateQueryPayload
  | CreateQueryPayload;

export function payloadJSON(payload?: RequestPayload): string {
  if (payload !== undefined) {
    if ("query_parameters" in payload) {
      // Destructure to separate parameters and the rest of the payload
      const { query_parameters, ...rest } = payload;
      return JSON.stringify({
        ...rest,
        query_parameters: query_parameters
          ? QueryParameter.unravel(query_parameters)
          : [],
      });
    }
    return JSON.stringify(payload);
  }
  return "";
}

export interface ExecuteQueryPayload {
  query_parameters?: QueryParameter[];
}

export interface UpdateQueryPayload {
  name?: string;
  query_sql?: string;
  query_parameters?: QueryParameter[];
  description?: string;
  tags?: string[];
}

export interface CreateQueryPayload {
  name?: string;
  query_sql?: string;
  query_parameters?: QueryParameter[];
  is_private?: boolean;
}
