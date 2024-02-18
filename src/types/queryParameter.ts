/// All supported Dune Query Parameter types.
export enum ParameterType {
  /// Note that text fields may also be used for varbinary data types.
  TEXT = "text",
  NUMBER = "number",
  DATE = "date",
  ENUM = "enum",
}

/// Class representing Dune Query Parameters with convience constructor methods for each type.
export class QueryParameter {
  type: ParameterType;
  value: string;
  name: string;

  constructor(type: ParameterType, name: string, value: any) {
    this.type = type;
    this.value = value.toString();
    this.name = name;
  }

  /// Text type parameter constructor
  static text(name: string, value: string): QueryParameter {
    return new QueryParameter(ParameterType.TEXT, name, value);
  }

  /// Number type parameter constructor
  static number(name: string, value: string | number): QueryParameter {
    return new QueryParameter(ParameterType.NUMBER, name, value.toString());
  }
  /// Date type parameter constructor
  static date(name: string, value: string | Date): QueryParameter {
    return new QueryParameter(ParameterType.DATE, name, value.toString());
  }
  /// Enum/List type parameter constructor
  static enum(name: string, value: string): QueryParameter {
    return new QueryParameter(ParameterType.ENUM, name, value.toString());
  }

  /**
   * Internal method used to convert query parameters into JSON formated request payload.
   * @param params [Optional]: list of query parameters to be "unravelled".
   * @returns JSON formated HTTP request payload.
   */
  static unravel(params?: QueryParameter[]): Record<string, string> | undefined {
    // Transform Query Parameter list into "dict"
    let reducedParams = params?.reduce<Record<string, string>>(
      (acc, { name, value }) => ({ ...acc, [name]: value }),
      {},
    );
    return reducedParams || {};
  }
}
