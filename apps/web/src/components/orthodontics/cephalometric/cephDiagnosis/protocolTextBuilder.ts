import type { DentalMeasurementsResult } from "../dentalMeasurements";
import type { SkeletalMeasurementsResult } from "../skeletalMeasurements";

export function buildCephalometricProtocolText(
	skeletal: SkeletalMeasurementsResult,
	dental: DentalMeasurementsResult,
	growthPatternRu: string,
	summaryRu: string,
): string {
	const { snaVal, snaInterp, snbVal, snbInterp, anbVal, anbInterp, facialAngleVal, facialAngleInterp, convexityVal, convexityInterp, abPlaneVal, abPlaneInterp, witsVal, witsInterp, mcnamaraAVal, mcnamaraAInterp, mcnamaraPogVal, mcnamaraPogInterp, snGognVal, snGognInterp, fmaVal, fmaInterp, yAxisVal, yAxisInterp, cantOpVal, cantOpInterp, mmAngleVal, mmInterp } = skeletal;
	const { u1SnVal, u1SnInterp, u1NaAngleVal, u1NaAngleInterp, u1NaDistVal, u1NaDistInterp, l1MpVal, l1MpInterp, l1NbAngleVal, l1NbAngleInterp, l1NbDistVal, l1NbDistInterp, u1L1Val, u1L1Interp } = dental;

	const dateStr = new Date().toLocaleDateString("ru-RU");

	return `ПРОТОКОЛ ТЕЛЕРЕНТГЕНОГРАФИЧЕСКОГО (ТРГ) ИССЛЕДОВАНИЯ В БОКОВОЙ ПРОЕКЦИИ
(Медицинская карта пациента · Анализ по Steiner, Tweed, Downs, Jacobson, Ricketts, McNamara)
Дата расчета: ${dateStr}

1. Сагиттальные скелетные взаимоотношения (Steiner, Downs, Jacobson, McNamara):
• Угол SNA: ${snaVal !== null ? `${snaVal}° (Норма 82°±2°)` : "—"} — ${snaInterp}
• Угол SNB: ${snbVal !== null ? `${snbVal}° (Норма 80°±2°)` : "—"} — ${snbInterp}
• Угол ANB: ${anbVal !== null ? `${anbVal}° (Норма 2°±2°)` : "—"} — ${anbInterp}
• Лицевой угол (Downs / N-Pog to FH): ${facialAngleVal !== null ? `${facialAngleVal}° (Норма 87.8°±3.6°)` : "—"} — ${facialAngleInterp}
• Угол выпуклости (Downs / N-A-Pog): ${convexityVal !== null ? `${convexityVal >= 0 ? "+" : ""}${convexityVal}° (Норма 0°±5°)` : "—"} — ${convexityInterp}
• Угол плоскости A-B (Downs): ${abPlaneVal !== null ? `${abPlaneVal}° (Норма -4.6°±3.2°)` : "—"} — ${abPlaneInterp}
• Wits-число (Jacobson): ${witsVal !== null ? `${witsVal >= 0 ? "+" : ""}${witsVal} мм (Норма 0±1 мм)` : "—"} — ${witsInterp}
• Точка A к N-Perp (McNamara): ${mcnamaraAVal !== null ? `${mcnamaraAVal >= 0 ? "+" : ""}${mcnamaraAVal} мм (Норма 0±2 мм)` : "—"} — ${mcnamaraAInterp}
• Погонион к N-Perp (McNamara): ${mcnamaraPogVal !== null ? `${mcnamaraPogVal >= 0 ? "+" : ""}${mcnamaraPogVal} мм (Норма -2±2 мм)` : "—"} — ${mcnamaraPogInterp}

2. Вертикальные параметры и тип лицевого роста (Tweed, Steiner, Downs, Ricketts):
• Угол SN-GoGn: ${snGognVal !== null ? `${snGognVal}° (Норма 32°±3°)` : "—"} — ${snGognInterp}
• Угол FMA (Tweed): ${fmaVal !== null ? `${fmaVal}° (Норма 25°±3°)` : "—"} — ${fmaInterp}
• Y-ось роста (Downs / S-Gn to FH): ${yAxisVal !== null ? `${yAxisVal}° (Норма 59.4°±3.8°)` : "—"} — ${yAxisInterp}
• Наклон окклюзионной плоскости (Downs / Cant of OP): ${cantOpVal !== null ? `${cantOpVal}° (Норма 9.3°±3.8°)` : "—"} — ${cantOpInterp}
• Межбазисный угол NL-ML (Ricketts): ${mmAngleVal !== null ? `${mmAngleVal}° (Норма 25°±4°)` : "—"} — ${mmInterp}
• Тип роста: ${growthPatternRu}

3. Дентальные характеристики и наклон резцов (Steiner, Tweed):
• Инклинация верхних резцов к N-A (1-NA угол): ${u1NaAngleVal !== null ? `${u1NaAngleVal}° (Норма 22°±2°)` : "—"} — ${u1NaAngleInterp}
• Сагиттальное положение верхних резцов (1-NA мм): ${u1NaDistVal !== null ? `${u1NaDistVal >= 0 ? "+" : ""}${u1NaDistVal} мм (Норма 4±1 мм)` : "—"} — ${u1NaDistInterp}
• Инклинация нижних резцов к N-B (1-NB угол): ${l1NbAngleVal !== null ? `${l1NbAngleVal}° (Норма 25°±2°)` : "—"} — ${l1NbAngleInterp}
• Сагиттальное положение нижних резцов (1-NB мм): ${l1NbDistVal !== null ? `${l1NbDistVal >= 0 ? "+" : ""}${l1NbDistVal} мм (Норма 4±1 мм)` : "—"} — ${l1NbDistInterp}
• Инклинация верхних резцов к SN (U1-SN): ${u1SnVal !== null ? `${u1SnVal}° (Норма 104°±2°)` : "—"} — ${u1SnInterp}
• Наклон нижних резцов (L1-MP / IMPA): ${l1MpVal !== null ? `${l1MpVal}° (Норма 90°±3°)` : "—"} — ${l1MpInterp}
• Межрезцовый угол (U1-L1): ${u1L1Val !== null ? `${u1L1Val}° (Норма 131°±5°)` : "—"} — ${u1L1Interp}

ЗАКЛЮЧЕНИЕ ЦЕФАЛОМЕТРИИ (ТРГ):
${summaryRu}
Рекомендована ортодонтическая коррекция с учетом индивидуального вектора роста лицевого скелета, торка резцовой группы и скелетного профиля.`;
}
