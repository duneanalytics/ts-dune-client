import { Router } from "./router";
import {
  CreateTableResult,
  DuneError,
  SuccessResponse,
  UploadCSVArgs,
  CreateTableArgs,
  InsertTableArgs,
  InsertTableResult,
  DeleteTableArgs,
  DeleteTableResult,
} from "../types";
import { withDefaults } from "../utils";
import { deprecationWarning } from "../deprecation";

/**
 * Table Management Interface (includes uploadCSV)
 * https://docs.dune.com/api-reference/tables/
 */
export class TableAPI extends Router {
  /**
   * Allows for anyone to upload a CSV as a table in Dune.
   * The size limit per upload is currently 200MB.
   * Storage is limited by plan, 1MB on free, 15GB on plus, and 50GB on premium.
   *
   * @param args UploadCSVParams relevant fields related to dataset upload.
   * @returns boolean representing if upload was successful.
   * @deprecated Use uploads.uploadCsv() instead. The /v1/table endpoints are deprecated in favor of /v1/uploads.
   */
  async uploadCsv(args: UploadCSVArgs): Promise<boolean> {
    deprecationWarning("table.uploadCsv", "uploads.uploadCsv");
    const response = await this.post<SuccessResponse>("table/upload/csv", args);
    try {
      return Boolean(response.success);
    } catch (error: unknown) {
      console.error(
        `Upload CSV Error ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new DuneError(`UploadCsvResponse ${JSON.stringify(response)}`);
    }
  }

  /**
   * https://docs.dune.com/api-reference/tables/endpoint/create
   * The create table endpoint allows you to create an empty table
   * with a specific schema in Dune.
   *
   * The only limitations are:
   * - If a table already exists with the same name, the request will fail.
   * - Column names in the table can't start with a special character or a digit.
   * @param args
   * @deprecated Use uploads.create() instead. The /v1/table endpoints are deprecated in favor of /v1/uploads.
   */
  async create(args: CreateTableArgs): Promise<CreateTableResult> {
    deprecationWarning("table.create", "uploads.create");
    return this.post<CreateTableResult>(
      "table/create",
      withDefaults<CreateTableArgs>(args, { description: "", is_private: false }),
    );
  }

  /**
   * https://docs.dune.com/api-reference/tables/endpoint/delete
   * Delete a Dune table with the specified name and namespace.
   *
   * To be able to delete a table, it must have been created with the /create endpoint.
   * @deprecated Use uploads.delete() instead. The /v1/table endpoints are deprecated in favor of /v1/uploads.
   */
  async delete(args: DeleteTableArgs): Promise<DeleteTableResult> {
    deprecationWarning("table.delete", "uploads.delete");
    const route = `table/${args.namespace}/${args.table_name}`;
    return this._delete<DeleteTableResult>(route);
  }

  /**
   * https://docs.dune.com/api-reference/tables/endpoint/insert
   * The insert table endpoint allows you to insert data into an existing table in Dune.
   * The only limitations are:
   * - The file has to be in json or csv format
   * - The file has to have the same schema as the table
   * @param args
   * @returns
   * @deprecated Use uploads.insert() instead. The /v1/table endpoints are deprecated in favor of /v1/uploads.
   */
  async insert(args: InsertTableArgs): Promise<InsertTableResult> {
    deprecationWarning("table.insert", "uploads.insert");
    return this.post<InsertTableResult>(
      `table/${args.namespace}/${args.table_name}/insert`,
      args.data,
      args.content_type,
    );
  }
}
