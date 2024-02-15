import { DuneError, ResultsResponse, ExecutionState, QueryParameter } from "../types";
import { ageInHours, sleep } from "../utils";
import log from "loglevel";
import { logPrefix } from "../utils";
import { ExecutionAPI } from "./execution";
import { POLL_FREQUENCY_SECONDS, THREE_MONTHS_IN_HOURS } from "../constants";
import { ExecutionParams } from "../types/requestPayload";
import { QueryAPI } from "./query";

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
    pingFrequency: number = POLL_FREQUENCY_SECONDS,
  ): Promise<ResultsResponse> {
    log.info(
      logPrefix,
      `refreshing query https://dune.com/queries/${queryID} with parameters ${JSON.stringify(
        params,
      )}`,
    );
    const { execution_id: jobID } = await this.exec.executeQuery(queryID, params);
    let { state } = await this.exec.getExecutionStatus(jobID);
    while (!TERMINAL_STATES.includes(state)) {
      log.info(
        logPrefix,
        `waiting for query execution ${jobID} to complete: current state ${state}`,
      );
      await sleep(pingFrequency);
      state = (await this.exec.getExecutionStatus(jobID)).state;
    }
    if (state === ExecutionState.COMPLETED) {
      return this.exec.getExecutionResults(jobID);
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
   * @param maxAgeHours - oldest acceptable results (if expired results are refreshed)
   * @returns Latest execution results for the given parameters.
   */
  async getLatestResult(
    queryId: number,
    parameters?: QueryParameter[],
    maxAgeHours: number = THREE_MONTHS_IN_HOURS,
  ): Promise<ResultsResponse> {
    let results = await this.exec.getLastExecutionResults(queryId, parameters);
    const lastRun: Date = results.execution_ended_at!;
    if (lastRun !== undefined && ageInHours(lastRun) > maxAgeHours) {
      log.info(
        logPrefix,
        `results (from ${lastRun}) older than ${maxAgeHours} hours, re-running query.`,
      );
      results = await this.runQuery(queryId, { query_parameters: parameters });
    }
    return results;
  }

  /**
   * @deprecated since version 0.0.2 Use runQuery
   */
  async refresh(
    queryID: number,
    parameters?: QueryParameter[],
    pingFrequency: number = 1,
  ): Promise<ResultsResponse> {
    return this.runQuery(queryID, { query_parameters: parameters }, pingFrequency);
  }
}
