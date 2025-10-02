import { DuneError } from "../../src";

const { DUNE_API_KEY, DUNE_USER_NAME, CUSTOM_SLUG } = process.env;
if (DUNE_API_KEY === undefined) {
  throw Error("Missing ENV var: DUNE_API_KEY");
}
export const API_KEY: string = DUNE_API_KEY!;
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
