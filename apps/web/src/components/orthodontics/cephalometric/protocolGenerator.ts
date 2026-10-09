/**
 * DENTE CRM — Form 043/u Orthodontic Clinical Protocol Generator (Layer 2)
 * Generates structured orthodontic examination protocol according to Russian Health Ministry Order 834n.
 */

import type { CephalometricAnalysisResult } from "./types";

/**
 * Генерирует расширенный протокол ТРГ для медицинской карты 043/у (Приказ Минздрава 834н).
 */
export function generateForm043OrthodonticProtocolText(
	analysis: CephalometricAnalysisResult,
	options?: {
		patientName?: string | undefined;
		doctorName?: string | undefined;
		customScaleMmPerPx?: number | undefined;
	},
): string {
	const pName = options?.patientName || "Пациент";
	const docName = options?.doctorName || "Врач-ортодонт";
	const dateStr = new Date().toLocaleDateString("ru-RU");

	const sna = analysis.measurements.find((m) => m.id === "SNA");
	const snb = analysis.measurements.find((m) => m.id === "SNB");
	const anb = analysis.measurements.find((m) => m.id === "ANB");
	const wits = analysis.measurements.find((m) => m.id === "Wits");
	const fma = analysis.measurements.find((m) => m.id === "FMA");
	const impa = analysis.measurements.find((m) => m.id === "L1-MP");
	const u1sn = analysis.measurements.find((m) => m.id === "U1-SN");
	const u1l1 = analysis.measurements.find((m) => m.id === "U1-L1");
	const u1naAngle = analysis.measurements.find((m) => m.id === "1-NA-Angle");
	const u1naDist = analysis.measurements.find((m) => m.id === "1-NA-Dist");
	const l1nbAngle = analysis.measurements.find((m) => m.id === "1-NB-Angle");
	const l1nbDist = analysis.measurements.find((m) => m.id === "1-NB-Dist");
	const mcnamaraA = analysis.measurements.find((m) => m.id === "McNamara-A-Nperp");
	const mcnamaraPog = analysis.measurements.find((m) => m.id === "McNamara-Pog-Nperp");

	return `ПРОТОКОЛ ЦЕФАЛОМЕТРИЧЕСКОГО АНАЛИЗА ТРГ В БОКОВОЙ ПРОЕКЦИИ
(Медицинская карта 043/у · Приказ МЗ РФ №834н · Штайнер, Твид, Даунс, Якобсон, Макнамара)
Пациент: ${pName}
Врач: ${docName}
Дата исследования: ${dateStr}

1. САГИТТАЛЬНЫЕ СКЕЛЕТНЫЕ СООТНОШЕНИЯ (Steiner, Jacobson, McNamara):
• SNA: ${sna?.value !== null && sna?.value !== undefined ? `${sna.value.toFixed(1)}° (Норма 82°±2°)` : "—"} — ${sna?.clinicalInterpretation || "—"}
• SNB: ${snb?.value !== null && snb?.value !== undefined ? `${snb.value.toFixed(1)}° (Норма 80°±2°)` : "—"} — ${snb?.clinicalInterpretation || "—"}
• ANB: ${anb?.value !== null && anb?.value !== undefined ? `${anb.value.toFixed(1)}° (Норма 2°±2°)` : "—"} — ${anb?.clinicalInterpretation || "—"}
• Wits-число (Wits Appraisal): ${wits?.value !== null && wits?.value !== undefined ? `${wits.value >= 0 ? "+" : ""}${wits.value.toFixed(1)} мм (Норма 0±1 мм)` : "—"} — ${wits?.clinicalInterpretation || "—"}
• A to N-perp (McNamara): ${mcnamaraA?.value !== null && mcnamaraA?.value !== undefined ? `${mcnamaraA.value >= 0 ? "+" : ""}${mcnamaraA.value.toFixed(1)} мм (Норма 0±2 мм)` : "—"} — ${mcnamaraA?.clinicalInterpretation || "—"}
• Pog to N-perp (McNamara): ${mcnamaraPog?.value !== null && mcnamaraPog?.value !== undefined ? `${mcnamaraPog.value >= 0 ? "+" : ""}${mcnamaraPog.value.toFixed(1)} мм (Норма -2±2 мм)` : "—"} — ${mcnamaraPog?.clinicalInterpretation || "—"}
• Скелетный класс: ${analysis.diagnosis.skeletalClassRu}

2. ВЕРТИКАЛЬНЫЕ ПАРАМЕТРЫ И ТИП РОСТА (Tweed, Steiner):
• FMA (Tweed): ${fma?.value !== null && fma?.value !== undefined ? `${fma.value.toFixed(1)}° (Норма 25°±3°)` : "—"} — ${fma?.clinicalInterpretation || "—"}
• Тип роста лицевого скелета: ${analysis.diagnosis.growthPatternRu}

3. ДЕНТАЛЬНЫЕ ПАРАМЕТРЫ И НАКЛОН РЕЗЦОВ (Steiner, Tweed):
• Инклинация верхних резцов к N-A (1-NA угол): ${u1naAngle?.value !== null && u1naAngle?.value !== undefined ? `${u1naAngle.value.toFixed(1)}° (Норма 22°±2°)` : "—"} — ${u1naAngle?.clinicalInterpretation || "—"}
• Положение верхних резцов к N-A (1-NA мм): ${u1naDist?.value !== null && u1naDist?.value !== undefined ? `${u1naDist.value >= 0 ? "+" : ""}${u1naDist.value.toFixed(1)} мм (Норма 4±1 мм)` : "—"} — ${u1naDist?.clinicalInterpretation || "—"}
• Инклинация нижних резцов к N-B (1-NB угол): ${l1nbAngle?.value !== null && l1nbAngle?.value !== undefined ? `${l1nbAngle.value.toFixed(1)}° (Норма 25°±2°)` : "—"} — ${l1nbAngle?.clinicalInterpretation || "—"}
• Положение нижних резцов к N-B (1-NB мм): ${l1nbDist?.value !== null && l1nbDist?.value !== undefined ? `${l1nbDist.value >= 0 ? "+" : ""}${l1nbDist.value.toFixed(1)} мм (Норма 4±1 мм)` : "—"} — ${l1nbDist?.clinicalInterpretation || "—"}
• Инклинация верхних резцов (U1-SN): ${u1sn?.value !== null && u1sn?.value !== undefined ? `${u1sn.value.toFixed(1)}° (Норма 104°±2°)` : "—"} — ${u1sn?.clinicalInterpretation || "—"}
• Наклон нижних резцов IMPA (L1-MP): ${impa?.value !== null && impa?.value !== undefined ? `${impa.value.toFixed(1)}° (Норма 90°±3°)` : "—"} — ${impa?.clinicalInterpretation || "—"}
• Межрезцовый угол (U1-L1): ${u1l1?.value !== null && u1l1?.value !== undefined ? `${u1l1.value.toFixed(1)}° (Норма 131°±5°)` : "—"} — ${u1l1?.clinicalInterpretation || "—"}

ЗАКЛЮЧЕНИЕ ЦЕФАЛОМЕТРИИ (ТРГ):
${analysis.diagnosis.summaryRu}`;
}
