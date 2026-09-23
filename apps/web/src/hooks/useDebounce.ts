import { useEffect, useState } from "react";
import { getOptimizedTiming } from "../utils/lowSpecHddOptimizer";

/**
 * useDebounce — адаптивный дебаунс для поисковых запросов и полей ввода (Mandates 8e, 8k, 8s, 8n).
 *
 * Предотвращает CPU/дисковый троттлинг на медленных HDD (5400 RPM) и слабых процессорах
 * при поиске пациентов, услуг номенклатуры 804н и фильтрации журналов.
 *
 * @param value Значение для дебаунса
 * @param delayMs Задержка в мс (по умолчанию берется из getOptimizedTiming().searchDebounceMs = 280-350 мс)
 */
export function useDebounce<T>(value: T, delayMs?: number): T {
	const timing = getOptimizedTiming();
	const effectiveDelay = delayMs !== undefined ? delayMs : timing.searchDebounceMs;
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, effectiveDelay);

		return () => {
			clearTimeout(handler);
		};
	}, [value, effectiveDelay]);

	return debouncedValue;
}
