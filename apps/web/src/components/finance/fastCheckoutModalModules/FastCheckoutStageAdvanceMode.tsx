import { Sparkles } from "lucide-react";
import React from "react";
import type { StagePaymentMode } from "../../payments/checkout/fastCheckoutEngine.js";

export interface FastCheckoutStageAdvanceModeProps {
	readonly ffdTag1214NameRu: string;
	readonly stagePaymentMode: StagePaymentMode;
	readonly setStagePaymentMode: (mode: StagePaymentMode) => void;
	readonly baseStageAmountKop: number;
	readonly stageCalc: {
		readonly requiredAmountKop: number;
		readonly advanceOffsetTag1215Kop: number;
	};
}

export const FastCheckoutStageAdvanceMode: React.FC<
	FastCheckoutStageAdvanceModeProps
> = ({
	ffdTag1214NameRu,
	stagePaymentMode,
	setStagePaymentMode,
	baseStageAmountKop,
	stageCalc,
}) => (
	<div className="p-3 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex flex-col gap-2">
		<div className="flex items-center justify-between flex-wrap gap-1">
			<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
				<Sparkles size={14} className="text-teal-600" />
				Режим чека для этапа:
			</span>
			<span className="text-[11px] font-mono font-bold text-teal-700 dark:text-teal-300">
				{ffdTag1214NameRu}
			</span>
		</div>
		<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
			<button
				type="button"
				onClick={() => setStagePaymentMode("full")}
				className={`min-h-[44px] h-12 px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex flex-col justify-center items-center transition-all cursor-pointer ${
					stagePaymentMode === "full"
						? "border-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--ink,#0f172a)] shadow-xs ring-1 ring-[var(--teal,#0d9488)]"
						: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)]"
				}`}
			>
				<span>100% Оплата</span>
				<span className="text-[11px] font-mono text-[var(--muted,#64748b)]">
					{(baseStageAmountKop / 100).toLocaleString("ru-RU")} ₽
				</span>
			</button>
			<button
				type="button"
				onClick={() => setStagePaymentMode("advance_30")}
				className={`min-h-[44px] h-12 px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex flex-col justify-center items-center transition-all cursor-pointer ${
					stagePaymentMode === "advance_30"
						? "border-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--ink,#0f172a)] shadow-xs ring-1 ring-[var(--teal,#0d9488)]"
						: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)]"
				}`}
			>
				<span>Аванс 30%</span>
				<span className="text-[11px] font-mono text-[var(--muted,#64748b)]">
					{Math.round((baseStageAmountKop * 30) / 10000).toLocaleString(
						"ru-RU",
					)}{" "}
					₽
				</span>
			</button>
			<button
				type="button"
				onClick={() => setStagePaymentMode("advance_50")}
				className={`min-h-[44px] h-12 px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex flex-col justify-center items-center transition-all cursor-pointer ${
					stagePaymentMode === "advance_50"
						? "border-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--ink,#0f172a)] shadow-xs ring-1 ring-[var(--teal,#0d9488)]"
						: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)]"
				}`}
			>
				<span>Аванс 50%</span>
				<span className="text-[11px] font-mono text-[var(--muted,#64748b)]">
					{Math.round((baseStageAmountKop * 50) / 10000).toLocaleString(
						"ru-RU",
					)}{" "}
					₽
				</span>
			</button>
			<button
				type="button"
				onClick={() => setStagePaymentMode("advance_offset_tag1215")}
				className={`min-h-[44px] h-12 px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex flex-col justify-center items-center transition-all cursor-pointer ${
					stagePaymentMode === "advance_offset_tag1215"
						? "border-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--ink,#0f172a)] shadow-xs ring-1 ring-[var(--teal,#0d9488)]"
						: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)]"
				}`}
			>
				<span>Зачет аванса</span>
				<span className="text-[11px] font-mono text-[var(--muted,#64748b)]">
					Доплата {(stageCalc.requiredAmountKop / 100).toLocaleString("ru-RU")}{" "}
					₽
				</span>
			</button>
		</div>
		{stagePaymentMode === "advance_offset_tag1215" && (
			<div className="mt-1 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs flex items-center justify-between flex-wrap gap-2 text-purple-950 dark:text-purple-100">
				<div>
					<strong>Зачет ранее внесенного аванса:</strong>{" "}
					{(stageCalc.advanceOffsetTag1215Kop / 100).toLocaleString("ru-RU")} ₽
					(зачет аванса)
				</div>
				<div className="font-mono font-bold">
					К доплате сейчас:{" "}
					{(stageCalc.requiredAmountKop / 100).toLocaleString("ru-RU")} ₽
				</div>
			</div>
		)}
	</div>
);
