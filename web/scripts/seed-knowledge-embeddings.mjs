/**
 * Seed knowledge_chunks + Gemini embeddings into Supabase.
 *
 * Prerequisites:
 * 1. Run supabase/migrations/004_pgvector_knowledge.sql in SQL Editor
 * 2. .env.local has NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
 *
 * Usage: npm run seed:knowledge
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  const envText = readFileSync(join(root, ".env.local"), "utf8");
  for (const line of envText.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const val = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

const CHUNKS = [
  {
    id: "nhms-diabetes",
    title: "NHMS 2023 Diabetes",
    tags: ["diabetes", "metabolic", "sugar", "glucose", "screening", "blood"],
    content:
      "NHMS 2023 Key Findings: about 15.6% of Malaysian adults have diabetes. Higher age and family history of diabetes are common risk signals. Preventive actions include blood glucose screening and reducing sugary drinks.",
    source: "NHMS 2023 Key Findings",
  },
  {
    id: "nhms-hypertension",
    title: "NHMS 2023 Hypertension",
    tags: ["hypertension", "blood pressure", "bp", "heart", "cardiovascular"],
    content:
      "NHMS 2023 Key Findings: about 29.2% of Malaysian adults have hypertension. Regular blood pressure checks and lifestyle changes (salt reduction, walking) are common preventive steps.",
    source: "NHMS 2023 Key Findings",
  },
  {
    id: "nhms-cholesterol",
    title: "NHMS 2023 High Cholesterol",
    tags: ["cholesterol", "heart", "cardiovascular", "lipid"],
    content:
      "NHMS 2023 Key Findings: about 33.3% of Malaysian adults have high cholesterol. Heart family history, smoking, and low activity can raise cardiovascular attention.",
    source: "NHMS 2023 Key Findings",
  },
  {
    id: "nhms-obesity",
    title: "NHMS 2023 Overweight/Obesity",
    tags: ["obesity", "overweight", "weight", "exercise", "walk", "steps"],
    content:
      "NHMS 2023 Key Findings: about 54.4% of Malaysian adults are overweight or obese. Daily walking and reducing sugary drinks are practical first steps.",
    source: "NHMS 2023 Key Findings",
  },
  {
    id: "dosm-ihd",
    title: "DOSM 2024 Ischaemic Heart Diseases",
    tags: ["heart", "cardiovascular", "ischaemic", "death", "mortality", "dosm"],
    content:
      "DOSM Statistics on Causes of Death, Malaysia 2025 (reporting 2024 deaths): ischaemic heart diseases were the principal cause of medically certified deaths (13.0%, 17,421 deaths). For ages 41–59, IHD was the leading cause (17.6%). Used only as national mortality context, not diagnosis.",
    source: "DOSM Statistics on Causes of Death, Malaysia, 2025",
  },
  {
    id: "dosm-pneumonia",
    title: "DOSM 2024 Pneumonia",
    tags: ["pneumonia", "death", "mortality", "elderly", "60+", "dosm"],
    content:
      "DOSM 2025 release (2024 deaths): pneumonia was the second highest cause of medically certified deaths nationally (11.5%, 15,332 deaths), and the principal cause for ages 60+ (13.9%). National mortality context only.",
    source: "DOSM Statistics on Causes of Death, Malaysia, 2025",
  },
  {
    id: "dosm-diabetes-death",
    title: "DOSM 2024 Diabetes Mellitus Deaths",
    tags: ["diabetes", "death", "mortality", "metabolic", "dosm"],
    content:
      "DOSM 2025 release (2024 deaths): diabetes mellitus accounted for 5.2% of medically certified deaths (6,929 deaths). This is mortality context; NHMS prevalence (15.6% of adults) is a separate prevalence statistic.",
    source: "DOSM Statistics on Causes of Death, Malaysia, 2025",
  },
  {
    id: "dosm-transport",
    title: "DOSM 2024 Transport Accidents",
    tags: ["transport", "accident", "death", "young", "15-40", "mortality", "dosm"],
    content:
      "DOSM 2025 release (2024 deaths): transport accidents were 3.3% of medically certified deaths nationally, and the principal cause for ages 15–40 (20.0%). National mortality context only.",
    source: "DOSM Statistics on Causes of Death, Malaysia, 2025",
  },
  {
    id: "screening",
    title: "Health screening guidance",
    tags: ["screening", "clinic", "peka", "checkup", "doctor", "test"],
    content:
      "For preventive care in Malaysia, consider blood pressure, blood glucose, and cholesterol screening at a clinic. PeKa B40 may support eligible groups. This app does not book appointments and is not a diagnosis.",
    source: "MOH / PeKa B40 (general guidance)",
  },
  {
    id: "lifestyle-sugar",
    title: "Reduce sugary drinks",
    tags: ["sugar", "drink", "soda", "metabolic", "diabetes"],
    content:
      "A practical goal is to reduce sugary drinks to 1–2 times per week and choose water or unsweetened drinks on most days.",
    source: "SihatQ preventive lifestyle guidance",
  },
  {
    id: "lifestyle-activity",
    title: "Physical activity",
    tags: ["exercise", "walk", "steps", "activity", "cardio"],
    content:
      "Starting with 20–30 minutes of walking on most days of the week is a common, low-barrier preventive habit.",
    source: "SihatQ preventive lifestyle guidance",
  },
  {
    id: "disclaimer",
    title: "Safety disclaimer",
    tags: ["diagnosis", "doctor", "safe", "disclaimer", "medical"],
    content:
      "SihatQ provides preventive insight only. It is not a medical diagnosis and does not replace advice from a qualified doctor or clinic.",
    source: "SihatQ Safety Policy",
  },
];

async function embedText(text, apiKey) {
  const model = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${model}`,
        content: { parts: [{ text }] },
        outputDimensionality: 768,
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`embed failed ${response.status}: ${await response.text()}`);
  }
  const data = await response.json();
  const values = data.embedding?.values;
  if (!values?.length) throw new Error("empty embedding");
  return values;
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!geminiKey) {
    throw new Error("Missing GEMINI_API_KEY for embeddings");
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Seeding ${CHUNKS.length} knowledge chunks with embeddings...`);

  for (const chunk of CHUNKS) {
    const text = `${chunk.title}\n${chunk.content}\nTags: ${chunk.tags.join(", ")}`;
    process.stdout.write(`- ${chunk.id} ... `);
    const embedding = await embedText(text, geminiKey);
    const { error } = await supabase.from("knowledge_chunks").upsert(
      {
        id: chunk.id,
        title: chunk.title,
        content: chunk.content,
        source: chunk.source,
        tags: chunk.tags,
        embedding,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) {
      console.log("FAIL");
      throw error;
    }
    console.log(`ok (dim=${embedding.length})`);
    await new Promise((r) => setTimeout(r, 250));
  }

  const { count } = await supabase
    .from("knowledge_chunks")
    .select("id", { count: "exact", head: true });
  console.log(`Done. Rows in knowledge_chunks: ${count}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
