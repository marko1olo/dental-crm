/**
 * mischBoneDensity.ts — Классификация плотности кости по шкале Миша D1-D5 (Мандат 8b <= 120 строк).
 */

import type { BoneDensityRecommendation } from "./types";

export const MISCH_THRESHOLDS = {
	D1_MIN: 1250,
	D2_MIN: 850,
	D3_MIN: 350,
	D4_MIN: 150,
} as const;

export function classifyMischBoneDensity(hu: number): BoneDensityRecommendation {
	if (!Number.isFinite(hu)) {
		return {
			mischClass: "D5", huRange: "N/A", label: "Неопределенная плотность (NaN / N/A)",
			description: "Некорректные или отсутствующие денситометрические данные.", drillingRpm: "—",
			torqueNcm: "—", irrigation: false, corticalTap: false, underDrilling: false, underDrillingMm: 0,
			osteotomeCondensation: false, clinicalAdvice: "Недостаточно данных для формирования протокола.",
		};
	}
	if (hu < 0) {
		return {
			mischClass: "D5", huRange: "<0 HU (Воздух / Дефект / Синус)",
			label: "Дефект / Воздушная полость / Мягкие ткани (<0 HU)",
			description: "Плотность соответствует воздуху (-1000 HU), синусу или дефекту.", drillingRpm: "—",
			torqueNcm: "0 N·cm", irrigation: false, corticalTap: false, underDrilling: false, underDrillingMm: 0,
			osteotomeCondensation: false, clinicalAdvice: "Имплантация без костной пластики НЕВОЗМОЖНА! Показан синус-лифтинг или НКР.",
		};
	}
	if (hu > MISCH_THRESHOLDS.D1_MIN) {
		return {
			mischClass: "D1", huRange: ">1250 HU", label: "D1 — Плотная кортикальная кость (Oak-like)",
			description: "Гомогенная плотная кортикальная пластинка, минимальная васкуляризация.", drillingRpm: "400–600 RPM",
			torqueNcm: "40–45 N·cm", irrigation: true, corticalTap: true, underDrilling: false, underDrillingMm: 0,
			osteotomeCondensation: false, clinicalAdvice: "ОБЯЗАТЕЛЕН кортикальный метчик (Cortical Tap) на 100% длины. Обильное охлаждение!",
		};
	}
	if (hu >= MISCH_THRESHOLDS.D2_MIN) {
		return {
			mischClass: "D2", huRange: "850–1250 HU", label: "D2 — Плотная кортикальная и губчатая кость (Pine-like)",
			description: "Плотный наружный кортикал и плотные трабекулы губчатого вещества.", drillingRpm: "800–1000 RPM",
			torqueNcm: "35–45 N·cm", irrigation: true, corticalTap: false, underDrilling: false, underDrillingMm: 0,
			osteotomeCondensation: false, clinicalAdvice: "Золотой стандарт: отличный прогноз первичной стабильности (ISQ 75+).",
		};
	}
	if (hu >= MISCH_THRESHOLDS.D3_MIN) {
		return {
			mischClass: "D3", huRange: "350–850 HU", label: "D3 — Тонкая кортикальная и мелкопористая губчатая",
			description: "Тонкий кортикальный слой, трабекулярная сеть нормальной плотности.", drillingRpm: "1000–1200 RPM",
			torqueNcm: "30–35 N·cm", irrigation: true, corticalTap: false, underDrilling: false, underDrillingMm: 0,
			osteotomeCondensation: false, clinicalAdvice: "Стандартный протокол с финишным профильным сверлом.",
		};
	}
	if (hu >= MISCH_THRESHOLDS.D4_MIN) {
		return {
			mischClass: "D4", huRange: "150–350 HU", label: "D4 — Мягкая крупнопористая губчатая кость",
			description: "Очень тонкий кортикальный слой или его отсутствие, редкие трабекулы.", drillingRpm: "1000–1200 RPM",
			torqueNcm: "25–30 N·cm", irrigation: false, corticalTap: false, underDrilling: true, underDrillingMm: 1.0,
			osteotomeCondensation: true, clinicalAdvice: "Применить недопрепарирование (Under-drilling на 1.0 мм) и компрессию.",
		};
	}
	return {
		mischClass: "D5", huRange: "0–150 HU", label: "D5 — Незрелая слабоминерализованная кость / Дефект",
		description: "Критически низкая плотность (<150 HU), незрелый регенерат или фиброзная ткань.", drillingRpm: "—",
		torqueNcm: "0–15 N·cm", irrigation: false, corticalTap: false, underDrilling: false, underDrillingMm: 0,
		osteotomeCondensation: false, clinicalAdvice: "Установка стандартного имплантата противопоказана без предварительной костной пластики (GBR / аугментация).",
	};
}
