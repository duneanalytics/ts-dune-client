import {
  ExecutionResponse,
  GetStatusResponse,
  ResultsResponse,
  QueryParameter,
  ExecutionResponseCSV,
  concatResultResponse,
  concatResultCSV,
  SuccessResponse,
  LatestResultsResponse,
  ExecutionParams,
  QueryEngine,
  GetResultParams,
  validateAndBuildGetResultParams,
} from "../types";
import log from "loglevel";
import { ageInHours, logPrefix } from "../utils";
import { Router } from "./router";
import { deprecationWarning } from "../deprecation";
import {
  DEFAULT_GET_PARAMS,
  DUNE_CSV_NEXT_OFFSET_HEADER,
  DUNE_CSV_NEXT_URI_HEADER,
  THREE_MONTHS_IN_HOURS,
} from "../constants";

/**
 * This class implements all the routes defined in the Dune API Docs:
 * https://docs.dune.com/api-reference/executions/execution-object
 */
export class ExecutionAPI extends Router {
  /**
   * Executes query by ID according to:
   * https://docs.dune.com/api-reference/executions/endpoint/execute-query
   * @param {number} queryID id of query to be executed.
   * @param {ExecutionParams} params including query parameters and execution performance.
   * @returns {ExecutionResponse} response containing execution ID and state.
   */
  async executeQuery(
    queryID: number,
    params: ExecutionParams = {},
  ): Promise<ExecutionResponse> {
    // Extract possible ExecutionParams
    const { query_parameters = [], performance = QueryEngine.Medium } = params;

    const response = await this.post<ExecutionResponse>(`query/${queryID}/execute`, {
      query_parameters,
      performance,
    });
    log.debug(logPrefix, `execute response ${JSON.stringify(response)}`);
    return response as ExecutionResponse;
  }

  /**
   * Cancels an execution according to:
   * https://docs.dune.com/api-reference/executions/endpoint/cancel-execution
   * @param {string} executionId string representig ID of query execution.
   * @returns {boolean} indicating if success of cancellation request.
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const { success } = await this.post<SuccessResponse>(
      `execution/${executionId}/cancel`,
    );
    return success;
  }

  /**
   * Retrieve the status of a query execution by executionID:
   * https://docs.dune.com/api-reference/executions/endpoint/get-execution-status
   * @param {string} executionId string representig ID of query execution.
   * @returns {GetStatusResponse} status of query execution.
   */
  async getExecutionStatus(executionId: string): Promise<GetStatusResponse> {
    const response: GetStatusResponse = await this._get(
      `execution/${executionId}/status`,
    );
    log.debug(logPrefix, `get_status response ${JSON.stringify(response)}`);
    return response as GetStatusResponse;
  }

  /**
   * Retrieve results of a query execution by executionID:
   * https://docs.dune.com/api-reference/executions/endpoint/get-execution-result
   * @param {string} executionId string representig ID of query execution
   * @param {GetResultParams} params including limit, offset
   * @returns {ResultsResponse} response containing execution results.
   */
  async getExecutionResults(
    executionId: string,
    params: GetResultParams = DEFAULT_GET_PARAMS,
  ): Promise<ResultsResponse> {
    const response: ResultsResponse = await this._get(
      `execution/${executionId}/results`,
      validateAndBuildGetResultParams(params),
    );
    log.debug(logPrefix, `get_result response ${JSON.stringify(response)}`);
    return response as ResultsResponse;
  }

  /**
   * Retrieve results of a query execution (in CSV format) by executionID:
   * https://docs.dune.com/api-reference/executions/endpoint/get-execution-result-csv
   * @param {string} executionId string representig ID of query execution.
   * @param {GetResultParams} params including limit, offset
   * @returns {ExecutionResponseCSV} execution results as CSV.
   */
  async getResultCSV(
    executionId: string,
    params: GetResultParams = DEFAULT_GET_PARAMS,
  ): Promise<ExecutionResponseCSV> {
    const response = await this._get<Response>(
      `execution/${executionId}/results/csv`,
      validateAndBuildGetResultParams(params),
      true,
    );
    log.debug(logPrefix, `get_result response ${JSON.stringify(response)}`);
    return this.buildCSVResponse(response);
  }

