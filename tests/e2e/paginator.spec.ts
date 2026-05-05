import { DuneClient, Paginator } from "../../src/";

const API_KEY = process.env.DUNE_API_KEY!;

describe("Paginator Class", () => {
  let client: DuneClient;

  beforeAll(() => {
    client = new DuneClient(API_KEY);
  });
  it("Paginator does the stuff", async () => {
    // Ususally the user would call: client.refreshResults(:966920);
    // But here we use existing completed execution state.
    const {
      results: { execution_id },
    } = await client.exec.getLastExecutionResults(966920);
    const status = await client.exec.getExecutionStatus(execution_id);
    // Example usage:
    const paginator = await Paginator.new(client.exec, status, 2);
    expect(paginator.maxPage()).toEqual(5);
    const pageOne = {
      number: 1,
      values: [
        {
          hash: "0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3",
          number: 0,
        },
        {
          hash: "0x88e96d4537bea4d9c05d12549907b32561d3bf31f45aae734cdc119f13406cb6",
          number: 1,
        },
      ],
    };
    const pageTwo = {
      number: 2,
      values: [
        {
          hash: "0xb495a1d7e6663152ae92708da4843337b958146015a2802f4193a410044698c9",
          number: 2,
        },
        {
          hash: "0x3d6122660cc824376f11ee842f83addc3525e2dd6756b9bcf0affa6aa88cf741",
          number: 3,
        },
      ],
    };
    expect(paginator.getCurrentPageValues()).toEqual(pageOne);
    await paginator.nextPage(); // Move to page 2
    expect(paginator.getCurrentPageValues()).toEqual(pageTwo);
    await paginator.previousPage(); // Move back to page 1
    expect(paginator.getCurrentPageValues()).toEqual(pageOne);
    const lastPage = {
      number: 5,
      values: [
        {
          hash: "0x2ce94342df186bab4165c268c43ab982d360c9474f429fec5565adfc5d1f258b",
          number: 8,
        },
      ],
    };
    await paginator.lastPage(); // Jump to page 5
    expect(paginator.getCurrentPageValues()).toEqual(lastPage);
  });
});
