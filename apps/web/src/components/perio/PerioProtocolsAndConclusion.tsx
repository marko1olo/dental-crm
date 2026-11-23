/**
 * apps/web/src/components/perio/PerioProtocolsAndConclusion.tsx
 *
 * Панель клинических комплексов гигиены/пародонтологии и клинического заключения (PSR).
 * Mandate 8b: < 110 строк.
 */

import React from "react";
import type { PerioChartSummary, PerioToothRecord } from "@dental/shared";
import { formatKopecksToRub, generateComprehensivePerioProtocolText } from "@dental/shared";
import { FileText } from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	PERIO_TREATMENT_PROTOCOLS,
	type PerioScreeningSummary,
	type PerioTreatmentProtocol,
} from "./perioCatalogData";

export interface PerioProtocolsAndConclusionProps {
	readonly selectedProtocolId: string | null;
	readonly onSelectProtocol: (proto: PerioTreatmentProtocol) => void;
	readonly psrSummary: PerioScreeningSummary;
	readonly teeth: readonly PerioToothRecord[];
	readonly summary: PerioChartSummary;
	readonly doctorName: string;
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
}

export const PerioProtocolsAndConclusion: React.FC<PerioProtocolsAndConclusionProps> = React.memo(({
	selectedProtocolId,
	onSelectProtocol,
	psrSummary,
	teeth,
	summary,
	doctorName,
	onInsertToProtocol,
}) => {
	const handleCopyOrInsert = () => {
		const text = generateComprehensivePerioProtocolText(teeth, summary, {
			doctorName,
			customNotes: `PSR: ${psrSummary.psrFormula} (${psrSummary.suggestedDiagnosisRu})\nРекомендации: ${psrSummary.hygienePlanRu}`,
		});
		if (onInsertToProtocol) {
			onInsertToProtocol(text);
			showToast("✓ Протокол осмотра скопирован в дневник приёма", "success");
		} else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			void navigator.clipboard
				.writeText(text)
				.then(() => showToast("✓ Протокол осмотра скопирован в буфер обмена", "success"))
				.catch(() => showToast("Не удалось скопировать в буфер обмена", "error"));
		} else {
			showToast("✓ Протокол осмотра сформирован", "info");
		}
	};

	return (
		<>
			{/* 4 канонических протокола гигиены */}
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2 perio-protocols-panel">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold text-[var(--ink)]">Клинические комплексы:</span>
					<span className="text-[11px] text-[var(--muted)]">Пакетное списание расходников</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
					{PERIO_TREATMENT_PROTOCOLS.map((proto) => {
						const isSelected = selectedProtocolId === proto.id;
						return (
							<button
								key={proto.id}
								type="button"
								onClick={() => onSelectProtocol(proto)}
								className={`min-h-[44px] p-2.5 rounded-xl text-left text-xs border cursor-pointer transition-all flex flex-col justify-between gap-1.5 items-stretch w-full ${
									isSelected
										? "bg-[var(--primary)]/10 text-[var(--ink)] border-[var(--primary)] ring-1 ring-[var(--primary)]"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
								}`}
							>
								<div className="w-full">
									<div className="font-bold text-xs leading-tight min-h-[30px] break-words">
										{proto.titleRu}
									</div>
									<div className="text-[11px] text-[var(--muted)] pt-0.5 break-words">
										{proto.descriptionRu}
									</div>
								</div>
								<div className="w-full flex items-center justify-between gap-2 pt-1.5 border-t border-[var(--line)]">
									<span className="text-[11px] font-semibold text-[var(--primary)] shrink-0">
										{formatKopecksToRub(proto.priceKopecks)}
									</span>
									<span className="text-[10px] text-[var(--muted)] font-medium text-right truncate">
										Клинический протокол
									</span>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Клиническое заключение */}
			<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 perio-conclusion-panel">
				<div>
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-xs font-bold text-[var(--ink)]">Клиническое заключение:</span>
						<span className="text-xs px-2 py-0.5 rounded font-bold bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30">
							{psrSummary.suggestedDiagnosisRu} ({psrSummary.icd10Code})
						</span>
					</div>
					<p className="text-xs text-[var(--muted)] pt-1">{psrSummary.hygienePlanRu}</p>
				</div>
				<button
					type="button"
					onClick={handleCopyOrInsert}
					data-testid="perio-insert-protocol-btn"
					className="min-h-[44px] sm:min-h-[36px] px-3.5 rounded-xl bg-[var(--paper)] text-[var(--ink)] font-semibold text-xs border border-[var(--line)] hover:border-[var(--primary)] flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors perio-insert-btn"
				>
					<FileText className="w-4 h-4" />
					Вставить в дневник
				</button>
			</div>
		</>
	);
});

PerioProtocolsAndConclusion.displayName = "PerioProtocolsAndConclusion";
