import { deprecationWarning } from "../../src/deprecation";
import log from "loglevel";

// Mock the loglevel logger
jest.mock("loglevel", () => ({
  warn: jest.fn(),
}));

describe("deprecationWarning", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it("should log a deprecation warning with all parameters", () => {
    deprecationWarning("testMethod1", "newMethod1", "1.0.0");

    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn).toHaveBeenCalledWith(
      "[DEPRECATION] since version 1.0.0: testMethod1() is deprecated. Use newMethod1() instead.",
    );
  });

  it("should log a deprecation warning without version", () => {
    deprecationWarning("testMethod2", "newMethod2");

    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn).toHaveBeenCalledWith(
      "[DEPRECATION]: testMethod2() is deprecated. Use newMethod2() instead.",
    );
  });

  it("should only warn once for the same method", () => {
    deprecationWarning("testMethod3", "newMethod3", "1.0.0");
    deprecationWarning("testMethod3", "newMethod3", "1.0.0");
    deprecationWarning("testMethod3", "newMethod3", "1.0.0");

    expect(log.warn).toHaveBeenCalledTimes(1);
  });

  it("should warn separately for different methods", () => {
    deprecationWarning("testMethod4", "newMethod4", "1.0.0");
    deprecationWarning("testMethod5", "newMethod5", "1.0.0");
    deprecationWarning("testMethod6", "newMethod6", "1.0.0");

    expect(log.warn).toHaveBeenCalledTimes(3);
  });
});
