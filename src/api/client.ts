/**
 * This is the common entry point for end users.
 * A class with exhibits all Dune API properties and extensions.
 * Specifically, this class is a composition of QueryAPI, ExecutionAPI
 * and also contains implementations of runQuery[CSV], getLatestResults[CSV]
 */
import * as fs from "fs/promises";
import {
  DuneError,
  ResultsResponse,
  ExecutionState,
  QueryParameter,
  GetStatusResponse,
  ExecutionResponseCSV,
  SuccessResponse,
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
import {
  ExecutionParams,
  ExecutionPerformance,
  UploadCSVParams,
} from "../types/requestPayload";
import { QueryAPI } from "./query";

/// Various states of query execution that are "terminal".
const TERMINAL_STATES = [
  ExecutionState.CANCELLED,
  ExecutionState.COMPLETED,
  ExecutionState.FAILED,
  ExecutionState.EXPIRED,
];

/**
 * The primary interface for devs to utilize
 * full functionality of the Dune API.
 */
export class DuneClient {
  /// Execution Interface.
  exec: ExecutionAPI;
  /// Query Management Interface.
  query: QueryAPI;

  constructor(apiKey: string) {
    this.exec = new ExecutionAPI(apiKey);
    this.query = new QueryAPI(apiKey);
  }

  /**
   * Runs an existing query by ID via execute, await, return results.
   * @param queryID id of the query to be executed
   * @param params execution parameters (includes query parameters and execution performance)
   * @param batchSize puts a limit on the number of results
   * @param pingFrequency how frequently should we check execution status (default: 1s)
   * @returns Execution Results
   */
  async runQuery(
    queryID: number,
    params?: ExecutionParams,
    batchSize: number = MAX_NUM_ROWS_PER_BATCH,
    pingFrequency: number = POLL_FREQUENCY_SECONDS,
  ): Promise<ResultsResponse> {
    const { state, execution_id: jobID } = await this._runInner(
      queryID,
      params,
      pingFrequency,
    );
    if (state === ExecutionState.COMPLETED) {
      const result = await this.getLatestResult(
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

  /**
   * Runs an existing query by ID via execute, await, return Result CSV.
   * @param queryID id of the query to be executed
   * @param params execution parameters (includes query parameters and execution performance)
   * @param pingFrequency how frequently should we check execution status (default: 1s)
   * @returns Execution Results as CSV
   */
  async runQueryCSV(
    queryID: number,
    params?: ExecutionParams,
    pingFrequency: number = POLL_FREQUENCY_SECONDS,
  ): Promise<ExecutionResponseCSV> {
    const { state, execution_id: jobID } = await this._runInner(
      queryID,
      params,
      pingFrequency,
    );
    if (state === ExecutionState.COMPLETED) {
      // we can't assert that the execution ids agree here, so we use max age hours as a "safe guard"
      return this.exec.getResultCSV(jobID, {
        query_parameters: params?.query_parameters,
      });
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
   * Get the lastest execution results in CSV format and saves to disk.
   * @param queryId - query to get results of.
   * @param outFile - location to save CSV.
   * @param parameters - parameters for which they were called.
   * @param batchSize - the page size when retriving results.
   * @param maxAgeHours - oldest acceptable results (if expired results are refreshed)
   * @returns Latest execution results for the given parameters.
   */
  async downloadCSV(
    queryId: number,
    outFile: string,
    parameters: QueryParameter[] = [],
    batchSize: number = MAX_NUM_ROWS_PER_BATCH,
    maxAgeHours: number = THREE_MONTHS_IN_HOURS,
  ): Promise<void> {
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
    // Wait for the results promise to resolve and then write the CSV data to the specified outFile
    const csvData = (await results).data;
    await fs.writeFile(outFile, csvData, "utf8");
    log.info(`CSV data has been saved to ${outFile}`);
  }

  /**
   * Allows user to provide execute raw_sql via the CRUD interface
   * - create, run, get results with optional archive/delete.
   * - Query is by default made private and archived after execution.
   * Requires Plus subscription!
   * @param query_sql - raw sql of query to run
   * @param params - query parameters
   * @param isPrivate - whether the created query should be private
   * @param archiveAfter - whether the created query should be archived immediately after execution
   * @param performance - performance tier of execution engine
   * @param batchSize - the page size when retriving results.
   * @param pingFrequency - how frequently should we check execution status
   * @param name - name of the query
   * @returns
   */
  public async runSql(
    query_sql: string,
    params?: QueryParameter[],
    isPrivate: boolean = true,
    archiveAfter: boolean = true,
    performance?: ExecutionPerformance,
    batchSize: number = MAX_NUM_ROWS_PER_BATCH,
    pingFrequency: number = POLL_FREQUENCY_SECONDS,
    name: string = "API Query",
  ): Promise<ResultsResponse> {
    const queryID = await this.query.createQuery({
      name,
      query_sql,
      query_parameters: params,
      is_private: isPrivate,
    });
    let results: ResultsResponse;

    try {
      results = await this.runQuery(
        queryID,
        { query_parameters: params, performance },
        batchSize,
        pingFrequency,
      );
    } finally {
      if (archiveAfter) {
        this.query.archiveQuery(queryID);
      }
    }

    return results;
  }

  async uploadCsv(params: UploadCSVParams): Promise<boolean> {
    params.description = params.description !== undefined ? params.description : "";
    params.is_private = params.is_private !== undefined ? params.is_private : false;
    const response = await this.exec.post<SuccessResponse>("table/upload/csv", params);
    try {
      return Boolean(response.success);
    } catch (err) {
      throw new DuneError(`UploadCsvResponse ${JSON.stringify(response)}`);
    }
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
