/**
 * apps/web/src/components/emr/record/tabs/RecordNewDiaryInlineForm.tsx
 *
 * Быстрая форма добавления записи приёма (SOAP) в медицинскую карту.
 * Автономия врача, Чистый живой доменный язык.
 */

import React from "react";
import { Sparkles, Plus, RotateCcw } from "lucide-react";

export interface RecordNewDiaryInlineFormProps {
	readonly selectedTooth: string;
	readonly setSelectedTooth: (tooth: string) => void;
	readonly commonTeeth: readonly number[];
	readonly subjective: string;
	readonly setSubjective: (val: string) => void;
	readonly objective: string;
	readonly setObjective: (val: string) => void;
	readonly diagnosisText: string;
	readonly setDiagnosisText: (val: string) => void;
	readonly icd10Code: string;
	readonly setIcd10Code: (val: string) => void;
	readonly protocol: string;
	readonly setProtocol: (val: string) => void;
	readonly onApplyNorm: () => void;
	readonly onClear: () => void;
	readonly onSave: () => void;
}

export const RecordNewDiaryInlineForm: React.FC<RecordNewDiaryInlineFormProps> = React.memo(
	function RecordNewDiaryInlineForm({
		selectedTooth,
		setSelectedTooth,
		commonTeeth,
		subjective,
		setSubjective,
		objective,
		setObjective,
		diagnosisText,
		setDiagnosisText,
		icd10Code,
		setIcd10Code,
		protocol,
		setProtocol,
		onApplyNorm,
		onClear,
		onSave,
	}) {
		return (
			<div className="p-3.5 mb-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink)] flex flex-col gap-3 shadow-sm">
				<div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[var(--line,#e2e8f0)]">
					<div className="flex items-center gap-2 flex-wrap">
						<span className="text-xs font-bold text-[var(--ink)]">
							Зуб FDI:
						</span>
						<input
							type="number"
							min={11}
							max={85}
							value={selectedTooth}
							onChange={(e) => setSelectedTooth(e.target.value)}
							className="w-14 h-8 text-center font-bold text-sm rounded border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink)]"
							data-testid="input-inline-diary-tooth"
						/>
						<div className="flex gap-1 flex-wrap">
							{commonTeeth.map((tooth) => (
								<button
									key={tooth}
									type="button"
									onClick={() => setSelectedTooth(String(tooth))}
									className={`dente-btn-pill ${
										selectedTooth === String(tooth) ? "active" : ""
									}`}
								>
									{tooth}
								</button>
							))}
						</div>
					</div>

					<button
						type="button"
						onClick={onApplyNorm}
						className="dente-btn dente-btn-secondary min-h-[36px] text-xs px-3 py-1 inline-flex items-center gap-1.5"
						data-testid="btn-inline-diary-norm"
						title="Физиологическая норма: интактный ряд"
					>
						<Sparkles className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
						<span>Интактный ряд</span>
					</button>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
					<div>
						<label className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-1">
							S (Жалобы):
						</label>
						<input
							type="text"
							value={subjective}
							onChange={(e) => setSubjective(e.target.value)}
							placeholder="Жалобы пациента..."
							className="w-full text-xs p-2 rounded border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink)]"
						/>
					</div>
					<div>
						<label className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-1">
							O (Status localis):
						</label>
						<input
							type="text"
							value={objective}
							onChange={(e) => setObjective(e.target.value)}
							placeholder="Данные осмотра..."
							className="w-full text-xs p-2 rounded border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink)]"
						/>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
					<div className="md:col-span-2">
						<label className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-1">
							A (Диагноз):
						</label>
						<input
							type="text"
							value={diagnosisText}
							onChange={(e) => setDiagnosisText(e.target.value)}
							placeholder="К02.1 Кариес дентина..."
							className="w-full text-xs p-2 rounded border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink)]"
						/>
					</div>
					<div>
						<label className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-1">
							МКБ-10:
						</label>
						<input
							type="text"
							value={icd10Code}
							onChange={(e) => setIcd10Code(e.target.value)}
							placeholder="K02.1"
							className="w-full text-xs p-2 rounded border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink)] font-mono font-bold"
						/>
					</div>
				</div>

				<div>
					<label className="text-[11px] font-bold text-[var(--muted,#64748b)] block mb-1">
						P (Протокол лечения и манипуляции):
					</label>
					<textarea
						rows={3}
						value={protocol}
						onChange={(e) => setProtocol(e.target.value)}
						placeholder="Препарирование, антисептическая обработка, пломбирование..."
						className="w-full text-xs p-2 rounded border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink)]"
					/>
				</div>

				{/* Вторичные действия формы добавления записи */}
				<div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[var(--line,#e2e8f0)]">
					<button
						type="button"
						onClick={onClear}
						className="dente-btn dente-btn-secondary min-h-[36px] text-xs px-3 inline-flex items-center gap-1.5"
					>
						<RotateCcw className="w-3.5 h-3.5 text-slate-500" />
						<span>Очистить черновик</span>
					</button>

					<button
						type="button"
						onClick={onSave}
						className="dente-btn dente-btn-secondary min-h-[36px] px-4 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
						data-testid="btn-save-inline-diary"
						title="Добавить запись в медицинскую карту"
					>
						<Plus className="w-4 h-4 text-slate-600 dark:text-slate-300" />
						<span>Добавить запись в карту</span>
					</button>
				</div>
			</div>
		);
	},
);
