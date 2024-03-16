import {
  ExecutionResponse,
  GetStatusResponse,
  ResultsResponse,
  QueryParameter,
  ExecutionResponseCSV,
  concatResultResponse,
  concatResultCSV,
  SuccessResponse,
} from "../types";
import log from "loglevel";
import { logPrefix } from "../utils";
import { Router } from "./router";
import {
  ExecutionParams,
  ExecutionPerformance,
  GetResultParams,
} from "../types/requestPayload";
import {
  DEFAULT_GET_PARAMS,
  DUNE_CSV_NEXT_OFFSET_HEADER,
  DUNE_CSV_NEXT_URI_HEADER,
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
    params?: ExecutionParams,
  ): Promise<ExecutionResponse> {
    // Extract possible ExecutionParams
    let query_parameters: QueryParameter[] = [];
    let performance = ExecutionPerformance.Medium;
    if (params !== undefined) {
      query_parameters = params.query_parameters ? params.query_parameters : [];
      performance = performance ? performance : ExecutionPerformance.Medium;
    }

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
   * @param {GetResultParams} params including limit, offset and expectedID.
   * @returns {ResultsResponse} response containing execution results.
   */
  async getExecutionResults(
    executionId: string,
    params: GetResultParams = DEFAULT_GET_PARAMS,
  ): Promise<ResultsResponse> {
    const response: ResultsResponse = await this._get(
      `execution/${executionId}/results`,
      params,
    );
    log.debug(logPrefix, `get_result response ${JSON.stringify(response)}`);
    return response as ResultsResponse;
  }

  /**
   * Retrieve results of a query execution (in CSV format) by executionID:
   * https://docs.dune.com/api-reference/executions/endpoint/get-execution-result-csv
   * @param {string} executionId string representig ID of query execution.
   * @param {GetResultParams} params including limit, offset and expectedID.
   * @returns {ExecutionResponseCSV} execution results as CSV.
   */
  async getResultCSV(
    executionId: string,
    params: GetResultParams = DEFAULT_GET_PARAMS,
  ): Promise<ExecutionResponseCSV> {
    const response = await this._get<Response>(
      `execution/${executionId}/results/csv`,
      params,
      true,
    );
    log.debug(logPrefix, `get_result response ${JSON.stringify(response)}`);
    return this.buildCSVResponse(response);
  }

  /**
   * Retrieves results from query's last execution
   * @param {number} queryID id of query to get results for.
   * @param {GetResultParams} params parameters for retrieval.
   * @returns {ResultsResponse} response containing execution results.
   */
  async getLastExecutionResults(
    queryId: number,
    params: GetResultParams = DEFAULT_GET_PARAMS,
  ): Promise<ResultsResponse> {
    // The first bit might only return a page.
    const results = await this._get<ResultsResponse>(`query/${queryId}/results`, params);
    return this._fetchEntireResult(results);
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
      params,
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
    return this.executeQuery(queryID, { query_parameters: parameters });
  }

  /**
   * @deprecated since version 0.0.2 Use getExecutionStatus
   */
  async getStatus(jobID: string): Promise<GetStatusResponse> {
    return this.getExecutionStatus(jobID);
  }

  /**
   * @deprecated since version 0.0.2 Use getExecutionResults
   */
  async getResult(jobID: string): Promise<ResultsResponse> {
    return this.getExecutionResults(jobID);
  }
}
