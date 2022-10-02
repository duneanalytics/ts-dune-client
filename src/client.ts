import {
  ExecutionResponse,
  ExecutionState,
  GetStatusResponse,
  ResultsResponse,
} from "./responseTypes";
import axios from "axios";

const BASE_URL = "https://api.dune.com/api/v1";

export class DuneClient {
  apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async _get(url: string): Promise<any> {
    console.debug(`GET received input url=${url}`);
    const response = await axios.get(url, {
      headers: {
        "x-dune-api-key": this.apiKey,
      },
    });
    console.log(`GET response: ${response.data}`);
    // TODO - handle response errors
    return response.data;
  }

  private async _post(url: string, params?: any): Promise<any> {
    console.debug(`POST received input url=${url}, params=${params}`);
    const response = axios
      .post(url, {
        body: JSON.stringify(params),
        headers: {
          "x-dune-api-key": this.apiKey,
        },
      })
      .then((response) => {
        console.log(`POST response: ${response.data}`);
        return response.data;
      })
      .catch((error) => {
        console.error(`POST error ${JSON.stringify(error.response.data)}`);
        return error.response.data;
      });
    return response;
  }

  async execute(queryID: number): Promise<ExecutionResponse> {
    const responseData: ExecutionResponse = await this._post(
      `${BASE_URL}/query/${queryID}/execute`,
      {},
    );
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
