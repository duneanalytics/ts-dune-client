import log from "loglevel";
import { ContractsAPI } from "../../src/api";

log.setLevel("silent", true);

const API_KEY = process.env.DUNE_API_KEY!;

// Submitting is not exercised here: every decode call creates a real
// decoding submission for the key's owner.
describe("Contracts API", () => {
  let contractsClient: ContractsAPI;

  beforeAll(() => {
    contractsClient = new ContractsAPI(API_KEY);
  });

  it("lists contract submissions", async () => {
    const response = await contractsClient.listSubmissions({ limit: 5 });

    expect(Array.isArray(response.submissions)).toBe(true);
    expect(response.submissions.length).toBeLessThanOrEqual(5);
    expect(typeof response.total).toBe("number");
    for (const submission of response.submissions) {
      expect(submission.id).toBeTruthy();
      expect(submission.blockchain_name).toBeTruthy();
      expect(submission.status).toBeTruthy();
    }
  });

  it("filters submissions by status", async () => {
    const response = await contractsClient.listSubmissions({
      limit: 5,
      status: "rejected",
    });

    for (const submission of response.submissions) {
      expect(submission.status).toBe("rejected");
    }
  });
});
