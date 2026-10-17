import React from "react";
import { FileText } from "lucide-react";
import type { OpgAiInferenceResponse } from "../opgAiInferenceService";

interface SmartOpgDetailsProps {
	analysis?: OpgAiInferenceResponse["analysis"] | undefined;
	selectedTooth: number | null;
}

export const SmartOpgDetails: React.FC<SmartOpgDetailsProps> = ({
	analysis,
	selectedTooth,
}) => {
	const toothData = selectedTooth && analysis?.teeth[selectedTooth] ? analysis.teeth[selectedTooth] : null;

	return (
		<div className="flex-1 overflow-y-auto min-h-0">
			{/* Summary Counters */}
			<div className="p-3 sm:p-4 border-b border-[var(--line)] grid grid-cols-2 gap-2">
				<div className="p-2.5 bg-[var(--paper-strong)] rounded-xl border border-[var(--line)] shadow-2xs">
					<span className="text-xs text-[var(--muted)] font-medium">Найдено зубов:</span>
					<div className="text-lg font-black text-sky-600">
						{analysis?.totalTeethDetected ?? 0}{" "}
						<span className="text-xs font-normal text-[var(--muted)]">из 32</span>
					</div>
				</div>

				<div className="p-2.5 bg-[var(--paper-strong)] rounded-xl border border-[var(--line)] shadow-2xs">
					<span className="text-xs text-[var(--muted)] font-medium">Отсутствуют:</span>
					<div className="text-lg font-black text-[var(--ink)]">
						{analysis?.missingTeethCount ?? 0}
					</div>
				</div>

				<div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20 shadow-2xs">
					<span className="text-xs text-rose-600 font-medium">Ретенция 8-к:</span>
					<div className="text-lg font-black text-rose-600">
						{analysis?.impactedTeethCount ?? 0}
					</div>
				</div>

				<div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 shadow-2xs">
					<span className="text-xs text-amber-600 font-medium">Патологии:</span>
					<div className="text-lg font-black text-amber-600">
						{analysis?.pathologiesCount ?? 0}
					</div>
				</div>
			</div>

			{/* Selected Tooth Detail */}
			<div className="p-3 sm:p-4 border-b border-[var(--line)]">
				<h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">
					{selectedTooth ? `Зуб ${selectedTooth}` : "Инспектор зуба"}
				</h3>
				{toothData ? (
					<div className="p-3 bg-[var(--paper-strong)] rounded-xl border border-[var(--line)] shadow-2xs">
						<div className="flex items-center justify-between mb-1">
							<span className="text-sm font-bold text-[var(--ink)]">
								Позиция {selectedTooth} (Квадрант {selectedTooth ? Math.floor(selectedTooth / 10) : ""})
							</span>
							<span className="text-xs px-2 py-0.5 rounded font-bold bg-sky-500/10 text-sky-700 border border-sky-500/20">
								{toothData.status}
							</span>
						</div>
						<p className="text-xs text-[var(--ink-secondary,#334155)] leading-relaxed">
							{toothData.clinicalDescriptionRu}
						</p>
					</div>
				) : (
					<p className="text-xs text-[var(--muted)]">
						Кликните на любой зуб на снимке для детальной информации.
					</p>
				)}
			</div>

			{/* Clinical Protocol Text per Mandate 8x */}
			<div className="p-3 sm:p-4">
				<div className="flex items-center justify-between mb-2">
					<h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
						<FileText className="w-3.5 h-3.5 text-sky-500" />
						Медицинское заключение по ОПТГ
					</h3>
				</div>
				<div className="p-3 bg-[var(--paper-strong)] rounded-xl border border-[var(--line)] text-xs text-[var(--ink)] leading-relaxed font-mono whitespace-pre-wrap max-h-56 overflow-y-auto shadow-2xs">
					{analysis?.protocol043Ru || "Генерация протокола..."}
				</div>
			</div>
		</div>
	);
};
