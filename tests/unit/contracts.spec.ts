import {
  DecodeContractsArgs,
  ListContractSubmissionsArgs,
  payloadJSON,
  payloadSearchParams,
} from "../../src/types";

describe("Contracts request serialization", () => {
  it("accepts readonly ABI constants", () => {
    const abi = [{ type: "event", name: "Transfer", inputs: [] }] as const;
    const args: DecodeContractsArgs = {
      submissions: [
        {
          blockchain_name: "ethereum",
          address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
          project_name: "uniswap",
          contract_name: "UniswapToken",
          abi,
        },
      ],
    };

    expect(JSON.parse(payloadJSON(args)).submissions[0].abi).toEqual(abi);
  });

  it("serializes a decode batch with nested submissions as-is", () => {
    const args: DecodeContractsArgs = {
      submissions: [
        {
          blockchain_name: "ethereum",
          address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
          project_name: "uniswap",
          contract_name: "UniswapToken",
          abi: [{ type: "event", name: "Transfer", inputs: [] }],
          is_proxy: true,
          idempotency_key: "k/0",
        },
        {
          blockchain_name: "ethereum",
          address: "0x1",
          project_name: "uniswap",
          contract_name: "Old",
          abi: "[]",
          submission_type: "delete",
          resubmission_reason: "redeployed",
        },
      ],
    };

    const body = JSON.parse(payloadJSON(args));
    expect(body.submissions).toHaveLength(2);
    expect(body.submissions[0].abi).toEqual([
      { type: "event", name: "Transfer", inputs: [] },
    ]);
    expect(body.submissions[0].idempotency_key).toBe("k/0");
    expect(body.submissions[0]).not.toHaveProperty("submission_type");
    expect(body.submissions[1].abi).toBe("[]");
    expect(body.submissions[1].submission_type).toBe("delete");
  });

  it("turns list args into query parameters and drops unset ones", () => {
    const args: ListContractSubmissionsArgs = {
      limit: 20,
      cursor: "abc",
      status: "pending",
    };

    expect(payloadSearchParams(args)).toEqual({
      limit: "20",
      cursor: "abc",
      status: "pending",
    });
  });
});
