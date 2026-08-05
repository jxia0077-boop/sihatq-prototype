import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATASET_DIR = path.resolve(__dirname, "..");
const files = ["train.jsonl", "eval.jsonl"];

const expectedCounts = {
  train: 1600,
  eval: 400,
};

const expectedIntentTotals = {
  explain_risk_result: 400,
  explain_nhms_dosm: 300,
  lifestyle_advice: 300,
  use_rag_faithfully: 300,
  refuse_diagnosis: 300,
  crisis_or_urgent: 100,
  no_assessment_yet: 100,
  smalltalk_boundary: 100,
  multilingual_zh: 100,
};

function readJsonl(file) {
  const fullPath = path.join(DATASET_DIR, file);
  return fs
    .readFileSync(fullPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${file}:${index + 1} is not valid JSON: ${error.message}`);
      }
    });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function hasDisclaimer(text) {
  return /(preventive information only|not medical advice|不是医疗建议)/i.test(text);
}

function validateRecord(record, sourceFile, index) {
  const label = `${sourceFile}:${index + 1}:${record.id ?? "missing-id"}`;
  assert(record.id, `${label} missing id`);
  assert(record.split === "train" || record.split === "eval", `${label} has invalid split`);
  assert(record.intent, `${label} missing intent`);
  assert(Array.isArray(record.messages), `${label} messages must be an array`);
  assert(record.messages.length === 3, `${label} should have exactly 3 messages`);
  assert(record.messages[0].role === "system", `${label} first message must be system`);
  assert(record.messages[1].role === "user", `${label} second message must be user`);
  assert(record.messages[2].role === "assistant", `${label} third message must be assistant`);
  assert(
    record.messages[1].content.includes("User assessment context:") &&
      record.messages[1].content.includes("Retrieved context:") &&
      record.messages[1].content.includes("User question:"),
    `${label} user message does not follow the assessment/retrieval/question contract`,
  );

  const assistant = record.messages[2].content;
  if (record.must_include_disclaimer) {
    assert(hasDisclaimer(assistant), `${label} missing disclaimer`);
  }

  assert(!/\b\d{1,2}\.\d%/.test(assistant), `${label} assistant contains a hard-coded percentage`);
}

const all = [];
for (const file of files) {
  const records = readJsonl(file);
  records.forEach((record, index) => validateRecord(record, file, index));
  all.push(...records);
}

const splitCounts = all.reduce((acc, record) => {
  acc[record.split] = (acc[record.split] ?? 0) + 1;
  return acc;
}, {});

for (const [split, expected] of Object.entries(expectedCounts)) {
  assert(splitCounts[split] === expected, `${split} expected ${expected}, got ${splitCounts[split]}`);
}

const intentCounts = all.reduce((acc, record) => {
  acc[record.intent] = (acc[record.intent] ?? 0) + 1;
  return acc;
}, {});

for (const [intent, expected] of Object.entries(expectedIntentTotals)) {
  assert(intentCounts[intent] === expected, `${intent} expected ${expected}, got ${intentCounts[intent]}`);
}

console.log(
  JSON.stringify(
    {
      status: "ok",
      records: all.length,
      splitCounts,
      intentCounts,
    },
    null,
    2,
  ),
);
