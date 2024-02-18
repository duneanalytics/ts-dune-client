import { DuneError } from "../types";
import fetch from "cross-fetch";
import log from "loglevel";
import { logPrefix } from "../utils";
import { RequestPayload, payloadJSON } from "../types/requestPayload";

const BASE_URL = "https://api.dune.com/api/v1";

enum RequestMethod {
  GET = "GET",
  POST = "POST",
  PATCH = "PATCH",
}

// This class implements all the routes defined in the Dune API Docs: https://dune.com/docs/api/
export class Router {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  protected async _handleResponse<T>(responsePromise: Promise<Response>): Promise<T> {
    let result;
    try {
      const response = await responsePromise;

      if (!response.ok) {
        log.error(
          logPrefix,
          `response error ${response.status} - ${response.statusText}`,
        );
      }
      const clonedResponse = response.clone();
      try {
        // Attempt to parse JSON
        result = await response.json();
      } catch {
        // Fallback to text if JSON parsing fails
        // This fallback is used for CSV retrieving methods.
        result = await clonedResponse.text();
      }

      // Check for error in result after parsing
      if (result.error) {
        log.error(logPrefix, `error contained in response ${JSON.stringify(result)}`);
        // Assuming DuneError is a custom Error you'd like to throw
        throw new DuneError(
          result.error instanceof Object ? result.error.type : result.error,
        );
      }
    } catch (error) {
      log.error(logPrefix, `caught unhandled response error ${JSON.stringify(error)}`);
      throw error;
    }
    return result;
  }

  protected async _request<T>(
    method: RequestMethod,
    url: string,
    payload?: RequestPayload,
  ): Promise<T> {
    const payloadData = payloadJSON(payload);
    log.debug(logPrefix, `${method} received input url=${url}, payload=${payloadData}`);
    const response = fetch(url, {
      method,
      headers: {
        "x-dune-api-key": this.apiKey,
      },
      // conditionally add the body property
      ...(method !== RequestMethod.GET && {
        body: payloadJSON(payload),
      }),
      ...(method === RequestMethod.GET && {
        params: payloadJSON(payload),
      }),
    });
    return this._handleResponse<T>(response);
  }

  protected async _get<T>(route: string, params?: RequestPayload): Promise<T> {
    return this._request(RequestMethod.GET, this.url(route), params);
  }

  protected async _post<T>(route: string, params?: RequestPayload): Promise<T> {
    return this._request(RequestMethod.POST, this.url(route), params);
  }

  protected async _patch<T>(route: string, params?: RequestPayload): Promise<T> {
    return this._request(RequestMethod.PATCH, this.url(route), params);
  }

  private url(route: string): string {
    return `${BASE_URL}/${route}`;
  }
}
