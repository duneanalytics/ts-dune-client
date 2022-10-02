import { Headers } from "node-fetch";
import fetch from "node-fetch";
import { ExecutionResponse, GetStatusResponse, ResultsResponse } from "./responseTypes";

const BASE_URL = "https://api.dune.com/api/v1";

export class DuneClient {
  header: Headers;

  constructor(apiKey: string) {
    this.header = new Headers({
      "x-dune-api-key": apiKey,
    });
  }

  private async _get(url: string): Promise<any> {
    console.debug(`GET received input url=${url}`);
    const response = await fetch(url, {
      method: "GET",
      headers: this.header,
    });
    // TODO - handle response errors
    return response.json();
  }

  private async _post(url: string, params?: any): Promise<any> {
    console.debug(`POST received input url=${url}, params=${params}`);
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(params),
      headers: this.header,
    });
    return response.json();
  }

  async execute(queryID: number): Promise<ExecutionResponse> {
    const responseData = await this._post(`${BASE_URL}/query/${queryID}/execute`, {});
    return {
      executionID: responseData.execution_id,
      state: responseData.state,
    };
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