  /**
   * Retrieves results from query's last execution
   * @param {number} queryID id of query to get results for.
   * @param {GetResultParams} params parameters for retrieval.
   * @param {number} expiryAgeHours  What is considered to be an expired result set.
   * @returns {LatestResultsResponse} response containing execution results and boolean field
   */
  async getLastExecutionResults(
    queryId: number,
    params: GetResultParams = DEFAULT_GET_PARAMS,
    /// What is considered to be an expired result set.
    expiryAgeHours: number = THREE_MONTHS_IN_HOURS,
  ): Promise<LatestResultsResponse> {
    // The first bit might only return a page.
    const results = await this._get<ResultsResponse>(
      `query/${queryId}/results`,
      validateAndBuildGetResultParams(params),
    );
    const lastRun: Date = results.execution_ended_at!;
    const maxAge = expiryAgeHours;
    const isExpired = lastRun !== undefined && ageInHours(lastRun) > maxAge;
    return { results: await this._fetchEntireResult(results), isExpired };
  }

  /**
   * Retrieves results from query's last execution (in CSV format)
   * @param {number} queryID id of query to get results for.
   * @param {GetResultParams} params parameters for retrieval.
   * @returns {ExecutionResponseCSV} execution results as CSV.
   */
  async getLastResultCSV(
    queryId: number,
    params: GetResultParams = DEFAULT_GET_PARAMS,
  ): Promise<ExecutionResponseCSV> {
    const response = await this._get<Response>(
      `query/${queryId}/results/csv`,
      validateAndBuildGetResultParams(params),
      true,
    );
    return this._fetchEntireResultCSV(await this.buildCSVResponse(response));
  }

  /**
   * Private method used for building CSV responses.
   */
  private async buildCSVResponse(response: Response): Promise<ExecutionResponseCSV> {
    const nextOffset = response.headers.get(DUNE_CSV_NEXT_OFFSET_HEADER);
    return {
      data: await response.text(),
      next_uri: response.headers.get(DUNE_CSV_NEXT_URI_HEADER),
      next_offset: nextOffset ? parseInt(nextOffset) : undefined,
    };
  }

  /**
   * Private method used for retrieving entire result via pagination.
   */
  private async _fetchEntireResult(results: ResultsResponse): Promise<ResultsResponse> {
    let next_uri = results.next_uri;
    let batch: ResultsResponse;
    while (next_uri !== undefined) {
      batch = await this._getByUrl<ResultsResponse>(next_uri);
      results = concatResultResponse(results, batch);
      next_uri = batch.next_uri;
    }
    return results;
  }

  /**
   * Private method used for retrieving entire result CSV via pagination.
   */
  private async _fetchEntireResultCSV(
    results: ExecutionResponseCSV,
  ): Promise<ExecutionResponseCSV> {
    let next_uri = results.next_uri;
    let batch: ExecutionResponseCSV;
    while (next_uri !== null) {
      batch = await this.buildCSVResponse(
        await this._getByUrl<Response>(next_uri!, undefined, true),
      );
      results = concatResultCSV(results, batch);
      next_uri = batch.next_uri;
    }
    return results;
  }

  /**
   * @deprecated since version 0.0.2 Use executeQuery
   */
  async execute(
    queryID: number,
    parameters?: QueryParameter[],
  ): Promise<ExecutionResponse> {
    deprecationWarning("execute", "executeQuery", "0.0.2");
    return this.executeQuery(queryID, { query_parameters: parameters });
  }

  /**
   * @deprecated since version 0.0.2 Use getExecutionStatus
   */
  async getStatus(jobID: string): Promise<GetStatusResponse> {
    deprecationWarning("getStatus", "getExecutionStatus", "0.0.2");
    return this.getExecutionStatus(jobID);
  }

  /**
   * @deprecated since version 0.0.2 Use getExecutionResults
   */
  async getResult(jobID: string): Promise<ResultsResponse> {
    deprecationWarning("getResult", "getExecutionResults", "0.0.2");
    return this.getExecutionResults(jobID);
  }
}
