[![Styled With Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io/)
[![Build](https://github.com/bh2smith/ts-dune-client/actions/workflows/pull-request.yaml/badge.svg)](https://github.com/bh2smith/ts-dune-client/actions/workflows/pull-request.yaml/badge.svg)

# Dune Client TS

This [NPM package](https://www.npmjs.com/package/@duneanalytics/client-sdk) implements all the basic routes defined in the [Dune API Docs](https://dune.com/docs/api/). It also introduces a convenience method `refresh` which combines `executeQuery`, `getExecutionStatus` and `gettExecutionResults` in a way that makes it nearly trivial to fetch query execution results.

Install the package

```sh
yarn add @duneanalytics/client-sdk
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


Note also that the client has methods `executeQuery`, `getExecutionStatus`, `getExecutionResult` and `cancelExecution`

Check out this [Demo Project](https://github.com/bh2smith/demo-ts-dune-client)!
