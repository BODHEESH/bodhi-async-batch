import { asyncBatch } from '../src';
import { describe, expect, it } from '@jest/globals';


describe('asyncBatch', () => {
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  it('should process tasks with default concurrency', async () => {
    const tasks = [
      () => Promise.resolve(1),
      () => Promise.resolve(2),
      () => Promise.resolve(3),
    ];

    const results = await asyncBatch(tasks);
    expect(results).toEqual([1, 2, 3]);
  });

  it('should respect concurrency limit', async () => {
    const executionOrder: number[] = [];
    const tasks = [
      async () => {
        await delay(50);
        executionOrder.push(1);
        return 1;
      },
      async () => {
        await delay(30);
        executionOrder.push(2);
        return 2;
      },
      async () => {
        await delay(10);
        executionOrder.push(3);
        return 3;
      },
    ];

    const results = await asyncBatch(tasks, { concurrency: 1 });
    expect(results).toEqual([1, 2, 3]);
    expect(executionOrder).toEqual([1, 2, 3]);
  });

  it('should handle errors in failFast mode', async () => {
    const tasks = [
      () => Promise.resolve(1),
      () => Promise.reject(new Error('Task failed')),
      () => Promise.resolve(3),
    ];

    const promise = asyncBatch(tasks, { failFast: true });
    await expect(promise).rejects.toThrow('Task failed');
  });

  it('should continue on errors when failFast is false', async () => {
    const tasks = [
      () => Promise.resolve(1),
      () => Promise.reject(new Error('Task 2 failed')),
      () => Promise.resolve(3),
    ];

    const results = await asyncBatch(tasks, { failFast: false });
    expect(results[0]).toBe(1);
    expect(results[1]).toBeInstanceOf(Error);
    expect(results[2]).toBe(3);
  });

  it('should call onProgress callback', async () => {
    const progressUpdates: [number, number][] = [];
    const tasks = [
      () => Promise.resolve(1),
      () => Promise.resolve(2),
      () => Promise.resolve(3),
    ];

    await asyncBatch(tasks, {
      onProgress: (completed, total) => {
        progressUpdates.push([completed, total]);
      },
    });

    expect(progressUpdates).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it('should throw if all tasks fail', async () => {
    const tasks = [
      () => Promise.reject(new Error('Error 1')),
      () => Promise.reject(new Error('Error 2')),
      () => Promise.reject(new Error('Error 3')),
    ];

    await expect(asyncBatch(tasks)).rejects.toThrow(
      'All tasks failed to execute: Error 1, Error 2, Error 3'
    );
  });
});
