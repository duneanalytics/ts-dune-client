import { QueryParameter } from "./queryParameter";

/**
 * Enriched structure representing all data constituting a DuneQuery.
 * Modeling the CRUD operation response for `get_query`
 * https://dune.com/docs/api/api-reference/edit-queries/get-query/#example-return
 */
export interface DuneQuery {
  query_id: number;
  name: string;
  description: string;
  tags: string[];
  version: number;
  parameters: QueryParameter[];
  query_engine: string;
  query_sql: string;
  is_private: boolean;
  is_archived: boolean;
  is_unsaved: boolean;
  owner: string;
}
