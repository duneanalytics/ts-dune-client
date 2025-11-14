import { Router } from "./router";
import { DatasetResponse, ListDatasetsArgs, ListDatasetsResponse } from "../types";

export class DatasetAPI extends Router {
  async list(args?: ListDatasetsArgs): Promise<ListDatasetsResponse> {
    return this._get<ListDatasetsResponse>("datasets", args);
  }

  async getBySlug(slug: string): Promise<DatasetResponse> {
    return this._get<DatasetResponse>(`datasets/${slug}`);
  }
}
