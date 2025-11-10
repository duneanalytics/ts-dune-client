import { Router } from "./router";
import { UsageResponse } from "../types";

/**
 * Usage API Interface:
 * Get information about API usage and credits.
 * https://docs.dune.com/api-reference/usage/endpoint/get-usage
 */
export class UsageAPI extends Router {
  /**
   * Get usage information for the current API key.
   * Returns details about private queries, dashboards, storage,
   * and credit usage for billing periods.
   * @returns {Promise<UsageResponse>} usage information including credits and storage
   */
  async getUsage(): Promise<UsageResponse> {
    const response = await this._get<UsageResponse>("usage");
    return response;
  }
}
