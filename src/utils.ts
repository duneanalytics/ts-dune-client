export const logPrefix = "dune-client:";

export function sleep(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export function ageInHours(timestamp: Date | string): number {
  // Get the current date and time
  const now: Date = new Date();
  // Given date time:
  let time = new Date(timestamp);
  // Calculate the difference in milliseconds
  const resultAge: number = now.getTime() - time.getTime();
  // Convert milliseconds to hours and return
  return resultAge / (1000 * 60 * 60);
}
