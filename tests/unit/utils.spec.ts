import { withDefaults } from "../../src/utils";

describe("utility methods", () => {
  it("withDefaults: inserts defaults (overriding optionals)", async () => {
    interface MyType {
      a: string;
      b?: string;
    }

    const x = { a: "1" };
    expect(withDefaults<MyType>(x, { b: "2" })).toEqual({ a: "1", b: "2" });
  });
});
