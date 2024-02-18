import { QueryParameter } from "./queryParameter";

/**
 * Enriched structure representing all data constituting a DuneQuery.
 * Modeling the CRUD operation response for `get_query`
 * https://dune.com/docs/api/api-reference/edit-queries/get-query/#example-return
 */
export interface DuneQuery {
  /// ID of the created query.
  query_id: number;
  /// Name of the query.
  name: string;
  /// Query description.
  description: string;
  /// Tags associated with the query.
  tags: string[];
  /// query revision version.
  version: number;
  /// Parameters with their names and default values.
  parameters: QueryParameter[];
  /// Query engine query was created for.
  /// All legacy engines have been deprecated,
  /// so this is essentially no longer relevant.
  query_engine: string;
  /// Raw SQL of the query.
  query_sql: string;
  /// whether or not the query is private.
  is_private: boolean;
  /// whether or not the query is archived.
  /// Note: This is as close as a user can get to deleting a query.
  is_archived: boolean;
  /// whether or not the query is unsaved.
  is_unsaved: boolean;
  /// Dune user who owns the query.
  owner: string;
}
