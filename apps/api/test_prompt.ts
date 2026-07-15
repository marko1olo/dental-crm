import { buildDentalSttPrompt } from "./src/speech/dentalPrompt.js";

const prompt = buildDentalSttPrompt({
	providerId: "groq_whisper",
	specialty: "universal",
	source: "visit",
});
const byteLen = Buffer.byteLength(prompt ?? "", "utf8");
console.log("PROMPT CHARS:", prompt?.length);
console.log("PROMPT BYTES:", byteLen);
