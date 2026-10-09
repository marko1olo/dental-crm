/**
 * apps/web/src/components/patients/patientHistory/HistoryEmptyState.tsx
 *
 * DENTE Dental CRM — Компонент пустого состояния клинического таймлайна.
 * Layer 1: Сообщение об отсутствии визитов или результатов поиска.
 */

import React from "react";
import { Stethoscope } from "lucide-react";

export interface HistoryEmptyStateProps {
	searchQuery?: string;
}

export const HistoryEmptyState: React.FC<HistoryEmptyStateProps> = React.memo(
	function HistoryEmptyState({ searchQuery = "" }) {
		return (
			<div
				className="p-8 text-center bg-[var(--paper)] rounded-xl border border-[var(--line)] flex flex-col items-center justify-center gap-2 text-xs text-[var(--muted)]"
				data-testid="timeline-empty-state"
			>
				<Stethoscope className="w-8 h-8 opacity-40 text-[var(--muted)]" />
				<div className="font-bold text-[var(--ink)] text-sm">Приёмы не найдены</div>
				<p className="max-w-md m-0">
					{searchQuery
						? `По запросу «${searchQuery}» визитов не обнаружено. Попробуйте ввести другой номер зуба (11..48) или код диагноза (K02.1).`
						: "В выбранной категории у пациента нет зафиксированных визитов."}
				</p>
			</div>
		);
	},
);

HistoryEmptyState.displayName = "HistoryEmptyState";
