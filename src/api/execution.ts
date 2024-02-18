import {
  ExecutionResponse,
  GetStatusResponse,
  ResultsResponse,
  QueryParameter,
} from "../types";
import log from "loglevel";
import { logPrefix } from "../utils";
import { Router } from "./router";
import { ExecutionParams, ExecutionPerformance } from "../types/requestPayload";

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

  async getExecutionResults(executionId: string): Promise<ResultsResponse> {
    const response: ResultsResponse = await this._get(`execution/${executionId}/results`);
    log.debug(logPrefix, `get_result response ${JSON.stringify(response)}`);
    return response as ResultsResponse;
  }

  async getResultCSV(executionId: string): Promise<string> {
    const response = await this._get<string>(`execution/${executionId}/results/csv`);
    log.debug(logPrefix, `get_result response ${JSON.stringify(response)}`);
    return response;
  }

  async getLastExecutionResults(
    queryId: number,
    parameters?: QueryParameter[],
  ): Promise<ResultsResponse> {
    return this._get<ResultsResponse>(`query/${queryId}/results`, {
      query_parameters: parameters ? parameters : [],
    });
  }

  async getLastResultCSV(
    queryId: number,
    parameters?: QueryParameter[],
  ): Promise<string> {
    return this._get<string>(`query/${queryId}/results/csv`, {
      query_parameters: parameters ? parameters : [],
    });
  }
  // TODO - add getExecutionResultsCSV

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
