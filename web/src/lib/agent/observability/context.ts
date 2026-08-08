import { AsyncLocalStorage } from "node:async_hooks";
import type { AgentTraceRecorder } from "@/lib/agent/observability/recorder";

const storage = new AsyncLocalStorage<AgentTraceRecorder>();

export function getActiveTrace(): AgentTraceRecorder | undefined {
  return storage.getStore();
}

export function runWithTrace<T>(
  recorder: AgentTraceRecorder,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(recorder, fn);
}
