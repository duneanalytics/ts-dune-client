import {
  ExecutionResponse,
  GetStatusResponse,
  ResultsResponse,
  DuneError,
} from "./responseTypes";
import fetch from "cross-fetch";
const BASE_URL = "https://api.dune.com/api/v1";

export class DuneClient {
  apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async _handleResponse(responsePromise: Promise<Response>): Promise<any> {
    const apiResponse = await responsePromise
      .then((response) => {
        if (response.status > 400) {
          console.error(`response error ${response.status} - ${response.statusText}`);
        }
        return response.json();
      })
      .catch((error) => {
        console.error(`caught unhandled response error ${JSON.stringify(error)}`);
        throw error;
      });
    if (apiResponse.error) {
      console.error(`caught unhandled response error ${JSON.stringify(apiResponse)}`);
      if (apiResponse.error instanceof Object) {
        throw new DuneError(apiResponse.error.type);
      } else {
        throw new DuneError(apiResponse.error);
      }
    }
    return apiResponse;
  }

  private async _get(url: string): Promise<any> {
    console.debug(`GET received input url=${url}`);
    const response = fetch(url, {
      method: "GET",
      headers: {
        "x-dune-api-key": this.apiKey,
      },
    });
    return this._handleResponse(response);
  }

  private async _post(url: string, params?: any): Promise<any> {
    console.debug(`POST received input url=${url}, params=${JSON.stringify(params)}`);
    const response = fetch(url, {
      method: "POST",
      body: JSON.stringify(params),
      headers: {
        "x-dune-api-key": this.apiKey,
      },
    });
    return this._handleResponse(response);
  }

  async execute(queryID: number): Promise<ExecutionResponse> {
    // TODO - Add Query Parameters to Execution
    const response = await this._post(`${BASE_URL}/query/${queryID}/execute`, {});
    console.debug(`execute response ${JSON.stringify(response)}`);
    return {
      execution_id: response.execution_id,
      state: response.state,
    };
  }

  async get_status(jobID: string): Promise<GetStatusResponse> {
    const response: GetStatusResponse = await this._get(
      `${BASE_URL}/execution/${jobID}/status`,
    );
    console.debug(`get_status response ${JSON.stringify(response)}`);
    return {
      execution_id: response.execution_id,
      query_id: response.query_id,
      state: response.state,
      // times: parseTimesFrom(data)
    };
  }

  async get_result(jobID: string): Promise<ResultsResponse> {
    const response: ResultsResponse = await this._get(
      `${BASE_URL}/execution/${jobID}/results`,
    );
    console.debug(`get_result response ${JSON.stringify(response)}`);
    return response as ResultsResponse;
    // return {
    //   execution_id: data.execution_id,
    //   query_id: data.query_id,
    //   state: data.state,
    //   // times: parseTimesFrom(data)
    //   result: data.result
    //     ? { rows: data.result.rows, metadata: data.result.metadata }
    //     : undefined,
    // };
  }

  async cancel_execution(jobID: string): Promise<boolean> {
    const data = await this._post(`${BASE_URL}/execution/${jobID}/cancel`);
    const success: boolean = data.success;
    return success;
  }
}
