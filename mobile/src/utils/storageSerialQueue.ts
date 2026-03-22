export function createSerialExclusiveRunner() {
  let tail: Promise<void> = Promise.resolve();

  return async function runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const previous = tail;
    let release: () => void = () => {};
    tail = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;
    try {
      return await task();
    } finally {
      release();
    }
  };
}

export function createKeyedSerialExclusiveRunner() {
  const tails = new Map<string, Promise<void>>();

  return async function runExclusiveByKey<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = tails.get(key) ?? Promise.resolve();
    let release: () => void = () => {};
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    tails.set(key, next);

    await previous;
    try {
      return await task();
    } finally {
      release();
      if (tails.get(key) === next) {
        tails.delete(key);
      }
    }
  };
}
