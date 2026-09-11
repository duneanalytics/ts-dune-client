import assert from "assert";
import { QueryParameter } from "./queryParameter";

/// Optional parameters for query exection.
export interface ExecutionParams {
  query_parameters?: QueryParameter[];
  performance?: QueryEngine;
}

/// Choice of execution engine when executing query via API [default = medium]
export enum QueryEngine {
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
  | ExecuteSqlParams
  | UpdateQueryParams
  | CreateQueryParams
  | UploadCSVArgs
  | CreateTableArgs
  | InsertTableArgs
  | DecodeContractsArgs
  | Buffer;

type RequestRecord = Record<string, unknown>;
type NonBufferRequestPayload = Exclude<RequestPayload, Buffer>;

function isRecord(value: unknown): value is RequestRecord {
  return typeof value === "object" && value !== null && !Buffer.isBuffer(value);
}

function isQueryParameterArray(value: unknown): value is QueryParameter[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.name === "string" &&
        typeof item.type === "string" &&
        typeof item.value === "string",
    )
  );
}

/// Utility method used by the router to serialize request payloads.
export function payloadJSON(payload?: RequestPayload): string {
  if (payload === undefined) {
    return "{}";
  }
  if (Buffer.isBuffer(payload)) {
    return JSON.stringify(payload);
  }
  return JSON.stringify(payloadRecords(payload));
}

function payloadRecords(payload: NonBufferRequestPayload): RequestRecord {
  if (!isRecord(payload)) {
    return {};
  }

  if ("query_parameters" in payload) {
    const { query_parameters, ...rest } = payload;
    if (query_parameters !== undefined && !isQueryParameterArray(query_parameters)) {
      throw new TypeError(
        "Invalid query_parameters format: expected an array of QueryParameter objects",
      );
    }
    return {
      ...rest,
      query_parameters:
        query_parameters !== undefined ? QueryParameter.unravel(query_parameters) : [],
    };
  }

  return payload;
}

function toSearchParams(payload: RequestRecord): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) {
      result[key] = String(value);
    }
  }
  return result;
}

/**
 * Converts all arguments into a format that can be used as URL search parameters for GET requests.
 */
export function payloadSearchParams(payload?: RequestPayload): Record<string, string> {
  if (payload === undefined || Buffer.isBuffer(payload) || !isRecord(payload)) {
    return {};
  }

  const record: RequestRecord = payload;
  const { query_parameters, ...rest } = record;
  const result = toSearchParams(rest);

  if (query_parameters !== undefined) {
    if (!isQueryParameterArray(query_parameters)) {
      throw new TypeError(
        "Invalid query_parameters format: expected an array of QueryParameter objects",
      );
    }
    for (const queryParameter of query_parameters) {
      result[`params.${queryParameter.name}`] = queryParameter.value;
    }
  }

  return result;
}

interface BaseParams {
  query_parameters?: QueryParameter[];
}

export interface GetResultParams extends BaseParams {
  /// Limit number of rows to return.
  /// This together with 'offset' allows easy pagination through results in an incremental and efficient way.
  /// This parameter is incompatible with sampling (`sample_count`).
  limit?: number;
  /// Offset row number to start (inclusive, first row means offset=0) returning results from.
  /// This together with 'limit' allows easy pagination through results.
  /// This parameter is incompatible with sampling (`sample_count`).
  offset?: number;
  /// Number of rows to return from the result by sampling the data.
  /// This is useful when you want to get a uniform sample instead of the entire result.
  /// If the result has less than the sample count, the entire result is returned.
  /// Note that this will return a randomized sample, so not every call will return the same result.
  /// This parameter is incompatible with `offset`, `limit`, and `filters` parameters.
  sample_count?: number;
  /// Expression to filter out rows from the results to return.
  /// This expression is similar to a SQL WHERE clause.
  /// More details about it in the [Filtering](https://docs.dune.com/api-reference/executions/filtering) section of the doc.
  /// This parameter is incompatible with `sample_count`.
  filters?: string;
  /// Expression to define the order in which the results should be returned.
  /// This expression is similar to a SQL ORDER BY clause.
  /// More details about it in the [Sorting](https://docs.dune.com/api-reference/executions/sorting) section of the doc.
  sort_by?: string[] | string;
  /// Specified columns to be returned. If omitted, all columns are included.
  /// Tip: use this to limit the result to specific columns, reducing datapoints cost of the call.
  columns?: string[] | string;
}

