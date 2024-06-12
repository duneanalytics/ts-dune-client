import { Router } from "./router";
import { CustomAPIParams, ResultsResponse } from "../types";

/**
 * Custom API Interface:
 * Create custom API endpoints from existing Dune queries.
 * https://docs.dune.com/api-reference/custom/overview
 */
export class CustomAPI extends Router {
  /**
   * Custom Endpoints allow developers to create and manage API
   * endpoints from Dune queries.
   * By selecting a query and scheduling it to run at a specified
   * frequency, developers can call a custom URL to consume data.
   * This flexible alternative to Preset Endpoints provides greater
   * customization without the complexities of SQL Endpoints.
   *
   * @param {CustomAPIParams} args - Parameters for the custom API request.
   * @see {@link CustomAPIParams}
   * @returns {Promise<ResultsResponse>} - The result of the API call.
   * @see {@link ResultsResponse}
   */
  async getResults(args: CustomAPIParams): Promise<ResultsResponse> {
    const x = await this._get<ResultsResponse>(
      `endpoints/${args.handle}/${args.slug}/results`,
      args,
    );

    return x;
  }
}
