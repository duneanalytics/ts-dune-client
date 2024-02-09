export const logPrefix = "dune-client:";

export function sleep(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export function ageInHours(timestamp: Date): number {
  // Get the current date and time
  const now: Date = new Date();
  // Calculate the difference in milliseconds
  const resultAge: number = now.getTime() - timestamp.getTime();
  // Convert milliseconds to hours and return
  return resultAge / (1000 * 60 * 60);
}
