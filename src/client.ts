import {
  ExecutionResponse,
  ExecutionState,
  GetStatusResponse,
  ResultsResponse,
} from "./responseTypes";
import axios from "axios";
import fetch from "cross-fetch";
const BASE_URL = "https://api.dune.com/api/v1";

export class DuneClient {
  apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async _get(url: string): Promise<any> {
    console.debug(`GET received input url=${url}`);
    const response = fetch(url, {
      method: "GET",
      headers: {
        "x-dune-api-key": this.apiKey,
      },
    })
      .then((response) => {
        if (response.status > 400) {
          throw new Error(`Bad response from server ${response.json()}`);
        }
        console.log(`GET response: ${response.json()}`);
        return response.json();
      })
      .catch((error) => {
        console.error(`GET error ${error}`);
        throw error;
      });
    return response;
  }

  private async _post(url: string, params?: any): Promise<any> {
    console.debug(`POST received input url=${url}, params=${JSON.stringify(params)}`);
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(params),
      headers: {
        "x-dune-api-key": this.apiKey,
      },
    })
      .then((response) => {
        if (response.status > 400) {
          console.error(`Error ${response.status} - ${response.statusText}`);
          return response.json();
        }
        return response.json();
      })
      .catch((error) => {
        console.error(`POST error ${JSON.stringify(error)}`);
        throw error;
      });
    if (response.error) {
      console.debug(`POST error: ${response.error}`);
    }

    return response;
  }

  async execute(queryID: number): Promise<ExecutionResponse> {
    const responseData = await this._post(`${BASE_URL}/query/${queryID}/execute`, {});
    return responseData;
  }

  async get_status(jobID: string): Promise<GetStatusResponse> {
    const data = await this._get(`${BASE_URL}/execution/${jobID}/status`);
    return {
      executionID: data.execution_id,
      queryID: data.query_id,
      state: data.state,
      // times: parseTimesFrom(data)
    };
  }

  async get_result(jobID: string): Promise<ResultsResponse> {
    const data = await this._get(`${BASE_URL}/execution/${jobID}/results`);
    return {
      executionID: data.execution_id,
      queryID: data.query_id,
      state: data.state,
      // times: parseTimesFrom(data)
      result: data.result
        ? { rows: data.result.rows, metadata: data.result.metadata }
        : undefined,
    };
  }

  async cancel_execution(jobID: string): Promise<boolean> {
    const data = await this._post(`${BASE_URL}/execution/${jobID}/cancel`);
    const success: boolean = data.success;
    return success;
  }
}
