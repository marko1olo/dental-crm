/**
 * apps/web/src/components/settings/doctor/DoctorAnesthesiaToxicityCalculator.tsx
 *
 * @deprecated Устаревший академический калькулятор токсичности анестетиков упразднен
 * в пользу чистой и быстрой панели дефолтов анестезии и карпульных игл:
 * DoctorAnesthesiaDefaultsSection.tsx (Анти-блоат мандат THE HAMMER, Часть 5 Пункт 1).
 *
 * Сохранена обратная совместимость экспортов.
 */

import React from "react";
import { DoctorAnesthesiaDefaultsSection } from "./DoctorAnesthesiaDefaultsSection";

export * from "./DoctorAnesthesiaDefaultsSection";

/**
 * Прокси-компонент обратной совместимости.
 * Рендерит прикладную панель быстрых дефолтов анестезии (1-клик выбор препаратов и игл).
 */
export function DoctorAnesthesiaToxicityCalculator() {
	return <DoctorAnesthesiaDefaultsSection />;
}

export default DoctorAnesthesiaToxicityCalculator;
