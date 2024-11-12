import {
  ContentType,
  DuneError,
  RequestPayload,
  payloadJSON,
  payloadSearchParams,
} from "../types";
import { version } from "../../package.json";
import log from "loglevel";
import { logPrefix } from "../utils";

const BASE_URL = "https://api.dune.com/api";

enum RequestMethod {
  GET = "GET",
  POST = "POST",
  PATCH = "PATCH",
  DELETE = "DELETE",
}

/**
 * This class implements all the routes defined in the Dune API Docs:
 * https://docs.dune.com/api-reference/overview/introduction
 */
export class Router {
  private apiKey: string;
  private apiVersion: string;

  constructor(apiKey: string, apiVersion: string = "v1") {
    this.apiKey = apiKey;
    this.apiVersion = apiVersion;
  }
  /**
   * Allows a post to any route supported by DuneAPI.
   * Meant to be low level call only used by available functions,
   * but accessible if new routes become available before the SDK catches up.
   * @param route request path of the http post
   * @param params payload sent with request (should be aligned with what the interface supports)
   * @returns a flexible data type representing whatever is expected to be returned from the request.
   */
  async post<T>(
    route: string,
    params?: RequestPayload,
    content_type: ContentType = ContentType.Json,
  ): Promise<T> {
    return this._request<T>(
      RequestMethod.POST,
      this.url(route),
      params,
      false,
      content_type,
    );
  }

  protected async _handleResponse<T>(responsePromise: Promise<Response>): Promise<T> {
    try {
      const response = await responsePromise;
      if (!response.ok) {
        const errorText = await response.text();
        throw new DuneError(`HTTP - Status: ${response.status}, Message: ${errorText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      log.error(logPrefix, error);
      throw new DuneError(`Response ${error}`);
    }
  }

  protected async _request<T>(
    method: RequestMethod,
    url: string,
    payload?: RequestPayload,
    raw: boolean = false,
    content_type: ContentType = ContentType.Json,
  ): Promise<T> {
    let body;
    if (Buffer.isBuffer(payload)) {
      body = payload;
    } else {
      body = payloadJSON(payload);
    }
    log.debug(logPrefix, `${method} received input url=${url}, payload=${body}`);
    const requestData: RequestInit = {
      method,
      headers: {
        "x-dune-api-key": this.apiKey,
        "User-Agent": `client-sdk@${version} (https://www.npmjs.com/package/@duneanalytics/client-sdk)`,
        "Content-Type": content_type,
      },
      // conditionally add the body property
      ...(method !== RequestMethod.GET && {
        body,
      }),
    };
    let pathParams = "";
    /// Build Url Search Parameters on GET
    if (method === "GET" && payload) {
      const searchParams = new URLSearchParams(payloadSearchParams(payload)).toString();
      pathParams = searchParams ? `?${searchParams}` : "";
    }
    log.debug("Final request URL", url + pathParams);
    const response = fetch(url + pathParams, requestData);
    if (raw) {
      return response as T;
    }
    return this._handleResponse<T>(response);
  }

  protected async _get<T>(
    route: string,
    params?: RequestPayload,
    raw: boolean = false,
  ): Promise<T> {
    return this._request<T>(RequestMethod.GET, this.url(route), params, raw);
  }

  protected async _delete<T>(route: string): Promise<T> {
    return this._request<T>(RequestMethod.DELETE, this.url(route));
  }

  protected async _getByUrl<T>(
    url: string,
    params?: RequestPayload,
    raw: boolean = false,
  ): Promise<T> {
    return this._request<T>(RequestMethod.GET, url, params, raw);
  }

  protected async _patch<T>(route: string, params?: RequestPayload): Promise<T> {
    return this._request<T>(RequestMethod.PATCH, this.url(route), params);
  }

  url(route?: string): string {
    return `${BASE_URL}/${this.apiVersion}/${route}`;
  }
}
