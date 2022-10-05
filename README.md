[![Styled With Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io/)
[![Build](https://github.com/cowprotocol/ts-dune-client/actions/workflows/pull-request.yaml/badge.svg)](https://github.com/cowprotocol/ts-dune-client/actions/workflows/pull-request.yaml/badge.svg)

# Dune Client TS

This [NPM package](https://www.npmjs.com/package/@cowprotocol/ts-dune-client) implements all the basic routes defined in the [Dune API Docs](https://dune.com/docs/api/). It also introduces a convenience method `refresh` which combines `execute`, `getStatus` and `getResults` in a way that makes it nearly trivial to fetch query execution results.

Install the package

```sh
yarn add @cowprotocol/ts-dune-client
```

```ts
import { QueryParameter, DuneClient } from "@cowprotocol/ts-dune-client";
const { DUNE_API_KEY } = process.env;

const client = new DuneClient(DUNE_API_KEY ?? "");
const queryID = 1215383;
const parameters = [
  QueryParameter.text("TextField", "Plain Text"),
  QueryParameter.number("NumberField", 3.1415926535),
  QueryParameter.date("DateField", "2022-05-04 00:00:00"),
  QueryParameter.enum("ListField", "Option 1"),
];

client
  .refresh(queryID, parameters)
  .then((executionResult) => console.log(executionResult.result?.rows));

// should look like
// [
//   {
//     date_field: "2022-05-04 00:00:00",
//     list_field: "Option 1",
//     number_field: "3.1415926535",
//     text_field: "Plain Text",
//   },
// ]
```

Note also that the client has methods `execute`, `getStatus`, `getResult` and `cancelExecution`

Check out this [Demo Project](https://github.com/bh2smith/demo-ts-dune-client)!
