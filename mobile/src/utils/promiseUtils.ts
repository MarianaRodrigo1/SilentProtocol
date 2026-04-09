export async function runBestEffort(
  operation: () => Promise<unknown>,
  onError?: (error: unknown) => void,
): Promise<void> {
  try {
    await operation();
  } catch (error: unknown) {
    onError?.(error);
  }
}

export function fireAndForget(
  operation: Promise<unknown>,
  onError?: (error: unknown) => void,
): void {
  void operation.catch((error: unknown) => {
    onError?.(error);
  });
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
