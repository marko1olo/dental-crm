/**
 * DENTE Dental CRM — 32-Tooth Mockup Tooth Detail Modal
 * Mandate 8b <= 120 lines.
 */

import React from "react";
import { resolveToothStatusBadge } from "../ToothStatusBadge";
import { TOOTH46_PRESETS } from "../Tooth46ClinicalPresets";
import { ArchToothBadge } from "./ArchToothBadge";
import { Tooth46CariesBar } from "../Tooth46CariesBar";
import type { MockupToothItem } from "./archMockupTypes";
import type { CariesDepth, CariesType } from "../tooth46PresetTypes";

export interface ArchToothDetailModalProps {
	readonly item: MockupToothItem | null;
	readonly onClose: () => void;
	readonly onApplyPreset?: (toothNumber: number, presetId: string) => void;
}

export const ArchToothDetailModal: React.FC<ArchToothDetailModalProps> = ({
	item,
	onClose,
	onApplyPreset,
}) => {
	if (!item) return null;
	const { toothNumber, presetId, isUpper } = item;
	const isAnterior = [1, 2, 3].includes(toothNumber % 10);
	const badge = resolveToothStatusBadge(presetId, undefined, toothNumber);
	const presetDef = TOOTH46_PRESETS.find((p) => p.id === presetId);
	const isCaries = presetId.startsWith("caries");

	const curType: CariesType = presetId.includes("mod") ? "class2_mod"
		: presetId.includes("mo") ? "class2_mo" : presetId.includes("do") ? "class2_do"
		: presetId.includes("_m_") ? "class2_m" : presetId.includes("_d_") ? "class2_d"
		: presetId.includes("c5") || presetId.includes("class5") ? "class5"
		: presetId.includes("c4") || presetId.includes("class4") ? "class4"
		: presetId.includes("c3") || presetId.includes("class3") || isAnterior ? "class3" : "class1";

	const curDepth: CariesDepth = presetId.includes("superficial") ? "superficial"
		: presetId.includes("profunda") ? "profunda"
		: presetId.includes("destructive") ? "destructive" : "media";

	const onCariesChange = (type: CariesType, depth: CariesDepth) => {
		const prefix = type.replace("class", "c");
		onApplyPreset?.(toothNumber, `caries_${prefix}_${depth}`);
	};

	return (
		<div
			data-testid="arch-tooth-detail-modal"
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
			onClick={onClose}
		>
			<div
				className="w-full max-w-md rounded-2xl border p-4 shadow-2xl bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] space-y-3"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-3">
						<ArchToothBadge presetId={presetId} radius={16} />
						<div>
							<h3 className="text-base font-bold flex items-center gap-2">
								<span>Зуб {toothNumber}</span>
								<span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-300 font-mono">
									{isUpper ? "Верхний" : "Нижний"}
								</span>
							</h3>
							<p className="text-xs opacity-70 font-mono">Код статуса: {badge.code}</p>
						</div>
					</div>
					<button type="button" onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-black/5 text-lg font-bold" aria-label="Закрыть">✕</button>
				</div>

				<div className="p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-current/10">
					<div className="text-xs font-bold text-teal-600 dark:text-teal-400">{presetDef?.nameRu ?? badge.title}</div>
					<div className="text-xs opacity-80">{presetDef?.description ?? "Клиническое описание согласно СтАР."}</div>
				</div>

				{isCaries && onApplyPreset && (
					<Tooth46CariesBar
						layers={{ caries: true, cariesType: curType, cariesDepth: curDepth }}
						toothNumber={toothNumber}
						onChangeCariesType={(t) => onCariesChange(t, curDepth)}
						onChangeCariesDepth={(d) => onCariesChange(curType, d)}
					/>
				)}

				{onApplyPreset && (
					<div className="space-y-1">
						<div className="text-[11px] font-semibold opacity-70">Быстрая смена состояния:</div>
						<div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
							{["intact", isAnterior ? "caries_c3_media" : "caries_c1_media", "composite", "pulpitis", "crown", "implant", "missing"].map((pid) => (
								<button
									key={pid}
									type="button"
									onClick={() => onApplyPreset(toothNumber, pid)}
									className={`px-2 py-1 rounded text-xs border ${presetId === pid ? "bg-teal-500 text-white font-semibold" : "border-current/15 hover:bg-black/5"}`}
								>
									{resolveToothStatusBadge(pid, undefined, toothNumber).code} ({resolveToothStatusBadge(pid, undefined, toothNumber).title.split(" ")[0]})
								</button>
							))}
						</div>
					</div>
				)}

				<div className="flex justify-end pt-1 border-t border-current/10">
					<button type="button" onClick={onClose} className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-teal-500 text-white hover:bg-teal-600">Готово</button>
				</div>
			</div>
		</div>
	);
};