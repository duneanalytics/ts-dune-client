import { UsageAPI, DuneError } from "../../src";
import log from "loglevel";

log.setLevel("silent", true);

const API_KEY = process.env.DUNE_API_KEY!;

describe("UsageAPI", () => {
  let client: UsageAPI;

  beforeAll(() => {
    client = new UsageAPI(API_KEY);
  });

  it("retrieves usage information", async () => {
    const usage = await client.getUsage();

    expect(usage).toBeDefined();
    expect(typeof usage.private_queries).toBe("number");
    expect(typeof usage.private_dashboards).toBe("number");
    expect(typeof usage.bytes_used).toBe("number");
    expect(typeof usage.bytes_allowed).toBe("number");
    expect(Array.isArray(usage.billing_periods)).toBe(true);
  });

  it("returns valid billing periods structure", async () => {
    const usage = await client.getUsage();

    if (usage.billing_periods.length > 0) {
      const period = usage.billing_periods[0];
      expect(period.start_date).toBeDefined();
      expect(period.end_date).toBeDefined();
      expect(typeof period.credits_used).toBe("number");
      expect(typeof period.credits_included).toBe("number");
    }
  });

  it("throws error with invalid API key", async () => {
    const badClient = new UsageAPI("Invalid_Key");

    try {
      await badClient.getUsage();
      expect(false).toBe(true);
    } catch (error) {
      expect(error).toBeInstanceOf(DuneError);
      expect((error as DuneError).message).toContain("401");
    }
  });
});
