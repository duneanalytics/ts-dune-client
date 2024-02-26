import {
  DuneError,
  ResultsResponse,
  ExecutionState,
  QueryParameter,
  GetStatusResponse,
  ExecutionResponseCSV,
} from "../types";
import { ageInHours, sleep } from "../utils";
import log from "loglevel";
import { logPrefix } from "../utils";
import { ExecutionAPI } from "./execution";
import {
  MAX_NUM_ROWS_PER_BATCH,
  POLL_FREQUENCY_SECONDS,
  THREE_MONTHS_IN_HOURS,
} from "../constants";
import { ExecutionParams } from "../types/requestPayload";
import { QueryAPI } from "./query";
import { join } from "path";

const TERMINAL_STATES = [
  ExecutionState.CANCELLED,
  ExecutionState.COMPLETED,
  ExecutionState.FAILED,
];

export class DuneClient {
  exec: ExecutionAPI;
  query: QueryAPI;

  constructor(apiKey: string) {
    this.exec = new ExecutionAPI(apiKey);
    this.query = new QueryAPI(apiKey);
  }

  async runQuery(
    queryID: number,
    params?: ExecutionParams,
    batchSize: number = MAX_NUM_ROWS_PER_BATCH,
    pingFrequency: number = POLL_FREQUENCY_SECONDS,
  ): Promise<ResultsResponse> {
    let { state, execution_id: jobID } = await this._runInner(
      queryID,
      params,
      pingFrequency,
    );
    if (state === ExecutionState.COMPLETED) {
      let result = await this.getLatestResult(
        queryID,
        params?.query_parameters,
        batchSize,
      );
      if (result.execution_id !== jobID) {
        throw new DuneError(
          `invalid execution ID: expected ${jobID}, got ${result.execution_id}`,
        );
      }
      return result;
    } else {
      const message = `refresh (execution ${jobID}) yields incomplete terminal state ${state}`;
      // TODO - log the error in constructor
      log.error(logPrefix, message);
      throw new DuneError(message);
    }
  }

  async runQueryCSV(
    queryID: number,
    params?: ExecutionParams,
    batchSize: number = MAX_NUM_ROWS_PER_BATCH,
    pingFrequency: number = POLL_FREQUENCY_SECONDS,
  ): Promise<ExecutionResponseCSV> {
    let { state, execution_id: jobID } = await this._runInner(
      queryID,
      params,
      pingFrequency,
    );
    if (state === ExecutionState.COMPLETED) {
      // we can't assert that the execution ids agree here, so we use max age hours as a "safe guard"
      return this.getLatestResultCSV(
        queryID,
        params?.query_parameters,
        batchSize,
        0.0005,
      );
    } else {
      const message = `refresh (execution ${jobID}) yields incomplete terminal state ${state}`;
      // TODO - log the error in constructor
      log.error(logPrefix, message);
      throw new DuneError(message);
    }
  }

  /**
   * Goes a bit beyond the internal call which returns that last execution results.
   * Here contains additional logic to refresh the results if they are too old.
   * @param queryId - query to get results of.
   * @param parameters - parameters for which they were called.
   * @param limit - the number of rows to retrieve
   * @param maxAgeHours - oldest acceptable results (if expired results are refreshed)
   * @returns Latest execution results for the given parameters.
   */
  async getLatestResult(
    queryId: number,
    parameters: QueryParameter[] = [],
    batchSize: number = MAX_NUM_ROWS_PER_BATCH,
    maxAgeHours: number = THREE_MONTHS_IN_HOURS,
  ): Promise<ResultsResponse> {
    let results = await this.exec.getLastExecutionResults(queryId, {
      query_parameters: parameters,
      limit: batchSize,
    });
    const lastRun: Date = results.execution_ended_at!;
    if (lastRun !== undefined && ageInHours(lastRun) > maxAgeHours) {
      log.info(
        logPrefix,
        `results (from ${lastRun}) older than ${maxAgeHours} hours, re-running query.`,
      );
      results = await this.runQuery(queryId, { query_parameters: parameters }, batchSize);
    }
    return results;
  }

  /**
   * Get the lastest execution results in CSV format.
   * @param queryId - query to get results of.
   * @param parameters - parameters for which they were called.
   * @param limit - the number of rows to retrieve
   * @param maxAgeHours - oldest acceptable results (if expired results are refreshed)
   * @returns Latest execution results for the given parameters.
   */
  async getLatestResultCSV(
    queryId: number,
    parameters: QueryParameter[] = [],
    batchSize: number = MAX_NUM_ROWS_PER_BATCH,
    maxAgeHours: number = THREE_MONTHS_IN_HOURS,
  ): Promise<ExecutionResponseCSV> {
    const params = { query_parameters: parameters, limit: batchSize };
    const lastResults = await this.exec.getLastExecutionResults(queryId, params);
    const lastRun: Date = lastResults.execution_ended_at!;
    let results: Promise<ExecutionResponseCSV>;
    if (lastRun !== undefined && ageInHours(lastRun) > maxAgeHours) {
      log.info(
        logPrefix,
        `results (from ${lastRun}) older than ${maxAgeHours} hours, re-running query.`,
      );
      results = this.runQueryCSV(queryId, { query_parameters: parameters }, batchSize);
    } else {
      // TODO (user cost savings): transform the lastResults into CSV instead of refetching
      results = this.exec.getLastResultCSV(queryId, params);
    }
    return results;
  }

  private async _runInner(
    queryID: number,
    params?: ExecutionParams,
    pingFrequency: number = POLL_FREQUENCY_SECONDS,
  ): Promise<GetStatusResponse> {
    log.info(
      logPrefix,
      `refreshing query https://dune.com/queries/${queryID} with parameters ${JSON.stringify(
        params,
      )}`,
    );
    const { execution_id: jobID } = await this.exec.executeQuery(queryID, params);
    let status = await this.exec.getExecutionStatus(jobID);
    while (!TERMINAL_STATES.includes(status.state)) {
      log.info(
        logPrefix,
        `waiting for query execution ${jobID} to complete: current state ${status.state}`,
      );
      await sleep(pingFrequency);
      status = await this.exec.getExecutionStatus(jobID);
    }
    return status;
  }

  /**
   * @deprecated since version 0.0.2 Use runQuery
   */
  async refresh(
    queryID: number,
    parameters: QueryParameter[] = [],
    pingFrequency: number = 1,
  ): Promise<ResultsResponse> {
    return this.runQuery(queryID, { query_parameters: parameters }, pingFrequency);
  }
}
