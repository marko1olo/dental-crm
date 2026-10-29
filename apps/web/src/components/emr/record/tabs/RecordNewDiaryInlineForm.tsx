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
			<div className="p-3.5 mb-4 rounded-xl border border-teal-500/30 bg-teal-50/20 dark:bg-teal-950/20 flex flex-col gap-3">
				<div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-teal-500/20">
					<div className="flex items-center gap-2 flex-wrap">
						<span className="text-xs font-bold text-teal-700 dark:text-teal-300">
							Зуб FDI:
						</span>
						<input
							type="number"
							min={11}
							max={85}
							value={selectedTooth}
							onChange={(e) => setSelectedTooth(e.target.value)}
							className="w-14 h-8 text-center font-bold text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
							data-testid="input-inline-diary-tooth"
						/>
						<div className="flex gap-1 flex-wrap">
							{commonTeeth.map((tooth) => (
								<button
									key={tooth}
									type="button"
									onClick={() => setSelectedTooth(String(tooth))}
									className={`px-2 py-0.5 rounded text-xs font-semibold border ${
										selectedTooth === String(tooth)
											? "bg-teal-600 text-white border-teal-600"
											: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
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
						className="emr043-btn emr043-btn-secondary min-h-[36px] text-xs px-2.5 py-1 inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300"
						data-testid="btn-inline-diary-norm"
						title="Заполнить физиологической нормой в 1 клик (Мандат 8e)"
					>
						<Sparkles className="w-3.5 h-3.5 text-emerald-600" />
						<span>Норма в 1 клик / Интактные зубы</span>
					</button>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
					<div>
						<label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
							S (Жалобы):
						</label>
						<input
							type="text"
							value={subjective}
							onChange={(e) => setSubjective(e.target.value)}
							placeholder="Жалобы пациента..."
							className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
						/>
					</div>
					<div>
						<label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
							O (Status localis):
						</label>
						<input
							type="text"
							value={objective}
							onChange={(e) => setObjective(e.target.value)}
							placeholder="Данные осмотра..."
							className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
						/>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
					<div className="md:col-span-2">
						<label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
							A (Диагноз):
						</label>
						<input
							type="text"
							value={diagnosisText}
							onChange={(e) => setDiagnosisText(e.target.value)}
							placeholder="К02.1 Кариес дентина..."
							className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
						/>
					</div>
					<div>
						<label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
							МКБ-10:
						</label>
						<input
							type="text"
							value={icd10Code}
							onChange={(e) => setIcd10Code(e.target.value)}
							placeholder="K02.1"
							className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold"
						/>
					</div>
				</div>

				<div>
					<label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
						P (Протокол лечения и манипуляции):
					</label>
					<textarea
						rows={3}
						value={protocol}
						onChange={(e) => setProtocol(e.target.value)}
						placeholder="Препарирование, антисептическая обработка, пломбирование..."
						className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
					/>
				</div>

				{/* Ровно ОДНА Primary CTA кнопка (Мандат 8am) */}
				<div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-teal-500/20">
					<button
						type="button"
						onClick={onClear}
						className="emr043-btn emr043-btn-secondary min-h-[44px] text-xs px-3 inline-flex items-center gap-1"
					>
						<RotateCcw className="w-3.5 h-3.5 text-slate-500" />
						<span>Очистить черновик</span>
					</button>

					<button
						type="button"
						onClick={onSave}
						className="emr043-btn emr043-btn-primary min-h-[44px] px-5 py-2 text-xs font-bold inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg shadow-sm"
						data-testid="btn-save-inline-diary"
					>
						<Plus className="w-4 h-4" />
						<span>Сохранить запись приёма</span>
					</button>
				</div>
			</div>
		);
	},
);
