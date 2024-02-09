import { DuneError, ResultsResponse, ExecutionState, QueryParameter } from "../types";
import { ageInHours, sleep } from "../utils";
import log from "loglevel";
import { logPrefix } from "../utils";
import { ExecutionClient } from "./execution";
import { POLL_FREQUENCY_SECONDS, THREE_MONTHS_IN_HOURS } from "../constants";

const TERMINAL_STATES = [
  ExecutionState.CANCELLED,
  ExecutionState.COMPLETED,
  ExecutionState.FAILED,
];

export class ExtendedClient extends ExecutionClient {
  async runQuery(
    queryID: number,
    parameters?: QueryParameter[],
    pingFrequency: number = POLL_FREQUENCY_SECONDS,
  ): Promise<ResultsResponse> {
    log.info(
      logPrefix,
      `refreshing query https://dune.com/queries/${queryID} with parameters ${JSON.stringify(
        parameters,
      )}`,
    );
    const { execution_id: jobID } = await this.execute(queryID, parameters);
    let { state } = await this.getExecutionStatus(jobID);
    while (!TERMINAL_STATES.includes(state)) {
      log.info(
        logPrefix,
        `waiting for query execution ${jobID} to complete: current state ${state}`,
      );
      await sleep(pingFrequency);
      state = (await this.getExecutionStatus(jobID)).state;
    }
    if (state === ExecutionState.COMPLETED) {
      return this.getExecutionResults(jobID);
    } else {
      const message = `refresh (execution ${jobID}) yields incomplete terminal state ${state}`;
      // TODO - log the error in constructor
      log.error(logPrefix, message);
      throw new DuneError(message);
    }
  }

  async getLatestResult(
    queryId: number,
    parameters?: QueryParameter[],
    maxAgeHours: number = THREE_MONTHS_IN_HOURS,
  ): Promise<ResultsResponse> {
    let results = await this._get<ResultsResponse>(
      `/query/${queryId}/results`,
      parameters,
    );
    const lastRun = results.execution_ended_at;
    if (lastRun !== undefined && ageInHours(lastRun) > maxAgeHours) {
      log.info(
        logPrefix,
        `results (from ${lastRun}) older than ${maxAgeHours} hours, re-running query.`,
      );
      results = await this.runQuery(queryId, parameters);
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
    return this.runQuery(queryID, parameters, pingFrequency);
  }
}
