import React from "react";
import { Sparkles, Trash2, UploadCloud } from "lucide-react";
import type { CephAiBackendPreference } from "../cephAiInferenceService";

export interface CephHudActionButtonsProps {
	readonly onRunAiAutoPlacement?: (() => void) | undefined;
	readonly isAiInferring?: boolean | undefined;
	readonly aiBackendBadge?: string | undefined;
	readonly aiBackendLabel?: string | undefined;
	readonly aiBackendPref?: CephAiBackendPreference | undefined;
	readonly onChangeAiBackendPref?: ((pref: CephAiBackendPreference) => void) | undefined;
	readonly onFileProcess: (file: File) => void;
	readonly onLoadPreset?: (() => void) | undefined;
	readonly onResetLandmarks?: (() => void) | undefined;
}

export const CephHudActionButtons: React.FC<CephHudActionButtonsProps> = ({
	onRunAiAutoPlacement,
	isAiInferring,
	aiBackendBadge,
	aiBackendLabel,
	aiBackendPref,
	onChangeAiBackendPref,
	onFileProcess,
	onLoadPreset,
	onResetLandmarks,
}) => {
	return (
		<div className="flex items-center gap-1 shrink-0 flex-nowrap">
			{onRunAiAutoPlacement && (
				<div className="flex items-center gap-0.5 bg-[var(--paper-soft)] p-0.5 rounded-lg border border-[var(--line)] shrink-0 flex-nowrap">
					<button
						type="button"
						disabled={isAiInferring}
						onClick={onRunAiAutoPlacement}
						data-testid="ceph-ai-auto-placement-btn"
						className={`h-7 min-w-max px-2.5 rounded-md text-[12.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm whitespace-nowrap shrink-0 border ${
							isAiInferring ? "animate-pulse cursor-wait" : "hover:brightness-110"
						}`}
						style={{ backgroundColor: isAiInferring ? "#134e4a" : "#0d9488", color: "#ffffff", borderColor: "rgba(45, 212, 191, 0.6)" }}
						title={`Анатомический шаблон 16 ориентиров ТРГ (${aiBackendLabel || "Шаблон"})`}
					>
						<Sparkles size={13} className={isAiInferring ? "animate-spin text-amber-300" : "text-amber-300 shrink-0"} />
						<span style={{ color: "#ffffff" }}>{isAiInferring ? "Калибровка..." : "Анатомический шаблон"}</span>
						<span className="text-[11.5px] px-1 py-0.2 rounded bg-black/50 font-mono font-bold text-teal-200 border border-teal-400/40">
							[{aiBackendBadge || "Шаблон"}]
						</span>
					</button>
					{onChangeAiBackendPref && (
						<button
							type="button"
							onClick={() => {
								const cycle: CephAiBackendPreference[] = ["auto", "wasm", "webgpu", "webgl"];
								const curIdx = cycle.indexOf(aiBackendPref || "auto");
								onChangeAiBackendPref(cycle[(curIdx + 1) % cycle.length]!);
							}}
							className="h-7 px-2 rounded-md text-[11.5px] font-medium text-[var(--muted)] hover:text-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] transition-colors shrink-0 cursor-pointer"
							title="Режим разметки ТРГ: Анатомический шаблон"
							data-testid="ceph-ai-backend-switch-btn"
						>
							{aiBackendPref === "auto" ? "Шаблон" : aiBackendPref === "wasm" ? "Линейка" : aiBackendPref === "webgpu" ? "Dolphin/Romexis" : "OnyxCeph"}
						</button>
					)}
				</div>
			)}

			<label
				className="h-7 min-w-max px-2.5 rounded-md bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-[12.5px] font-medium flex items-center gap-1 cursor-pointer transition-colors border border-[var(--line)] shadow-sm whitespace-nowrap shrink-0"
				title="Загрузить снимок ТРГ"
			>
				<UploadCloud size={13} />
				<span>Загрузить снимок ТРГ</span>
				<input
					type="file"
					accept="image/*,.dcm"
					className="hidden"
					onChange={(e) => {
						const file = e.target.files?.[0];
						if (file) onFileProcess(file);
					}}
				/>
			</label>
			{onLoadPreset && (
				<button
					type="button"
					onClick={onLoadPreset}
					className="h-7 min-w-max px-2.5 rounded-md bg-teal-900/80 hover:bg-teal-800 text-teal-200 text-[12.5px] font-medium flex items-center gap-1 transition-colors border border-teal-500 cursor-pointer shadow-sm whitespace-nowrap shrink-0"
					title="Загрузить эталонную анатомическую разметку со снимком"
				>
					<Sparkles size={13} />
					<span>Эталонная разметка</span>
				</button>
			)}
			{onResetLandmarks && (
				<button
					type="button"
					onClick={onResetLandmarks}
					className="h-7 min-w-max px-2.5 rounded-md bg-rose-950/80 hover:bg-rose-900 text-rose-200 text-[12.5px] font-medium flex items-center gap-1 transition-colors border border-rose-700 cursor-pointer shadow-sm whitespace-nowrap shrink-0"
					title="Сбросить все точки"
				>
					<Trash2 size={12} />
					<span>Сбросить</span>
				</button>
			)}
		</div>
	);
};
