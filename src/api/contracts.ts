import { Router } from "./router";
import {
  DecodeContractsArgs,
  DecodeContractsResponse,
  ListContractSubmissionsArgs,
  ListContractSubmissionsResponse,
} from "../types";

/**
 * Contract decoding submissions: submit contracts for decoding and track them.
 * https://docs.dune.com/api-reference/contracts/introduction
 *
 * Submissions are attributed to the user who created the API key. Batches that
 * span several blockchains, and resubmissions (upgrade, rename, delete, other),
 * require a paid plan.
 */
export class ContractsAPI extends Router {
  /**
   * Submit up to 100 contracts for decoding in one request. Each item is
   * validated and queued independently; the response carries one result per
   * item, matched by index, so one bad ABI does not fail the batch.
   * https://docs.dune.com/api-reference/contracts/endpoint/decode
   */
  async decode(args: DecodeContractsArgs): Promise<DecodeContractsResponse> {
    return this.post<DecodeContractsResponse>("contracts/decode", args);
  }

  /**
   * List the submissions made by the user who created the API key, newest
   * first. Pass `next_cursor` from a response back as `cursor` for the next page.
   * https://docs.dune.com/api-reference/contracts/endpoint/list
   */
  async listSubmissions(
    args?: ListContractSubmissionsArgs,
  ): Promise<ListContractSubmissionsResponse> {
    return this._get<ListContractSubmissionsResponse>("contracts/submissions", args);
  }
}
