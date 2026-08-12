/**
 * Feature #44: Индикация нагрузки и хватки оперативной памяти (ОЗУ).
 *
 * Хук отслеживает объем памяти, потребляемый вкладкой (работает в Chromium).
 * Для системных администраторов клиники это способ вовремя заметить утечки памяти
 * (например, если вкладка висит открытой неделями на стойке администратора).
 */

import { useEffect, useState } from "react";

export interface MemoryStatus {
	isSupported: boolean;
	usedMB: number;
	totalMB: number;
	limitMB: number;
	level: "normal" | "warning" | "critical";
}

const WARNING_THRESHOLD_MB = 400; // Желтая зона
const CRITICAL_THRESHOLD_MB = 800; // Красная зона

export function useMemoryWatchdog(intervalMs = 10000): MemoryStatus {
	const [status, setStatus] = useState<MemoryStatus>({
		isSupported: false,
		usedMB: 0,
		totalMB: 0,
		limitMB: 0,
		level: "normal",
	});

	useEffect(() => {
		// biome-ignore lint/suspicious/noExplicitAny: window.performance.memory is non-standard
		const memory = (window.performance as any).memory;
		if (!memory) return;

		const checkMemory = () => {
			const usedMB = Math.round(memory.usedJSHeapSize / (1024 * 1024));
			const totalMB = Math.round(memory.totalJSHeapSize / (1024 * 1024));
			const limitMB = Math.round(memory.jsHeapSizeLimit / (1024 * 1024));

			let level: "normal" | "warning" | "critical" = "normal";
			if (usedMB > CRITICAL_THRESHOLD_MB) level = "critical";
			else if (usedMB > WARNING_THRESHOLD_MB) level = "warning";

			setStatus({
				isSupported: true,
				usedMB,
				totalMB,
				limitMB,
				level,
			});
		};

		checkMemory();
		const timer = setInterval(checkMemory, intervalMs);
		return () => clearInterval(timer);
	}, [intervalMs]);

	return status;
}
