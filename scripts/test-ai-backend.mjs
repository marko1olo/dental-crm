import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// 1. Вспомогательная функция загрузки .env файлов
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  content.split(/\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const parts = trimmed.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim().replace(/^["']|["']$/g, "");
      process.env[key] = val;
    }
  });
  console.log(`Loaded environment from: ${filePath}`);
}

loadEnvFile("C:\\Users\\Admin\\Desktop\\dvachbot\\.env");
loadEnvFile(path.resolve(process.cwd(), ".env.local"));

// Импортируем динамический настройщик прокси и туннелей из собранного бэкенда
import { setupProxyAndTunnels } from "../apps/api/dist/server.js";
console.log("Running proxy and tunnel diagnostics for integration test...");
await setupProxyAndTunnels().catch(err => {
  console.error("Proxy diagnostics failure during test initialization:", err);
});

// Импортируем функции ИИ из собранного бэкенда
import { buildVisitDraftFromTranscript } from "../apps/api/dist/ai/visitDraft.js";
import { polishSpeechTranscript } from "../apps/api/dist/speech/polish.js";

const testTranscript = "пациент жалуется на острую боль в нижнем левом зубе три шесть при накусывании. объективно глубокий кариес тридцать шестого, перкуссия резко болезненна. сделаем снимок. диагноз пульпит тридцать шестого. в плане депульпирование, пломбирование каналов.";

async function runTest() {
  console.log("\n=== НАЧАЛО ТЕСТИРОВАНИЯ ИИ-ИНТЕГРАЦИИ ===");
  console.log("Тестовая диктовка врача:", testTranscript);

  // --- Тест 1: Google Gemini ---
  console.log("\n--- Тест 1: Google Gemini (gemini-1.5-flash) ---");
  process.env.DENTAL_SPEECH_POLISH_PROVIDER = "gemini";
  process.env.DENTAL_SPEECH_NEURAL_POLISH = "true";
  process.env.DENTAL_AI_NEURAL_DRAFT = "true";
  
  try {
    console.log("Вызов polishSpeechTranscript через Gemini...");
    const polishResult = await polishSpeechTranscript({
      transcript: testTranscript,
      specialty: "therapist"
    });
    console.log("Результат полировки речи Gemini:", JSON.stringify(polishResult, null, 2));

    console.log("Вызов buildVisitDraftFromTranscript через Gemini...");
    const draftResult = await buildVisitDraftFromTranscript(testTranscript, "therapist");
    console.log("Результат генерации черновика ЭМК Gemini:", JSON.stringify(draftResult, null, 2));
  } catch (err) {
    console.error("Ошибка при тестировании Gemini:", err);
  }

  // Делаем небольшую паузу 3 секунды, чтобы не спамить API провайдеров
  console.log("\nПауза 3 секунды для защиты лимитов...");
  await new Promise(r => setTimeout(r, 3000));

  // --- Тест 2: Groq ---
  console.log("\n--- Тест 2: Groq (llama-3.3-70b-versatile) ---");
  process.env.DENTAL_SPEECH_POLISH_PROVIDER = "groq";
  
  try {
    console.log("Вызов polishSpeechTranscript через Groq...");
    const polishResult = await polishSpeechTranscript({
      transcript: testTranscript,
      specialty: "therapist"
    });
    console.log("Результат полировки речи Groq:", JSON.stringify(polishResult, null, 2));

    console.log("Вызов buildVisitDraftFromTranscript через Groq...");
    const draftResult = await buildVisitDraftFromTranscript(testTranscript, "therapist");
    console.log("Результат генерации черновика ЭМК Groq:", JSON.stringify(draftResult, null, 2));
  } catch (err) {
    console.error("Ошибка при тестировании Groq:", err);
  }
  
  console.log("\n=== ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ===");
}

runTest().catch(console.error);