/**
 * Custom API parameters for creating and managing custom endpoints.
 * Extends GetResultParams but omits 'query_parameters'.
 *
 * @extends {Omit<GetResultParams, "query_parameters">}
 */
export interface CustomAPIParams extends Omit<GetResultParams, "query_parameters"> {
  /**
   * The team or user handle owning the custom endpoint.
   */
  handle: string;
  /**
   * Custom endpoint slug.
   */
  slug: string;
}

export function validateAndBuildGetResultParams({
  limit,
  offset,
  sample_count,
  filters,
  sort_by,
  columns,
  query_parameters,
}: GetResultParams): GetResultParams {
  assert(
    sample_count === undefined ||
      (limit === undefined && offset === undefined && filters === undefined),
    "sampling cannot be combined with filters or pagination",
  );
  if (columns !== undefined) {
    if (typeof columns === "string") {
      columns = columns.split(",");
    }
    const output: string[] = columns.map((column) => {
      // Check if the column contains quotes
      if (column.includes('"')) {
        // Escape quotes and add quotes around the entire string
        return `"${column.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
      } else {
        // Leave the column unchanged
        return column;
      }
    });

    columns = output.join(",");
  }
  if (sort_by !== undefined && Array.isArray(sort_by)) {
    sort_by = sort_by.join(",");
  }
  query_parameters = query_parameters || [];
  return {
    // It used to be the case that limit was required,
    // but now that they have introduced some other filters that
    // are incompatible with this field, it is no longer required.
    // It is becomes required again later, we will need to use withDefaults here.
    limit,
    offset,
    sample_count,
    filters,
    sort_by,
    columns,
    query_parameters,
  };
}

export interface ExecuteQueryParams extends BaseParams {
  /// The performance engine tier the execution will be run on.
  /// Can be either medium or large.
  /// Medium consumes 10 credits, and large consumes 20 credits, per run.
  /// Default is medium.
  performance: QueryEngine;
}

export interface ExecuteSqlParams {
  /// The SQL query to execute
  sql: string;
  /// The performance engine tier the execution will be run on
  performance?: QueryEngine;
}

export interface PipelineExecutionParams {
  performance?: QueryEngine;
}

export interface BaseCRUDParams extends BaseParams {
  /// Description of the query.
  description?: string;
  /// Name of the query.
  name?: string;
  /// The SQL query text.
  query_sql: string;
}

/// Payload sent with query update requests.
export interface UpdateQueryParams extends BaseCRUDParams {
  /// Tags to be added (overrides existing tags).
  tags?: string[];
}

/// Payload sent with query creation requests.
export interface CreateQueryParams extends BaseCRUDParams {
  /// Indicates if the query is private.
  is_private?: boolean;
}

// https://docs.dune.com/api-reference/tables/endpoint/create#body-schema-type
export enum ColumnType {
  Varchar = "varchar",
  Varbinary = "varbinary",
  Uint256 = "uint256",
  Int256 = "int256",
  Bigint = "bigint",
  Integer = "integer",
  Double = "double",
  Boolean = "boolean",
  Timestamp = "timestamp",
  Date = "date",
}

// https://docs.dune.com/api-reference/tables/endpoint/create#body-schema
export interface SchemaRecord {
  /// The column name. Can contain letters, numbers, and underscores,
  /// but must begin with a letter or an underscore.
  name: string;
  /// The column type.
  type: ColumnType;
  nullable?: boolean;
}

export interface DeleteTableArgs {
  /// The namespace of the table to delete (e.g. my_user).
  namespace: string;
  /// The name of the table to delete (e.g. interest_rates).
  table_name: string;
}

export interface CreateTableArgs {
  /// A description of the table.
  description?: string;
  /// If true, the table will be private.
  /// If private it is only visible to the team or user that your API key is associated with.
  is_private?: boolean;
  /// The namespace of the table to create.
  /// Must be the name of your associated API key, i.e. either `my_user` or `my_team`.
  namespace: string;
  /// An ordered list of columns that define the table schema. Cannot be empty.
  schema: SchemaRecord[];
  /// The name of the table to create.
  /// Must begin with a lowercase letter and contain only lowercase letters,
  /// digits, and underscores.
  table_name: string;
}

/**
 * All supported API content types
 */
export enum ContentType {
  Json = "application/json",
  Csv = "text/csv",
  NDJson = "application/x-ndjson",
}

export interface InsertTableArgs {
  /// The namespace of the table to insert into (e.g. `my_user`).
  namespace: string;
  /// The name of the table to insert into (e.g. `interest_rates`).
  table_name: string;
  /// The body is of type file.
  data: Buffer;
  content_type: ContentType;
}

export interface ListDatasetsArgs {
  /// Number of results to return (default 50, max 250)
  limit?: number;
  /// Offset for pagination
  offset?: number;
  /// Filter by owner handle
  owner_handle?: string;
  /// Filter by dataset types (comma-separated: transformation_view, transformation_table, uploaded_table, decoded_table, spell, dune_table)
  type?: string;
}

export interface ListUploadsArgs {
  /// Number of tables to return on a page. Default: 50, max: 10000
  limit?: number;
  /// Offset used for pagination. Negative values are treated as 0
  offset?: number;
}

export interface ClearTableArgs {
  /// The namespace of the table to clear (e.g. my_user).
  namespace: string;
  /// The name of the table to clear (e.g. interest_rates).
  table_name: string;
}

export interface Options {
  /// The page size when retriving results.
  batchSize?: number;
  /// How frequently should we check execution status
  pingFrequency?: number;
  /// Determines result expiry date.
  maxAgeHours?: number;
}

export interface RunQueryArgs extends GetResultParams, ExecutionParams {
  /// ID of the query.
  queryId: number;
  opts?: Options;
}

export interface LatestResultArgs {
  /// ID of the query.
  queryId: number;
  parameters?: QueryParameter[];
  opts?: Options;
}

export interface RunSqlArgs extends ExecutionParams {
  /// raw sql of query to run (Trino/DuneSQL syntax)
  query_sql: string;
  /// Name of created query.
  name?: string;
  /// Whether the created query should be private or not (default = true).
  isPrivate?: boolean;
  /// Whether the created query should be archived immediately after execution or not (default = true).
  archiveAfter?: boolean;
  /// Additional options execution options.
  opts?: Options;
}

/// The kind of change a contract decoding submission describes.
export type ContractSubmissionType = "new" | "upgrade" | "rename" | "delete" | "other";

/// Lifecycle status of a contract decoding submission.
export type ContractSubmissionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "processed"
  | "in_progress"
  | "cancelled"
  | "needs_manual_review";

/// One contract to submit for decoding. Mirrors the form at https://dune.com/contracts/new.
export interface ContractSubmissionInput {
  /// Chain the contract is deployed on, e.g. "ethereum", "base"
  blockchain_name: string;
  /// Contract address (hex for EVM chains)
  address: string;
  /// Project (namespace) the decoded tables are grouped under
  project_name: string;
  /// Contract name used in the decoded table names
  contract_name: string;
  /// The ABI, either as its JSON array of fragments or as a JSON string containing it
  abi: readonly unknown[] | string;
  /// The contract is a dynamic contract with several instances sharing one ABI
  has_multiple_instances?: boolean;
  /// The instances are created by a factory contract
  is_created_by_factory?: boolean;
  /// The ABI was written or edited by hand rather than fetched from an explorer
  is_manual_abi?: boolean;
  /// The address is a proxy; the ABI belongs to its implementation
  is_proxy?: boolean;
  /// Defaults to "new". Upgrades, renames, deletions and other always go to manual review
  submission_type?: ContractSubmissionType;
  /// Why the contract is being resubmitted. Required for "delete" and "other"
  resubmission_reason?: string;
  /// Current project name; required for "rename"
  old_project_name?: string;
  /// Current contract name; required for "rename"
  old_contract_name?: string;
  /// Client-chosen key, unique per account, that makes the item safe to retry
  idempotency_key?: string;
}

export interface DecodeContractsArgs {
  /// Between 1 and 100 contracts to submit
  submissions: ContractSubmissionInput[];
}

export interface ListContractSubmissionsArgs {
  /// Number of results to return (default 50, max 250)
  limit?: number;
  /// `next_cursor` from a previous response, to fetch the next page
  cursor?: string;
  /// Filter by blockchain, e.g. "ethereum"
  blockchain_name?: string;
  /// Filter by contract address
  address?: string;
  /// Filter by project (namespace) name
  project_name?: string;
  /// Filter by contract name
  contract_name?: string;
  /// Filter by submission status
  status?: ContractSubmissionStatus;
}
