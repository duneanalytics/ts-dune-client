import { PipelineAPI, ExecutionAPI, DuneClient } from "../../src";
import log from "loglevel";
import { QueryEngine } from "../../src/types/requestArgs";

log.setLevel("silent", true);

const API_KEY = process.env.DUNE_API_KEY!;

describe("PipelineAPI: pipeline execution and status", () => {
  let client: DuneClient;
  let pipelineAPI: PipelineAPI;
  let executionAPI: ExecutionAPI;
  let testQueryId: number;

  beforeAll(() => {
    client = new DuneClient(API_KEY);
    pipelineAPI = client.pipeline;
    executionAPI = client.exec;
    testQueryId = 6090403;
  });

  beforeEach((done) => {
    setTimeout(done, 1000);
  });

  it("executes a query pipeline successfully", async () => {
    const response = await executionAPI.executeQueryPipeline(testQueryId, {
      performance: QueryEngine.Medium,
    });

    expect(response.pipeline_execution_id).toBeDefined();
    expect(typeof response.pipeline_execution_id).toBe("string");
    expect(response.pipeline_execution_id.length).toBeGreaterThan(0);
  });

  it("executes query pipeline with default performance", async () => {
    const response = await executionAPI.executeQueryPipeline(testQueryId);

    expect(response.pipeline_execution_id).toBeDefined();
    expect(typeof response.pipeline_execution_id).toBe("string");
  });

  it("gets pipeline status after execution", async () => {
    const executionResponse = await executionAPI.executeQueryPipeline(testQueryId, {
      performance: QueryEngine.Medium,
    });

    const pipelineExecutionId = executionResponse.pipeline_execution_id;
    expect(pipelineExecutionId).toBeDefined();

    const statusResponse = await pipelineAPI.getPipelineStatus(pipelineExecutionId);

    expect(statusResponse.status).toBeDefined();
    expect(statusResponse.node_executions).toBeDefined();
    expect(Array.isArray(statusResponse.node_executions)).toBe(true);
    expect(statusResponse.node_executions.length).toBeGreaterThan(0);

    const firstNode = statusResponse.node_executions[0];
    expect(firstNode.id).toBeDefined();
    expect(firstNode.query_execution_status).toBeDefined();
    expect(firstNode.query_execution_status.status).toBeDefined();
    expect(firstNode.query_execution_status.query_id).toBe(testQueryId);
  });

  it("verifies pipeline status response structure", async () => {
    const executionResponse = await executionAPI.executeQueryPipeline(testQueryId);
    const pipelineExecutionId = executionResponse.pipeline_execution_id;

    const statusResponse = await pipelineAPI.getPipelineStatus(pipelineExecutionId);

    expect(statusResponse).toHaveProperty("status");
    expect(statusResponse).toHaveProperty("node_executions");
    expect(typeof statusResponse.status).toBe("string");

    if (statusResponse.node_executions.length > 0) {
      const node = statusResponse.node_executions[0];
      expect(node).toHaveProperty("id");
      expect(node).toHaveProperty("query_execution_status");
      expect(node.query_execution_status).toHaveProperty("status");
      expect(node.query_execution_status).toHaveProperty("query_id");
    }
  });
});
