import log from "loglevel";
import { DatasetAPI } from "../../src/api";

log.setLevel("silent", true);

const API_KEY = process.env.DUNE_API_KEY!;

describe("Dataset API", () => {
  let datasetClient: DatasetAPI;

  beforeAll(() => {
    datasetClient = new DatasetAPI(API_KEY);
  });

  it("lists datasets with owner filter", async () => {
    const response = await datasetClient.list({
      limit: 5,
      owner_handle: "dune",
    });

    expect(response.datasets).toBeDefined();
    expect(Array.isArray(response.datasets)).toBe(true);

    if (response.datasets.length > 0) {
      expect(response.datasets[0].owner.handle).toBe("dune");
    }
  });

  it("lists datasets with owner filter", async () => {
    const response = await datasetClient.list({
      limit: 1,
      type: "materialized_view",
    });

    expect(response.datasets).toBeDefined();
    expect(Array.isArray(response.datasets)).toBe(true);

    expect(response.datasets[0].type).toBe("materialized_view");
  });

  it("gets dataset by slug", async () => {
    const dataset = await datasetClient.getBySlug("dex.trades");

    expect(dataset).toHaveProperty("full_name");
    expect(dataset.full_name).toContain("dex.trades");
    expect(dataset).toHaveProperty("type");
    expect(dataset).toHaveProperty("columns");
    expect(dataset).toHaveProperty("owner");
    expect(dataset).toHaveProperty("is_private");
    expect(dataset).toHaveProperty("created_at");
    expect(dataset).toHaveProperty("updated_at");

    expect(Array.isArray(dataset.columns)).toBe(true);
    expect(dataset.columns.length).toBeGreaterThan(0);

    const firstColumn = dataset.columns[0];
    expect(firstColumn).toHaveProperty("name");
    expect(firstColumn).toHaveProperty("type");
  });
});
