import { AiOrchestrator } from './apps/web/src/lib/aiOrchestrator.ts';
import { smartBookingParser } from './apps/web/src/lib/smartBookingParser.ts';

const mockDashboard = {
  clinicSettings: {
    staff: [
      { id: '1', role: 'doctor', fullName: 'Иванов Иван' },
      { id: '2', role: 'assistant', fullName: 'Петров Петр' }
    ],
    chairs: [ { id: 'c1', label: 'Кресло 1' } ]
  },
  patientInsights: []
};

const testPhrases = [
  { text: "Запиши Иванова Ивана на завтра в 14:00 к доктору Смирнову на кариес.", expectedRoute: "schedule_appointment" },
  { text: "Пришел с острой болью в 47 зубе, пульпит, провел экстирпацию, положил кальсепт, закрыл времянкой.", expectedRoute: "fill_emk" },
  { text: "Посмотри карту Петрова, нет ли там косяков с согласиями за прошлый месяц?", expectedRoute: "clinical_audit" },
  { text: "На панорамном снимке вижу ретенцию 38 зуба и кисту в области 46.", expectedRoute: "imaging_analysis" },
  { text: "Напиши Сидорову в телеграм, чтобы не забыл выпить антибиотик.", expectedRoute: "patient_communication" },
  { text: "Паспорт выдан МВД России по гор. Москве 12 апреля 2020 года.", expectedRoute: "parse_patient_document" },
  { text: "Короче, перенеси этого хрена с пятницы на следующую среду, скажи ему что у меня выходной.", expectedRoute: "schedule_appointment" }
];

console.log("=== STARTING DEEP QA TEST: AI ORCHESTRATOR ===\\n");

testPhrases.forEach((phrase, index) => {
  console.log(`\\nTest #${index + 1}: "${phrase.text}"`);
  
  const intent = AiOrchestrator.detectIntent(phrase.text);
  console.log(`  -> Intent Detect: ${intent === phrase.expectedRoute ? 'PASSED' : 'FAILED'} (Got: ${intent}, Expected: ${phrase.expectedRoute})`);

  let result;
  if (intent === "schedule_appointment") result = AiOrchestrator.processScheduleBooking(phrase.text, mockDashboard as any);
  if (intent === "fill_emk") result = AiOrchestrator.processEmkDictation(phrase.text);
  
  if (result) {
    if (result.source === "local_algorithm") {
      console.log(`  -> Action Route: LOCAL ALGORITHM (Successfully parsed fast locally)`);
      console.log(`  -> Local Data:`, JSON.stringify(result.data).slice(0, 100) + "...");
    } else {
      console.log(`  -> Action Route: LLM REQUIRED (Complex phrase, routed to LLM)`);
      console.log(`  -> Generated Prompt:`, result.suggestedPrompt?.slice(0, 100) + "...");
    }
  }
});
