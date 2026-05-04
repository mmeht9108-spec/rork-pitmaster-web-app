/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within
 * the specified milliseconds, it rejects with a timeout error.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage = 'Request timed out'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
