# Dune Client TS

Install the package

```sh
yarn add @cowprotocol/ts-dune-client
```

```ts
import { QueryParameter, DuneClient } from "@cowprotocol/ts-dune-client";

const client = new DuneClient(apiKey);
const queryID = 1215383;
const parameters = [
  QueryParameter.text("TextField", "Plain Text"),
  QueryParameter.number("NumberField", 3.1415926535),
  QueryParameter.date("DateField", "2022-05-04 00:00:00"),
  QueryParameter.enum("ListField", "Option 1"),
];

const execution_result = await client.refresh(queryID, parameters);

console.log(execution_result.result?.rows)

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
