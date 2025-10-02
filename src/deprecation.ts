/**
 * Minimal utility for marking and warning about deprecated functions
 */
import log from "loglevel";

const warnedMethods = new Set<string>();

/**
 * Logs a deprecation warning for a method.
 * Each unique method name will only log once to avoid spam.
 *
 * @param methodName - The name of the deprecated method
 * @param alternative - The recommended alternative method to use
 * @param since - The version since which the method has been deprecated
 */
export function deprecationWarning(
  methodName: string,
  alternative: string,
  since?: string,
): void {
  if (warnedMethods.has(methodName)) {
    return;
  }

  warnedMethods.add(methodName);

  const sinceInfo = since ? ` since version ${since}` : "";
  log.warn(
    `[DEPRECATION]${sinceInfo}: ${methodName}() is deprecated. Use ${alternative}() instead.`,
  );
}
