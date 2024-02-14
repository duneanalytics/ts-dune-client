import {
  ExecutionResponse,
  GetStatusResponse,
  ResultsResponse,
  QueryParameter,
} from "../types";
import log from "loglevel";
import { logPrefix } from "../utils";
import { Router } from "./router";

// This class implements all the routes defined in the Dune API Docs: https://dune.com/docs/api/
export class ExecutionClient extends Router {
  async executeQuery(
    queryID: number,
    parameters?: QueryParameter[],
  ): Promise<ExecutionResponse> {
    const response = await this._post<ExecutionResponse>(`query/${queryID}/execute`, {
      query_parameters: parameters ? parameters : [],
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

  // TODO - add getExecutionResultsCSV

  /**
   * @deprecated since version 0.0.2 Use executeQuery
   */
  async execute(
    queryID: number,
    parameters?: QueryParameter[],
  ): Promise<ExecutionResponse> {
    return this.executeQuery(queryID, parameters);
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
