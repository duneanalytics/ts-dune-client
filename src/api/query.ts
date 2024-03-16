// Assuming the existence of these imports based on your Python code
import { Router } from "./router";
import { DuneQuery, CreateQueryResponse, DuneError } from "../types";
import { CreateQueryParams, UpdateQueryParams } from "../types/requestPayload";
import log from "loglevel";

interface EditQueryResponse {
  query_id: number;
}

/**
 * Query Management Interface (CRUD operations)
 * https://docs.dune.com/api-reference/queries/endpoint/query-object
 */
export class QueryAPI extends Router {
  /**
   * Create a query. The owner of the query will be under the context of the API key.
   * https://docs.dune.com/api-reference/queries/endpoint/create
   * @param {CreateQueryParams} params of query creation.
   * @returns {number} the ID of the created query.
   */
  async createQuery(params: CreateQueryParams): Promise<number> {
    if (params.is_private === undefined) {
      params.is_private = false;
    }
    params.query_parameters = params.query_parameters ? params.query_parameters : [];
    const responseJson = await this._post<CreateQueryResponse>("query/", params);
    return responseJson.query_id;
  }

  /**
   * Read the sql text, parameters, name, tags, and state of a query.
   * For private queries, only the API key generated under the context
   * of the owner of that query will work:
   * https://dune.com/docs/api/api-referenhttps://docs.dune.com/api-reference/queries/endpoint/read
   * @param {number} queryId - the ID of the query to be read.
   * @returns {DuneQuery} all known data regarding the query with given ID.
   */
  async readQuery(queryId: number): Promise<DuneQuery> {
    const responseJson = await this._get(`query/${queryId}`);
    return responseJson as DuneQuery;
  }

  /**
   * Update the sql text, parameters, name, tags, and state of a query.
   * Only the API key generated under the context of the owner of that
   * query will work.
   * https://docs.dune.com/api-reference/queries/endpoint/update
   * @param {number} queryId - the ID of the query to be updated.
   * @param {UpdateQueryParams} - changes to be made to the query.
   * @returns {number} updated query Id
   */
  async updateQuery(queryId: number, params: UpdateQueryParams): Promise<number> {
    if (Object.keys(params).length === 0) {
      log.warn("updateQuery: called with no proposed changes.");
      return queryId;
    }

    const responseJson = await this._patch<CreateQueryResponse>(
      `query/${queryId}`,
      params,
    );
    return responseJson.query_id;
  }
  /**
   * Archive a query. Only the API key generated under the context of
   * the owner of that query will work. This does not delete the query,
   * but will make it uneditable/unexecutable:
   * https://docs.dune.com/api-reference/queries/endpoint/archive
   * @param {number} queryId ID of the query to be archived.
   * @returns {boolean} indicating success of request.
   */
  public async archiveQuery(queryId: number): Promise<boolean> {
    const response = await this._post<EditQueryResponse>(`query/${queryId}/archive`);
    const query = await this.readQuery(response.query_id);
    return query.is_archived;
  }
  /**
   * Unarchive a query. Only the API key generated under the context of
   * the owner of that query will work.
   * https://docs.dune.com/api-reference/queries/endpoint/unarchive
   * @param {number} queryId ID of the query to be unarchived.
   * @returns {boolean} indicating success of request.
   */
  public async unarchiveQuery(queryId: number): Promise<boolean> {
    const response = await this._post<EditQueryResponse>(`query/${queryId}/unarchive`);
    const query = await this.readQuery(response.query_id);
    return query.is_archived;
  }

  /**
   * Make a query private. Only the API key generated under the context of
   * the owner of that query will work.
   * https://docs.dune.com/api-reference/queries/endpoint/private
   * @param {number} queryId - ID of the query to be made private.
   * @returns {number} ID of the query made private.
   */
  public async makePrivate(queryId: number): Promise<number> {
    const response = await this._post<EditQueryResponse>(`query/${queryId}/private`);
    const query = await this.readQuery(response.query_id);
    if (!query.is_private) {
      throw new DuneError("Query was not made private!");
    }
    return response.query_id;
  }

  /**
   * Make a private query public.
   * https://docs.dune.com/api-reference/queries/endpoint/unprivate
   * @param {number} queryId - ID of the query to be made public.
   * @returns {number} ID of the query made public.
   */
  public async makePublic(queryId: number): Promise<number> {
    const response = await this._post<EditQueryResponse>(`query/${queryId}/unprivate`);
    const query = await this.readQuery(response.query_id);
    if (query.is_private) {
      throw new DuneError("Query is still private.");
    }
    return response.query_id;
  }
}
