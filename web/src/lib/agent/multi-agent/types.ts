export type WorkerId =
  | "research"
  | "personalization"
  | "safety"
  | "coordinator";

/** Isolated result object — workers never share mutable state. */
export type WorkerResult = {
  workerId: WorkerId;
  ok: boolean;
  summary: string;
  markdown: string;
  sources: string[];
  retrieval?: "pgvector" | "keyword" | "none" | "mixed";
  error?: string;
  startedAt: number;
  finishedAt: number;
};

export type MultiAgentBundle = {
  results: WorkerResult[];
  mergedMarkdown: string;
  sources: string[];
  parallelWorkers: WorkerId[];
};
