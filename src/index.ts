interface AsyncBatchOptions {
  concurrency?: number;
  failFast?: boolean;
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Executes an array of async tasks with controlled concurrency
 * @param tasks Array of functions that return promises
 * @param options Configuration options
 * @returns Promise that resolves with array of results in the same order as input tasks
 */
export async function asyncBatch<T>(
  tasks: (() => Promise<T>)[],
  options: AsyncBatchOptions = {}
): Promise<T[]> {
  const { concurrency = 5, failFast = false, onProgress = undefined } = options;

  const total = tasks.length;
  const results: (T | Error)[] = new Array(total);
  let completed = 0;
  let failed = false;
  let firstError: Error | null = null;

  // Create a queue of task indices
  const queue = tasks.map((_, index) => index);
  const inProgress = new Set<number>();
  const processing = new Set<number>();

  const processTask = async (taskIndex: number): Promise<void> => {
    if (failed || processing.has(taskIndex)) return;
    processing.add(taskIndex);

    try {
      const task = tasks[taskIndex];
      if (!task) throw new Error(`Task at index ${taskIndex} is undefined`);
      const result = await task();
      if (!failed) {
        results[taskIndex] = result;
      }
    } catch (error) {
      if (failFast) {
        failed = true;
        firstError = error instanceof Error ? error : new Error(String(error));
        return;
      }
      results[taskIndex] =
        error instanceof Error ? error : new Error(String(error));
    } finally {
      inProgress.delete(taskIndex);
      if (!failed) {
        completed++;
        onProgress?.(completed, total);
      }
    }
  };

  while (queue.length > 0 && !failed) {
    // Fill up the batch
    while (inProgress.size < concurrency && queue.length > 0 && !failed) {
      const taskIndex = queue.shift()!;
      inProgress.add(taskIndex);
    }

    if (inProgress.size > 0) {
      // Wait for all current tasks to complete
      await Promise.all(Array.from(inProgress).map(processTask));

      if (failed && firstError) {
        throw firstError;
      }
    }
  }

  // If not in failFast mode, throw if all tasks failed
  const allFailed = results.every((result) => result instanceof Error);
  if (allFailed) {
    throw new Error(
      `All tasks failed to execute: ${(results as Error[]).map((e) => e.message).join(', ')}`
    );
  }

  return results as T[];
}
