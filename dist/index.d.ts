/// <reference types="node" />
import * as client from 'prom-client';
/**
 * Indicates the process is being ran in PM2's cluster mode
 */
export declare const isClusterMode: boolean;
/**
 * Returns the aggregate metric if running in cluster mode, otherwise, just the current
 * instance's metrics
 * @param timeoutInMilliseconds How long to wait for other processes to provide their metrics.
 */
export declare function getAggregateMetrics(timeoutInMilliseconds?: number): Promise<client.Registry>;
/**
 * Creates a timer which executes when the current time is cleanly divisible by `syncTimeInMS`
 * @param syncTimeInMilliseconds The time, in milliseconds
 * @param fun The function to execute
 * @returns The timer handle
 */
export declare function timeSyncRun(syncTimeInMilliseconds: number, fun: () => void): NodeJS.Timer;
