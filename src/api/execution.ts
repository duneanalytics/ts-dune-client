import {
  ExecutionResponse,
  GetStatusResponse,
  ResultsResponse,
  QueryParameter,
  ExecutionResponseCSV,
} from "../types";
import log from "loglevel";
import { logPrefix } from "../utils";
import { Router } from "./router";
import {
  ExecutionParams,
  ExecutionPerformance,
  GetResultPayload,
} from "../types/requestPayload";
import {
  DEFAULT_GET_PARAMS,
  DUNE_CSV_NEXT_OFFSET_HEADER,
  DUNE_CSV_NEXT_URI_HEADER,
} from "../constants";

// This class implements all the routes defined in the Dune API Docs: https://dune.com/docs/api/
export class ExecutionAPI extends Router {
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

    const response = await this._post<ExecutionResponse>(`query/${queryID}/execute`, {
      query_parameters,
      performance,
    });
    log.debug(logPrefix, `execute response ${JSON.stringify(response)}`);
    return response as ExecutionResponse;
  }

  async cancelExecution(executionId: string): Promise<boolean> {
    const { success }: { success: boolean } = await this._post(
      `execution/${executionId}/cancel`,
    );
    return success;
  }

  async getExecutionStatus(executionId: string): Promise<GetStatusResponse> {
    const response: GetStatusResponse = await this._get(
      `execution/${executionId}/status`,
    );
    log.debug(logPrefix, `get_status response ${JSON.stringify(response)}`);
    return response as GetStatusResponse;
  }

  async getExecutionResults(
    executionId: string,
    params: GetResultPayload = DEFAULT_GET_PARAMS,
  ): Promise<ResultsResponse> {
    const response: ResultsResponse = await this._get(
      `execution/${executionId}/results`,
      params,
    );
    log.debug(logPrefix, `get_result response ${JSON.stringify(response)}`);
    return response as ResultsResponse;
  }

  async getResultCSV(
    executionId: string,
    params: GetResultPayload = DEFAULT_GET_PARAMS,
  ): Promise<ExecutionResponseCSV> {
    const response = await this._getRaw(`execution/${executionId}/results/csv`, params);
    log.debug(logPrefix, `get_result response ${JSON.stringify(response)}`);
    return this.buildCSVResponse(response);
  }

  async getLastExecutionResults(
    queryId: number,
    params: GetResultPayload = DEFAULT_GET_PARAMS,
  ): Promise<ResultsResponse> {
    return this._get<ResultsResponse>(`query/${queryId}/results`, params);
  }

  async getLastResultCSV(
    queryId: number,
    params: GetResultPayload = DEFAULT_GET_PARAMS,
  ): Promise<ExecutionResponseCSV> {
    let response = await this._getRaw(`query/${queryId}/results/csv`, params);
    return this.buildCSVResponse(response);
  }

  private async buildCSVResponse(response: Response): Promise<ExecutionResponseCSV> {
    const nextOffset = response.headers.get(DUNE_CSV_NEXT_OFFSET_HEADER);
    return {
      data: await response.text(),
      nextUri: response.headers.get(DUNE_CSV_NEXT_URI_HEADER) as string | undefined,
      nextOffset: nextOffset ? parseInt(nextOffset) : undefined,
    };
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
