export enum ParameterType {
  TEXT = "text",
  NUMBER = "number",
  DATE = "date",
  ENUM = "enum",
}

export class QueryParameter {
  type: ParameterType;
  value: string;
  name: string;

  constructor(type: ParameterType, name: string, value: any) {
    this.type = type;
    this.value = value.toString();
    this.name = name;
  }

  text(name: string, value: string): QueryParameter {
    return new QueryParameter(ParameterType.TEXT, name, value);
  }

  number(name: string, value: string | number): QueryParameter {
    return new QueryParameter(ParameterType.NUMBER, name, value.toString());
  }

  date(name: string, value: string | Date): QueryParameter {
    return new QueryParameter(ParameterType.DATE, name, value.toString());
  }

  enum(name: string, value: string): QueryParameter {
    return new QueryParameter(ParameterType.ENUM, name, value.toString());
  }

  as_json(): any {
    return {
      key: this.name,
      type: this.type.valueOf(),
      value: this.value,
    };
  }
}
