import {
  ExecutionResponse,
  GetStatusResponse,
  ResultsResponse,
  DuneError,
  ExecutionState,
} from "./responseTypes";
import fetch from "cross-fetch";
import { QueryParameter } from "./queryParameter";
import { sleep } from "./utils";
import log from "loglevel";
import { logPrefix } from "./utils";

const BASE_URL = "https://api.dune.com/api/v1";
const TERMINAL_STATES = [
  ExecutionState.CANCELLED,
  ExecutionState.COMPLETED,
  ExecutionState.FAILED,
];

enum RequestMethod {
  GET = "GET",
  POST = "POST",
  PATCH = "PATCH",
}

// This class implements all the routes defined in the Dune API Docs: https://dune.com/docs/api/
export class DuneClient {
  apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async _handleResponse<T>(responsePromise: Promise<Response>): Promise<T> {
    const apiResponse = await responsePromise
      .then((response) => {
        if (!response.ok) {
          log.error(
            logPrefix,
            `response error ${response.status} - ${response.statusText}`,
          );
        }
        return response.json();
      })
      .catch((error) => {
        log.error(logPrefix, `caught unhandled response error ${JSON.stringify(error)}`);
        throw error;
      });
    if (apiResponse.error) {
      log.error(logPrefix, `error contained in response ${JSON.stringify(apiResponse)}`);
      if (apiResponse.error instanceof Object) {
        throw new DuneError(apiResponse.error.type);
      } else {
        throw new DuneError(apiResponse.error);
      }
    }
    return apiResponse;
  }

  private async _request<T>(
    method: RequestMethod,
    url: string,
    params?: QueryParameter[],
  ): Promise<T> {
    log.debug(
      logPrefix,
      `${method} received input url=${url}, params=${JSON.stringify(params)}`,
    );
    // Transform Query Parameter list into "dict"
    const reducedParams = params?.reduce<Record<string, string>>(
      (acc, { name, value }) => ({ ...acc, [name]: value }),
      {},
    );
    const response = fetch(url, {
      method,
      headers: {
        "x-dune-api-key": this.apiKey,
      },
      // conditionally add the body property
      ...(method !== RequestMethod.GET && {
        body: JSON.stringify({ query_parameters: reducedParams || {} }),
      }),
    });
    return this._handleResponse<T>(response);
  }

  private async _get<T>(url: string): Promise<T> {
    return this._request(RequestMethod.GET, url);
  }

  private async _post<T>(url: string, params?: QueryParameter[]): Promise<T> {
    return this._request(RequestMethod.POST, url, params);
  }

  private async _patch<T>(url: string, params?: QueryParameter[]): Promise<T> {
    return this._request(RequestMethod.PATCH, url, params);
  }

  async execute(
    queryID: number,
    parameters?: QueryParameter[],
  ): Promise<ExecutionResponse> {
    const response = await this._post<ExecutionResponse>(
      `${BASE_URL}/query/${queryID}/execute`,
      parameters,
    );
    log.debug(logPrefix, `execute response ${JSON.stringify(response)}`);
    return response as ExecutionResponse;
  }

  async getStatus(jobID: string): Promise<GetStatusResponse> {
    const response: GetStatusResponse = await this._get(
      `${BASE_URL}/execution/${jobID}/status`,
    );
    log.debug(logPrefix, `get_status response ${JSON.stringify(response)}`);
    return response as GetStatusResponse;
  }

  async getResult(jobID: string): Promise<ResultsResponse> {
    const response: ResultsResponse = await this._get(
      `${BASE_URL}/execution/${jobID}/results`,
    );
    log.debug(logPrefix, `get_result response ${JSON.stringify(response)}`);
    return response as ResultsResponse;
  }

  async cancelExecution(jobID: string): Promise<boolean> {
    const { success }: { success: boolean } = await this._post(
      `${BASE_URL}/execution/${jobID}/cancel`,
    );
    return success;
  }

  async refresh(
    queryID: number,
    parameters?: QueryParameter[],
    pingFrequency: number = 5,
  ): Promise<ResultsResponse> {
    log.info(
      logPrefix,
      `refreshing query https://dune.com/queries/${queryID} with parameters ${JSON.stringify(
        parameters,
      )}`,
    );
    const { execution_id: jobID } = await this.execute(queryID, parameters);
    let { state } = await this.getStatus(jobID);
    while (!TERMINAL_STATES.includes(state)) {
      log.info(
        logPrefix,
        `waiting for query execution ${jobID} to complete: current state ${state}`,
      );
      await sleep(pingFrequency);
      state = (await this.getStatus(jobID)).state;
    }
    if (state === ExecutionState.COMPLETED) {
      return this.getResult(jobID);
    } else {
      const message = `refresh (execution ${jobID}) yields incomplete terminal state ${state}`;
      // TODO - log the error in constructor
      log.error(logPrefix, message);
      throw new DuneError(message);
    }
  }
}
