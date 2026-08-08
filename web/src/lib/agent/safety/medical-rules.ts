export const MEDICAL_SAFETY_REPLY = `I can't provide a medical diagnosis, prescribe medicines, or tell you to start/stop treatment.

SihatQ only shares preventive education based on your assessment signals and public Malaysian health statistics (such as NHMS/DOSM).

If you feel unwell, have urgent symptoms, or need personal medical decisions, please consult a qualified doctor or nearby clinic.`;

type RuleHit = { id: string; reason: string };

const INPUT_RULES: { id: string; re: RegExp; reason: string }[] = [
  {
    id: "ask-diagnosis",
    re: /\b(do i have|have i got|am i (sick|ill)|diagnose me|what disease|给我诊断|我是不是得了|我得了什么病)\b/i,
    reason: "Requests a personal disease diagnosis",
  },
  {
    id: "ask-prescription",
    re: /\b(prescribe|prescription|what (medicine|drug|pill)|dosage|mg\b|停药|开药|吃什么药|药量)\b/i,
    reason: "Requests prescribing or dosing advice",
  },
  {
    id: "ask-stop-med",
    re: /\b(stop taking|discontinue|quit)\b.{0,40}\b(medicine|medication|metformin|insulin|drug)|停(掉|用).{0,20}(药|二甲双胍|胰岛素)/i,
    reason: "Requests stopping medication",
  },
];

const OUTPUT_RULES: { id: string; re: RegExp; reason: string }[] = [
  {
    id: "assert-diagnosis",
    re: /\b(you have|you've got|you are diagnosed with|确诊你患有|你得了)\b.{0,40}\b(diabetes|hypertension|cancer|diabetes mellitus|糖尿病|高血压|癌症)/i,
    reason: "Asserts a personal diagnosis",
  },
  {
    id: "prescribe",
    re: /\b(you should take|i prescribe|start taking|take \d+\s*mg)\b|建议你服用|给你开/i,
    reason: "Gives prescribing-style instruction",
  },
  {
    id: "stop-med",
    re: /\b(stop taking|discontinue your)\b.{0,30}\b(medicine|medication|metformin|insulin)|请立即停药/i,
    reason: "Advises stopping medication",
  },
];

export function checkUserMedicalRules(text: string): RuleHit | null {
  for (const rule of INPUT_RULES) {
    if (rule.re.test(text)) return { id: rule.id, reason: rule.reason };
  }
  return null;
}

export function checkAssistantMedicalRules(text: string): RuleHit | null {
  for (const rule of OUTPUT_RULES) {
    if (rule.re.test(text)) return { id: rule.id, reason: rule.reason };
  }
  return null;
}
