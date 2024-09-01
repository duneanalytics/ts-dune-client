import { DuneError } from "../../src";

const { BASIC_API_KEY, PLUS_API_KEY, DUNE_USER_NAME, CUSTOM_SLUG } = process.env;
if (BASIC_API_KEY === undefined) {
  throw Error("Missing ENV var: BASIC_API_KEY");
}
if (PLUS_API_KEY === undefined) {
  throw Error("Missing ENV var: PLUS_API_KEY");
}
export const BASIC_KEY: string = BASIC_API_KEY!;
export const PLUS_KEY: string = PLUS_API_KEY!;
export const USER_NAME: string = DUNE_USER_NAME || "your_username";
export const CUSTOM_API_SLUG: string = CUSTOM_SLUG || "test-custom-api";

export const expectAsyncThrow = async (
  promise: Promise<unknown>,
  message?: string | object,
): Promise<void> => {
  try {
    await promise;
    // Make sure to fail if promise does resolve!
    expect(false).toEqual(true);
  } catch (error: unknown) {
    if (message) {
      expect((error as DuneError).message).toEqual(message);
      expect(error).toBeInstanceOf(DuneError);
    } else {
      expect(error).toBeInstanceOf(DuneError);
    }
  }
};
