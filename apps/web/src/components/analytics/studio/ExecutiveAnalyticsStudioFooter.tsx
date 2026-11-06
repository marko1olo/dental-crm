/**
 * apps/web/src/components/analytics/studio/ExecutiveAnalyticsStudioFooter.tsx
 *
 * Подвал экрана аналитики: экспорт CSV/Excel, печать и РОВНО ОДНА Primary CTA кнопка #0d9488
 * (Мандат 8am: Единый дизайн-код, 1 Primary CTA).
 * (Мандат 8e: Автономия врача, кнопки экспорта и печати никогда не блокируются).
 */

import React from "react";
import { CheckCircle2, Download, Printer, RefreshCw } from "lucide-react";

export interface ExecutiveAnalyticsStudioFooterProps {
	readonly isLoading: boolean;
	readonly exportSuccess: boolean;
	readonly onRefresh: () => void;
	readonly onPrint: () => void;
	readonly onExport: () => void;
}

export const ExecutiveAnalyticsStudioFooter: React.FC<ExecutiveAnalyticsStudioFooterProps> = ({
	isLoading,
	exportSuccess,
	onRefresh,
	onPrint,
	onExport,
}) => {
	return (
		<footer className="studio-footer">
			<div className="flex items-center gap-2 min-w-0">
				<button
					type="button"
					onClick={onRefresh}
					className="studio-secondary-btn"
					title="Обновить показатели"
				>
					<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
					<span className="hidden sm:inline">Обновить</span>
				</button>

				<button
					type="button"
					onClick={onPrint}
					className="studio-secondary-btn"
					title="Распечатать отчёт"
				>
					<Printer className="w-3.5 h-3.5" />
					<span className="hidden sm:inline">Печать</span>
				</button>

				<span className="text-[11px] text-[var(--muted)] truncate hidden md:inline">
					Данные синхронизированы с кассой
				</span>
			</div>

			{/* РОВНО ОДНА Primary CTA КНОПКА #0d9488 (Мандат 8am & 8e: ВСЕГДА КЛИКАБЕЛЬНА) */}
			<button
				type="button"
				onClick={onExport}
				className="primary-button studio-primary-cta bg-[var(--teal,#0d9488)]"
				data-testid="studio-primary-export-btn"
			>
				{exportSuccess ? (
					<>
						<CheckCircle2 className="w-4 h-4" />
						<span>Отчет сохранен!</span>
					</>
				) : (
					<>
						<Download className="w-4 h-4" />
						<span>✓ Экспорт управленческого отчёта</span>
					</>
				)}
			</button>
		</footer>
	);
};
