import React from "react";
import { Check, Clipboard, FileText } from "lucide-react";

export interface EndoClinicalParamsProps {
	readonly rotarySystem: string;
	readonly setRotarySystem: (val: string) => void;
	readonly irrigation: string;
	readonly setIrrigation: (val: string) => void;
	readonly radiologyControl: string;
	readonly setRadiologyControl: (val: string) => void;
	readonly generatedProtocolText: string;
	readonly copied: boolean;
	readonly handleCopyText: () => void;
}

export const EndoClinicalParams: React.FC<EndoClinicalParamsProps> = ({
	rotarySystem,
	setRotarySystem,
	irrigation,
	setIrrigation,
	radiologyControl,
	setRadiologyControl,
	generatedProtocolText,
	copied,
	handleCopyText,
}) => {
	return (
		<>
			{/* Additional Clinical Details: Rotary, Irrigation & X-Ray */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
				<div>
					<label
						htmlFor="endo-rotary-input"
						className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 truncate"
					>
						Инструментальная система (NiTi):
					</label>
					<input
						id="endo-rotary-input"
						type="text"
						value={rotarySystem}
						onChange={(e) => setRotarySystem(e.target.value)}
						className="w-full h-8 sm:h-9 px-3 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs outline-none focus:ring-2 focus:ring-rose-500 font-medium truncate min-w-0"
						placeholder="Машинная обработка NiTi ProTaper Gold (SX, S1, S2, F1, F2)"
					/>
				</div>

				<div>
					<label
						htmlFor="endo-irrigation-input"
						className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 truncate"
					>
						Растворы и протокол ирригации:
					</label>
					<input
						id="endo-irrigation-input"
						type="text"
						value={irrigation}
						onChange={(e) => setIrrigation(e.target.value)}
						className="w-full h-8 sm:h-9 px-3 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs outline-none focus:ring-2 focus:ring-rose-500 font-medium truncate min-w-0"
						placeholder="3% NaOCl + 17% EDTA с ультразвуковой активацией"
					/>
				</div>

				<div>
					<label
						htmlFor="endo-radiology-input"
						className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 truncate"
					>
						Рентген-контроль (визиография):
					</label>
					<input
						id="endo-radiology-input"
						type="text"
						value={radiologyControl}
						onChange={(e) => setRadiologyControl(e.target.value)}
						className="w-full h-8 sm:h-9 px-3 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs outline-none focus:ring-2 focus:ring-rose-500 font-medium truncate min-w-0"
						placeholder="Контрольная визиография: каналы обтурированы до апекса."
					/>
				</div>
			</div>

			{/* Live Structured Protocol Preview for Form 043/y (Zero Emojis) */}
			<div className="p-3 bg-[var(--surface,#f8fafc)] dark:bg-slate-950/60 border border-[var(--line,#cbd5e1)] dark:border-slate-800 rounded-2xl">
				<div className="flex items-center justify-between mb-1.5">
					<div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
						<FileText size={15} />
						<span className="truncate">Форма 043/у · Предпросмотр протокола лечения:</span>
					</div>

					<button
						type="button"
						onClick={handleCopyText}
						className="h-7 px-2.5 rounded-lg text-xs font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
					>
						{copied ? (
							<Check size={14} className="text-emerald-500" />
						) : (
							<Clipboard size={14} />
						)}
						<span>{copied ? "Скопировано!" : "Копировать текст"}</span>
					</button>
				</div>

				<pre
					data-testid="endo-protocol-preview-text"
					className="text-xs text-[var(--ink,#0f172a)] dark:text-slate-200 font-mono whitespace-pre-wrap leading-relaxed m-0 p-2.5 bg-[var(--paper,#ffffff)] dark:bg-slate-900 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 max-h-36 overflow-y-auto select-text"
				>
					{generatedProtocolText}
				</pre>
			</div>
		</>
	);
};
