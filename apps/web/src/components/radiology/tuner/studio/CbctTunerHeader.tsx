/**
 * DENTE CRM — CBCT Contrast & Slice Tuner Header
 * Single Primary CTA, patient switcher, responsive drawer triggers, Apple HIG touch ergonomics.
 * Strict adherence to Mandates 8e, 8am, 8b (< 800 lines).
 */

import React from "react";
import {
	Check,
	Copy,
	Eye,
	Layers,
	Paperclip,
	Sliders,
	X,
} from "lucide-react";
import { TUNER_PATIENTS } from "../useCbctTunerData";

export interface CbctTunerHeaderProps {
	readonly selectedPatientId: string;
	readonly onSelectPatientId: (id: string) => void;
	readonly mobileSection: "slices" | "controls";
	readonly onSetMobileSection: (section: "slices" | "controls") => void;
	readonly viewLayout: "stacked" | "columns";
	readonly onToggleViewLayout: () => void;
	readonly onCopyParams: () => void;
	readonly copiedFeedback: boolean;
	readonly onAttachToVisit: () => void;
	readonly attachFeedback: boolean;
	readonly onClose?: () => void;
}

export const CbctTunerHeader: React.FC<CbctTunerHeaderProps> = ({
	selectedPatientId,
	onSelectPatientId,
	mobileSection,
	onSetMobileSection,
	viewLayout,
	onToggleViewLayout,
	onCopyParams,
	copiedFeedback,
	onAttachToVisit,
	attachFeedback,
	onClose,
}) => {
	return (
		<header className="h-12 border-b border-zinc-800 bg-zinc-950/95 px-2 sm:px-3 flex items-center justify-between shrink-0 backdrop-blur-md gap-1.5 z-20">
			{/* Left: 3D Badge + Patient Selector */}
			<div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
				<span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold shrink-0">
					3D КЛКТ
				</span>
				<span className="hidden xl:inline text-cyan-400 font-bold text-xs tracking-wide shrink-0">
					ТЮНЕР КОНТРАСТА
				</span>

				<select
					aria-label="Выбор пациента КЛКТ"
					value={selectedPatientId}
					onChange={(e) => onSelectPatientId(e.target.value)}
					className="bg-zinc-900 border border-zinc-700 text-cyan-300 text-[11px] sm:text-xs font-semibold rounded px-2 py-1.5 focus:outline-none focus:border-cyan-400 cursor-pointer max-w-[130px] sm:max-w-[200px] lg:max-w-none truncate min-h-[36px]"
					data-testid="cbct-tuner-patient-select"
				>
					{TUNER_PATIENTS.map((p) => (
						<option key={p.id} value={p.id}>
							{p.name}
						</option>
					))}
				</select>
			</div>

			{/* Center: Mobile View Switcher (<= 1024px) */}
			<div
				className="flex lg:hidden items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 gap-0.5 shrink-0"
				data-testid="cbct-tuner-mobile-section-switch"
			>
				<button
					type="button"
					onClick={() => onSetMobileSection("slices")}
					className={`px-2 py-1.5 rounded-md text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer min-h-[36px] min-w-[44px] flex items-center gap-1 ${
						mobileSection === "slices"
							? "bg-cyan-950 text-cyan-300 border border-cyan-400 font-bold shadow-xs"
							: "text-zinc-400 hover:text-zinc-200"
					}`}
					data-testid="cbct-tuner-tab-slices"
				>
					<Eye className="w-3.5 h-3.5 text-cyan-400" />
					<span>Срезы</span>
				</button>
				<button
					type="button"
					onClick={() => onSetMobileSection("controls")}
					className={`px-2 py-1.5 rounded-md text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer min-h-[36px] min-w-[44px] flex items-center gap-1 ${
						mobileSection === "controls"
							? "bg-cyan-950 text-cyan-300 border border-cyan-400 font-bold shadow-xs"
							: "text-zinc-400 hover:text-zinc-200"
					}`}
					data-testid="cbct-tuner-tab-controls"
				>
					<Sliders className="w-3.5 h-3.5 text-cyan-400" />
					<span>Настройки</span>
				</button>
			</div>

			{/* Right: Actions (Mandate 8am — Exactly ONE Primary CTA) */}
			<div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
				{/* Layout Toggle: Desktop only */}
				<button
					type="button"
					onClick={onToggleViewLayout}
					className="hidden md:flex px-2 py-1.5 rounded-md text-xs font-semibold items-center gap-1.5 transition-all bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-zinc-200 hover:border-cyan-400 cursor-pointer min-h-[36px]"
					data-testid="cbct-tuner-layout-toggle"
					title="Переключить компоновку: ОПТГ снизу во всю ширину / две колонки рядом"
				>
					<Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
					<span className="hidden lg:inline">
						{viewLayout === "stacked" ? "⊟ ОПТГ снизу" : "⊞ Две колонки"}
					</span>
				</button>

				{/* Copy calibration text (Secondary Ghost / Outline) */}
				<button
					type="button"
					onClick={onCopyParams}
					className={`p-1.5 sm:px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border min-h-[36px] min-w-[36px] ${
						copiedFeedback
							? "bg-emerald-950/70 text-emerald-200 border-emerald-500/50 shadow-xs"
							: "bg-zinc-900 text-zinc-300 border-zinc-700 hover:text-zinc-100 hover:border-zinc-500"
					}`}
					data-testid="cbct-tuner-copy-params-btn"
					title="Скопировать параметры калибровки"
				>
					{copiedFeedback ? (
						<Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
					) : (
						<Copy className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
					)}
					<span className="hidden sm:inline">
						{copiedFeedback ? "Скопировано!" : "Калибровка"}
					</span>
				</button>

				{/* EXACTLY ONE PRIMARY CTA BUTTON: Attach slice to visit / clinical card (Mandate 8e, 8am) */}
				<button
					type="button"
					onClick={onAttachToVisit}
					className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[36px] min-w-[44px] shadow-sm ${
						attachFeedback
							? "bg-emerald-600 text-emerald-50 border border-emerald-400"
							: "bg-teal-600 hover:bg-teal-500 text-teal-50 border border-teal-500 active:scale-[0.98]"
					}`}
					data-testid="cbct-tuner-attach-visit-btn"
					title="Прикрепить текущий срез и параметры к визиту пациента в 1 клик"
				>
					{attachFeedback ? (
						<Check className="w-3.5 h-3.5 shrink-0" />
					) : (
						<Paperclip className="w-3.5 h-3.5 shrink-0" />
					)}
					<span className="hidden sm:inline">
						{attachFeedback ? "Срез прикреплен!" : "Прикрепить к визиту"}
					</span>
				</button>

				{/* Close Modal Button */}
				{onClose && (
					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
						data-testid="cbct-tuner-close-btn"
						title="Закрыть окно просмотра"
					>
						<X className="w-4 h-4" />
					</button>
				)}
			</div>
		</header>
	);
};
