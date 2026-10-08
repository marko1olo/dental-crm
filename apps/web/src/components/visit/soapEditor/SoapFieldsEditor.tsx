import React from "react";
import {
	Activity,
	BookOpen,
	HeartPulse,
	Scissors,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import { Icd10ClinicalSelector } from "../../diagnostics/Icd10ClinicalSelector";
import type { SoapFieldsEditorProps } from "./types";

export const SoapFieldsEditor: React.FC<SoapFieldsEditorProps> = ({
	values,
	onFieldChange,
	onInputFocus,
	onInputBlur,
	selectedTooth,
	isIcd10SelectorOpen,
	onToggleIcd10Selector,
	onApplyExpressProtocol,
}) => {
	const flushDraft = onInputBlur;
	return (
		<div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 pb-[calc(env(safe-area-inset-bottom,0px)+80px)] md:pb-4">
			{/* ── 5 БЫСТРЫХ ЭКСПРЕСС-ПРОТОКОЛОВ У КРЕСЛА (МАНДАТЫ 8E, 8K) ── */}
			<div
				className="col-span-full flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-gradient-to-r from-teal-500/10 via-[var(--paper-soft)] to-indigo-500/10 border border-[var(--teal,var(--brand-primary))]/30 shadow-2xs"
				data-testid="soap-chairside-express-bar"
			>
				<div className="flex items-center gap-1.5 shrink-0">
					<Sparkles className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))]" />
					<span className="text-[12.5px] font-bold text-[var(--ink)]">
						Экспресс-протоколы у кресла:
					</span>
				</div>
				<div className="flex items-center gap-1.5 flex-wrap">
					<button
						type="button"
						onClick={() => onApplyExpressProtocol("caries")}
						className="h-8 px-3 rounded-lg text-[12.5px] font-semibold bg-[var(--paper)] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 hover:border-emerald-600 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs touch-manipulation whitespace-nowrap"
						data-testid="btn-soap-express-caries"
						title="Протокол: Кариес дентина (K02.1) — анестезия, коффердам, композит светового отверждения, полировка"
					>
						<Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
						<span>Кариес (K02.1)</span>
					</button>
					<button
						type="button"
						onClick={() => onApplyExpressProtocol("pulpitis")}
						className="h-8 px-3 rounded-lg text-[12.5px] font-semibold bg-[var(--paper)] hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-500/40 hover:border-amber-600 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs touch-manipulation whitespace-nowrap"
						data-testid="btn-soap-express-pulpitis"
						title="Протокол: Острый пульпит (K04.0) — анестезия, экстирпация, мех/мед обработка каналов, обтурация"
					>
						<Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
						<span>Пульпит (K04.0)</span>
					</button>
					<button
						type="button"
						onClick={() => onApplyExpressProtocol("periodontitis")}
						className="h-8 px-3 rounded-lg text-[12.5px] font-semibold bg-[var(--paper)] hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-500/40 hover:border-purple-600 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs touch-manipulation whitespace-nowrap"
						data-testid="btn-soap-express-periodontitis"
						title="Протокол: Хронический периодонтит (K04.5) — анестезия, коффердам, ревизия каналов, Ca(OH)2"
					>
						<HeartPulse className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
						<span>Периодонтит (K04.5)</span>
					</button>
					<button
						type="button"
						onClick={() => onApplyExpressProtocol("hygiene")}
						className="h-8 px-3 rounded-lg text-[12.5px] font-semibold bg-[var(--paper)] hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-500/40 hover:border-sky-600 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs touch-manipulation whitespace-nowrap"
						data-testid="btn-soap-express-hygiene"
						title="Протокол: Профгигиена (K05.1) — ультразвуковой скейлинг, Air-Flow, полировка пастой, фторирование"
					>
						<Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
						<span>Профгигиена (K05.1)</span>
					</button>
					<button
						type="button"
						onClick={() => onApplyExpressProtocol("extraction")}
						className="h-8 px-3 rounded-lg text-[12.5px] font-semibold bg-[var(--paper)] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-500/40 hover:border-rose-600 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs touch-manipulation whitespace-nowrap"
						data-testid="btn-soap-express-extraction"
						title="Протокол: Простое удаление зуба (K01.1) — анестезия, элеватор/щипцы, кюретаж лунки, гемостаз"
					>
						<Scissors className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
						<span>Удаление (K01.1)</span>
					</button>
				</div>
			</div>

			{/* Жалобы */}
			<div className="flex flex-col gap-1">
				<div className="flex items-center justify-between">
					<label
						htmlFor="soap-complaints"
						className="text-xs font-bold text-[var(--ink)]"
					>
						Жалобы
					</label>
					<span className="text-[10px] text-[var(--muted)]">Дневник</span>
				</div>
				<textarea
					id="soap-complaints"
					rows={3}
					value={values.complaint || ""}
					onChange={(e) => onFieldChange("complaint", e.target.value)}
					onFocus={onInputFocus}
					onBlur={flushDraft}
					placeholder="Боль при приеме пищи, ночные боли, выпадение пломбы..."
					className="w-full p-2 text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:ring-1 focus:ring-[var(--teal)] focus:outline-none resize-y touch-manipulation"
					style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
				/>
			</div>

			{/* Анамнез заболевания и жизни */}
			<div className="flex flex-col gap-1">
				<div className="flex items-center justify-between">
					<label
						htmlFor="soap-anamnesis"
						className="text-xs font-bold text-[var(--ink)]"
					>
						Анамнез и противопоказания
					</label>
					<span className="text-[10px] text-[var(--muted)]">Аллергоанамнез</span>
				</div>
				<textarea
					id="soap-anamnesis"
					rows={3}
					value={values.anamnesis || ""}
					onChange={(e) => onFieldChange("anamnesis", e.target.value)}
					onFocus={onInputFocus}
					onBlur={flushDraft}
					placeholder="Зуб ранее лечен, боли возникли 2 дня назад. Соматически здоров..."
					className="w-full p-2 text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:ring-1 focus:ring-[var(--teal)] focus:outline-none resize-y touch-manipulation"
					style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
				/>
			</div>

			{/* Осмотр и зубная формула */}
			<div className="flex flex-col gap-1 md:col-span-2">
				<div className="flex items-center justify-between">
					<label
						htmlFor="soap-objective"
						className="text-xs font-bold text-[var(--ink)]"
					>
						Осмотр и зубная формула
					</label>
					<span className="text-[10px] text-[var(--muted)]">
						Зондирование, перкуссия, ЭОД, КЛКТ
					</span>
				</div>
				<textarea
					id="soap-objective"
					rows={3}
					value={values.objectiveStatus || ""}
					onChange={(e) =>
						onFieldChange("objectiveStatus", e.target.value)
					}
					onFocus={onInputFocus}
					onBlur={flushDraft}
					placeholder="Кариозная полость средней глубины на окклюзионной поверхности, зондирование слабо болезненно..."
					className="w-full p-2 text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:ring-1 focus:ring-[var(--teal)] focus:outline-none resize-y touch-manipulation"
					style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
				/>
			</div>

			{/* Клинический диагноз */}
			<div className="flex flex-col gap-1 md:col-span-2">
				<div className="flex items-center justify-between">
					<label
						htmlFor="soap-diagnosis"
						className="text-xs font-bold text-[var(--ink)]"
					>
						Диагноз (МКБ-10)
					</label>
					<span className="text-[10px] text-[var(--teal,var(--brand-primary))] font-semibold">
						{values.icd10 || "МКБ-10"}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<input
						id="soap-icd10"
						type="text"
						value={values.icd10 || ""}
						onChange={(e) => onFieldChange("icd10", e.target.value)}
						onFocus={onInputFocus}
						onBlur={flushDraft}
						placeholder="K02.1"
						aria-label="Код МКБ-10"
						className="w-24 min-h-[44px] sm:min-h-0 sm:h-8 px-2 text-xs font-bold text-[var(--teal,var(--brand-primary))] bg-[var(--paper)] border border-[var(--line)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--teal)] touch-manipulation"
						style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
					/>
					<button
						type="button"
						onClick={() => onToggleIcd10Selector((prev) => !prev)}
						data-testid="btn-open-icd10-selector"
						className={`min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
							isIcd10SelectorOpen
								? "bg-[var(--teal,var(--brand-primary))] text-white border-[var(--teal,var(--brand-primary))]"
								: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,var(--brand-primary))]"
						}`}
						title="Справочник диагнозов (K00–K14, шаблоны)"
					>
						<BookOpen className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))] shrink-0" />
						<span className="hidden sm:inline">Справочник</span>
					</button>
					<input
						id="soap-diagnosis"
						type="text"
						value={values.diagnosis || ""}
						onChange={(e) => onFieldChange("diagnosis", e.target.value)}
						onFocus={onInputFocus}
						onBlur={flushDraft}
						placeholder="Клинический диагноз: Кариес дентина зуба 16..."
						className="flex-1 min-h-[44px] sm:min-h-0 sm:h-8 px-2 text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--teal)] touch-manipulation"
						style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
					/>
				</div>
				{isIcd10SelectorOpen && (
					<div className="mt-2 p-2 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-lg">
						<div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--line)]">
							<div className="flex items-center gap-2">
								<BookOpen className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
								<span className="text-xs font-bold text-[var(--ink)]">
									Справочник диагнозов (Стоматология K00–K14)
								</span>
							</div>
							<button
								type="button"
								onClick={() => onToggleIcd10Selector(false)}
								className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-1 text-[var(--muted)] hover:text-[var(--ink)] rounded-lg cursor-pointer flex items-center justify-center"
								aria-label="Закрыть справочник диагнозов"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
						<Icd10ClinicalSelector
							selectedCode={values.icd10}
							selectedTooth={selectedTooth}
							onSelect={(item, toothNumber) => {
								onFieldChange("icd10", item.code);
								const targetTooth = toothNumber ?? selectedTooth;
								const toothPart = targetTooth ? ` зуба ${targetTooth}` : "";
								onFieldChange(
									"diagnosis",
									`${item.code} ${item.titleRu}${toothPart}`.trim(),
								);
								onToggleIcd10Selector(false);
							}}
							onClear={() => {
								onFieldChange("icd10", "");
								onToggleIcd10Selector(false);
							}}
						/>
					</div>
				)}
			</div>

			{/* Протокол лечения */}
			<div className="flex flex-col gap-1 md:col-span-2">
				<div className="flex items-center justify-between">
					<label
						htmlFor="soap-treatment"
						className="text-xs font-bold text-[var(--ink)]"
					>
						Протокол лечения
					</label>
					<span className="text-[10px] text-[var(--muted)]">
						Анестезия, препарирование, пломба/коронка/удаление
					</span>
				</div>
				<textarea
					id="soap-treatment"
					rows={4}
					value={values.treatmentPlan || ""}
					onChange={(e) =>
						onFieldChange("treatmentPlan", e.target.value)
					}
					onFocus={onInputFocus}
					onBlur={flushDraft}
					placeholder="Анестезия sol. Articaini 1:200000 1.8 мл. Препарирование кариозной полости, коффердам..."
					className="w-full p-2 text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:ring-1 focus:ring-[var(--teal)] focus:outline-none resize-y font-mono text-[11px] touch-manipulation"
					style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
				/>
			</div>

			{/* P2: Рекомендации пациенту */}
			<div className="flex flex-col gap-1 md:col-span-2">
				<label
					htmlFor="soap-recommendations"
					className="text-xs font-bold text-[var(--ink)]"
				>
					Рекомендации и назначения
				</label>
				<textarea
					id="soap-recommendations"
					rows={2}
					value={values.recommendations || ""}
					onChange={(e) =>
						onFieldChange("recommendations", e.target.value)
					}
					onFocus={onInputFocus}
					onBlur={flushDraft}
					placeholder="Щадящая диета 2 часа, гигиена полости рта, НПВП при боли..."
					className="w-full p-2 text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:ring-1 focus:ring-[var(--teal)] focus:outline-none resize-y touch-manipulation"
					style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
				/>
			</div>
		</div>
	);
};
