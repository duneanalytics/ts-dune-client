import { PipelineStatusResponse } from "../types";
import log from "loglevel";
import { logPrefix } from "../utils";
import { Router } from "./router";

/**
 * This class implements all the pipeline routes defined in the Dune API Docs.
 */
export class PipelineAPI extends Router {
  /**
   * Retrieves the status of a pipeline execution by pipeline execution ID.
   * @param {string} pipelineExecutionId string representing ID of pipeline execution.
   * @returns {PipelineStatusResponse} status of pipeline execution.
   */
  async getPipelineStatus(pipelineExecutionId: string): Promise<PipelineStatusResponse> {
    const response: PipelineStatusResponse = await this._get(
      `pipelines/executions/${pipelineExecutionId}/status`,
    );
    log.debug(logPrefix, `get_pipeline_status response ${JSON.stringify(response)}`);
    return response as PipelineStatusResponse;
  }
}

