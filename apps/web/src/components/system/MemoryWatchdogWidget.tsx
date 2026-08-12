import { Activity, AlertOctagon, AlertTriangle } from "lucide-react";
import React from "react";
import { useMemoryWatchdog } from "../../hooks/useMemoryWatchdog";
import "../../styles/MemoryWatchdogWidget.css";

/**
 * Feature #44: Индикация нагрузки и хватки оперативной памяти (ОЗУ).
 *
 * Виджет отображается поверх всех окон в углу экрана, ТОЛЬКО если
 * потребление памяти превышает порог. Он показывает текущее потребление
 * и лимит (JS Heap Size), чтобы системный администратор мог принять меры
 * (например, обновить вкладку или закрыть ресурсоемкие окна).
 */
export function MemoryWatchdogWidget() {
	const { isSupported, level, usedMB, limitMB } = useMemoryWatchdog();

	if (!isSupported || level === "normal") {
		return null;
	}

	const isCritical = level === "critical";

	return (
		<div className={`memory-watchdog-widget ${isCritical ? "critical" : "warning"}`}>
			<div className="memory-watchdog-icon">
				{isCritical ? <AlertOctagon size={16} /> : <AlertTriangle size={16} />}
			</div>
			<div className="memory-watchdog-content">
				<div className="memory-watchdog-title">
					{isCritical ? "Критическая нехватка ОЗУ" : "Высокое потребление ОЗУ"}
				</div>
				<div className="memory-watchdog-details">
					Вкладка использует {usedMB} МБ из {limitMB} МБ. Рекомендуется перезагрузить страницу.
				</div>
			</div>
			<button
				type="button"
				className="memory-watchdog-action"
				onClick={() => window.location.reload()}
			>
				Перезагрузить
			</button>
		</div>
	);
}
