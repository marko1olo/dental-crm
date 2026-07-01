import { config } from "dotenv";
config({ path: ".env.local" });
import { personalizePostVisitRecommendations } from "./apps/api/dist/ai/postVisitPersonalize.js";

console.log("Testing...");
personalizePostVisitRecommendations({
  careTopic: "Терапия", procedureName: "Лечение кариеса", toothOrArea: "Зуб 1.1", doctorFullName: "Иванов И.И."
}).then(r => console.log(JSON.stringify(r))).catch(console.error);
