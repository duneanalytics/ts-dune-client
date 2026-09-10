[![Styled With Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io/)
[![Build](https://github.com/bh2smith/ts-dune-client/actions/workflows/pull-request.yaml/badge.svg)](https://github.com/duneanalytics/ts-dune-client/actions/workflows/pull-request.yaml)

# Dune Client TS

This [NPM package](https://www.npmjs.com/package/@duneanalytics/client-sdk) implements all the basic routes defined in the [Dune API Docs](https://dune.com/docs/api/). It also introduces a convenience method `refresh` which combines `executeQuery`, `getExecutionStatus` and `gettExecutionResults` in a way that makes it nearly trivial to fetch query execution results.

Install the package

```sh
pnpm add @duneanalytics/client-sdk
```

```ts
import { QueryParameter, DuneClient, RunQueryArgs } from "@duneanalytics/client-sdk";
const { DUNE_API_KEY } = process.env;

const client = new DuneClient(DUNE_API_KEY ?? "");
const queryId = 1215383;
const opts: RunQueryArgs = {
  queryId,
  query_parameters: [
    QueryParameter.text("TextField", "Plain Text"),
    QueryParameter.number("NumberField", 3.1415926535),
    QueryParameter.date("DateField", "2022-05-04 00:00:00"),
    QueryParameter.enum("ListField", "Option 1"),
  ],
};

client
  .runQuery(opts)
  .then((executionResult) => console.log(executionResult.result?.rows));

// should look like
// [
//    {
//      date_field: "2022-05-04 00:00:00.000",
//      list_field: "Option 1",
//      number_field: "3.1415926535",
//      text_field: "Plain Text",
//    },
//  ]
```

## Execute Raw SQL

You can execute raw SQL queries directly using the `executeSql` method:

```ts
const { DUNE_API_KEY } = process.env;

const client = new DuneClient(DUNE_API_KEY ?? "");
const execution = await client.exec.executeSql({
  sql: "SELECT * FROM dex.trades WHERE block_time > now() - interval '1' day LIMIT 10",
  performance: QueryEngine.Medium, // optional
});

const executionId = execution.execution_id;
const status = await client.exec.getExecutionStatus(executionId);
const results = await client.exec.getExecutionResults(executionId);
```

## Custom API

```ts
const { DUNE_API_KEY } = process.env;

const client = new DuneClient(DUNE_API_KEY ?? "");
const results = await client.custom.getResults({
  username: "your_username",
  slug: "endpoint-slug"
  // optional arguments: see `GetResultParams`
  limit: 100,
});
```

## Usage API

Get information about your API usage, including credits and storage:

```ts
const { DUNE_API_KEY } = process.env;

const client = new DuneClient(DUNE_API_KEY ?? "");
const usage = await client.usage.getUsage();

console.log(`Credits used: ${usage.billing_periods[0].credits_used}`);
console.log(`Private queries: ${usage.private_queries}`);
console.log(`Storage: ${usage.bytes_used} / ${usage.bytes_allowed} bytes`);
```

## Contracts API

Submit contracts for decoding in batches and track their status. Submissions are attributed to the user who created the API key; see the [docs](https://docs.dune.com/api-reference/contracts/introduction) for plan requirements.

```ts
const { DUNE_API_KEY } = process.env;

const client = new DuneClient(DUNE_API_KEY ?? "");
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

Note also that the client has methods `executeQuery`, `getExecutionStatus`, `getExecutionResult` and `cancelExecution`

Check out this [Demo Project](https://github.com/bh2smith/demo-ts-dune-client)!
