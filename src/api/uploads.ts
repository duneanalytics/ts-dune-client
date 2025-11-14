import { Router } from "./router";
import {
  CreateTableResult,
  SuccessResponse,
  UploadCSVArgs,
  CreateTableArgs,
  InsertTableArgs,
  InsertTableResult,
  DeleteTableArgs,
  DeleteTableResult,
  TableListResponse,
  ListUploadsArgs,
  ClearTableArgs,
  TableClearResponse,
  DuneError,
} from "../types";
import { withDefaults } from "../utils";

export class UploadsAPI extends Router {
  async list(args?: ListUploadsArgs): Promise<TableListResponse> {
    return this._get<TableListResponse>("uploads", args);
  }

  async create(args: CreateTableArgs): Promise<CreateTableResult> {
    return this.post<CreateTableResult>(
      "uploads",
      withDefaults<CreateTableArgs>(args, { description: "", is_private: false }),
    );
  }

  async uploadCsv(args: UploadCSVArgs): Promise<boolean> {
    const response = await this.post<SuccessResponse>("uploads/csv", args);
    try {
      return Boolean(response.success);
    } catch (error: unknown) {
      console.error(
        `Upload CSV Error ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new DuneError(`UploadCsvResponse ${JSON.stringify(response)}`);
    }
  }

  async delete(args: DeleteTableArgs): Promise<DeleteTableResult> {
    const route = `uploads/${args.namespace}/${args.table_name}`;
    return this._delete<DeleteTableResult>(route);
  }

  async clear(args: ClearTableArgs): Promise<TableClearResponse> {
    const route = `uploads/${args.namespace}/${args.table_name}/clear`;
    return this.post<TableClearResponse>(route);
  }

  async insert(args: InsertTableArgs): Promise<InsertTableResult> {
    return this.post<InsertTableResult>(
      `uploads/${args.namespace}/${args.table_name}/insert`,
      args.data,
      args.content_type,
    );
  }
}
