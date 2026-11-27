[![Styled With Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io/)
[![Build](https://github.com/duneanalytics/ts-dune-client/actions/workflows/pull-request.yaml/badge.svg)](https://github.com/duneanalytics/ts-dune-client/actions/workflows/pull-request.yaml)

# Dune Client TS

The [Node.js SDK](https://www.npmjs.com/package/@duneanalytics/client-sdk) provides typed access to Dune's [Data API](https://docs.dune.com/api-reference/api-overview). `runQuery` executes a saved query, waits for completion, and returns a page of results.

Install the package:

```sh
pnpm add @duneanalytics/client-sdk
```

```ts
import { DuneClient, QueryParameter } from "@duneanalytics/client-sdk";

const apiKey = process.env.DUNE_API_KEY;
if (!apiKey) throw new Error("Set DUNE_API_KEY");
const client = new DuneClient(apiKey);
const queryId = 1215383;

const results = await client.runQuery({
  queryId,
  query_parameters: [
    QueryParameter.text("TextField", "Plain Text"),
    QueryParameter.number("NumberField", 3.1415926535),
    QueryParameter.date("DateField", "2022-05-04 00:00:00"),
    QueryParameter.enum("ListField", "Option 1"),
  ],
});
console.log(results.result?.rows);
```

The examples below reuse `client` and `queryId` from the quick start.

## Paginate results

`runQuery` returns **one page**, not every row. If `next_uri` is present, request the next page with the returned `next_offset`. Process each page as it arrives to avoid loading the entire result into memory:

```ts
let page = await client.runQuery({ queryId, limit: 1_000 });
while (true) {
  for (const row of page.result?.rows ?? []) console.log(row);
  if (!page.next_uri) break;
  page = await client.exec.getExecutionResults(page.execution_id, {
    limit: 1_000,
    offset: page.next_offset,
  });
}
```

`getLatestResult({ queryId })` can combine pages of existing results, but if it reruns an expired query, it returns only the first page. Use the loop above when you need every row from a fresh execution. The SDK does not automatically retry failed requests.

## Execute raw SQL

`exec.executeSql` starts a query and returns an execution ID. Poll its status before fetching results:

```ts
import { ExecutionState } from "@duneanalytics/client-sdk";

const { execution_id } = await client.exec.executeSql({
  sql: "SELECT * FROM dex.trades LIMIT 10",
});
let status = await client.exec.getExecutionStatus(execution_id);
while (status.state === ExecutionState.PENDING || status.state === ExecutionState.EXECUTING) {
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  status = await client.exec.getExecutionStatus(execution_id);
}
if (status.state !== ExecutionState.COMPLETED) throw new Error(`Query ended: ${status.state}`);
const sqlResults = await client.exec.getExecutionResults(execution_id);
console.log(sqlResults.result?.rows);
```

For larger SQL results, start with `client.exec.getExecutionResults(execution_id, { limit: 1_000, offset: 0 })` and follow `next_offset` as shown above.

## Manage queries

Query management requires a plan with access to the [Query API](https://docs.dune.com/api-reference/queries/endpoint/query-object). Create a private saved query, then run it by ID:

```ts
const createdId = await client.query.createQuery({
  name: "Example query",
  query_sql: "SELECT 1 AS value",
  is_private: true,
});
const createdResults = await client.runQuery({ queryId: createdId });
console.log(createdResults.result?.rows);
```

Use `client.query.readQuery(createdId)`, `client.query.updateQuery(createdId, { query_sql: "..." })`, or `client.query.archiveQuery(createdId)` to manage it.

## Upload data

Upload a CSV as a queryable table. This creates a table in the account associated with the API key:

```ts
const uploaded = await client.uploads.uploadCsv({
  table_name: "example_labels",
  data: "address,label\n0x123,example",
  is_private: true,
});
console.log(uploaded); // true on success
```

`client.uploads` also supports listing, creating a table with a schema, inserting rows, clearing data, and deleting a table. Use `uploads` instead of the deprecated `table` interface. See the [upload endpoints](https://docs.dune.com/api-reference/tables/endpoint/overview) for limits and costs.

## Run a query pipeline

Execute a saved query and its pipeline dependencies, then check the pipeline's status:

```ts
const pipeline = await client.exec.executeQueryPipeline(queryId);
const pipelineStatus = await client.pipeline.getPipelineStatus(pipeline.pipeline_execution_id);
console.log(pipelineStatus.status, pipelineStatus.node_executions);
```

Status may still be in progress. Poll `getPipelineStatus` until the pipeline reaches a terminal state. See the [pipeline API](https://docs.dune.com/api-reference/pipelines/overview) for its execution model.

## Custom API

```ts
const customResults = await client.custom.getResults({
  handle: "your_username_or_team",
  slug: "endpoint-slug",
  limit: 100,
});
console.log(customResults.result?.rows);
```

## Usage API

Get information about your API usage, including credits and storage:

```ts
const usage = await client.usage.getUsage();

console.log(`Credits used: ${usage.billing_periods[0].credits_used}`);
console.log(`Private queries: ${usage.private_queries}`);
console.log(`Storage: ${usage.bytes_used} / ${usage.bytes_allowed} bytes`);
```

## Contracts API

Submit contracts for decoding in batches and track their status. Submissions are attributed to the user who created the API key; see the [docs](https://docs.dune.com/api-reference/contracts/introduction) for plan requirements.

```ts
const { results } = await client.contracts.decode({
  submissions: [
    {
      blockchain_name: "ethereum",
      address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
      project_name: "uniswap",
      contract_name: "UniswapToken",
      abi: uniswapTokenAbi, // JSON array, or a string containing it
      idempotency_key: "uniswap-token/ethereum/1", // optional, makes retries safe
    },
  ],
});
// One result per submission, matched by index: { submission_id, status: "pending" } or { error }

const page = await client.contracts.listSubmissions({ status: "pending", limit: 20 });
// Pass page.next_cursor back as `cursor` to fetch the next page
```

For low-level execution calls, use `client.exec.executeQuery`, `getExecutionStatus`, `getExecutionResults`, and `cancelExecution`.

Check out this [Demo Project](https://github.com/bh2smith/demo-ts-dune-client)!
