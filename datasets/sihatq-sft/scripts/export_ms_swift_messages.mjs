import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATASET_DIR = path.resolve(__dirname, "..");

async function convert(inputFile, outputFile) {
  const raw = await fs.readFile(path.join(DATASET_DIR, inputFile), "utf8");
  const rows = raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const record = JSON.parse(line);
      return JSON.stringify({ messages: record.messages });
    });

  await fs.writeFile(path.join(DATASET_DIR, outputFile), rows.join("\n") + "\n");
  return rows.length;
}

const trainCount = await convert("train.jsonl", "train.ms-swift.jsonl");
const evalCount = await convert("eval.jsonl", "eval.ms-swift.jsonl");

console.log(
  JSON.stringify(
    {
      train: { file: "train.ms-swift.jsonl", records: trainCount },
      eval: { file: "eval.ms-swift.jsonl", records: evalCount },
    },
    null,
    2,
  ),
);
