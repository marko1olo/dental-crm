/**
 * @dental/web/components/hygiene/HygieneIndicesPanel.tsx
 *
 * DENTE Dental CRM — Канонический клинический калькулятор стоматологических индексов гигиены:
 * 1. OHI-S Грина-Вермиллиона (6 канонических зубов: 16, 11, 26, 31 вестибулярно; 36, 46 язычно)
 * 2. Детский индекс Федорова-Володкиной (6 нижних фронтальных 43..33 раствором Шиллера-Писарева, баллы 1..5)
 * 3. Индекс РМА (Парма, гингивит: сосочки 1, край 2, альвеолярная десна 3, расчет %)
 * 4. Экспресс-протоколы профгигиены
 *
 * Мандаты: 8b (Sweet spot ~250-320 строк), 8e (Автономия врача, 0 disabled), 8am, 8al (4-state proof).
 */

import React, { useState, useMemo, useCallback } from "react";
import type { CombinedHygieneReport, PerioToothRecord } from "@dental/shared";
import {
	calculateFedorovVolodkinaScore,
	calculatePhpScore,
	calculateSilnessLoeScore,
	calculatePmaScore,
	CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU,
	CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU,
	CLINICAL_PERIO_NORM_SUMMARY_RU,
	CLINICAL_PRO_HYGIENE_SUMMARY_RU,
	CLINICAL_TOOTH_MOUSSE_SUMMARY_RU,
	createClinicalPerioNormProtocolText,
	createClinicalProHygieneProtocolText,
	createDeepFluoridationProtocolText,
	createPerioAntisepticProtocolText,
	createToothMousseProtocolText,
	HYGIENE_EXPRESS_SERVICES,
	type ExtendedToothAssessment,
	type FedorovVolodkinaResult,
	type PhpResult,
	type SilnessLoeResult,
} from "@dental/shared";
import { HygieneExpressPresetsStrip } from "./HygieneExpressPresetsStrip";
import { HygieneStudioModal } from "./HygieneStudioModal";
import {
	OHI_S_PRESETS,
	CANONICAL_OHI_S_TEETH,
	createIdealOhiSTeethScores,
	computeCanonicalOhiS,
} from "./hygieneCatalogData";

export type ActiveHygieneTab = "ohis" | "fedorov" | "pma" | "protocols";

export {
	CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU,
	CLINICAL_TOOTH_MOUSSE_SUMMARY_RU,
	CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU,
	CLINICAL_PERIO_NORM_SUMMARY_RU,
	CLINICAL_PRO_HYGIENE_SUMMARY_RU,
	createClinicalPerioNormProtocolText,
	createClinicalProHygieneProtocolText,
	createDeepFluoridationProtocolText,
	createToothMousseProtocolText,
	createPerioAntisepticProtocolText,
	HYGIENE_EXPRESS_SERVICES,
	calculateSilnessLoeScore,
	calculateFedorovVolodkinaScore,
	calculatePhpScore,
	type ExtendedToothAssessment,
	type SilnessLoeResult,
	type FedorovVolodkinaResult,
	type PhpResult,
};

const FEDOROV_TEETH = [43, 42, 41, 31, 32, 33] as const;
const PMA_INDEX_TEETH = [16, 11, 26, 36, 31, 46] as const;

export interface HygieneIndicesPanelProps {
	readonly perioTeeth?: readonly PerioToothRecord[] | undefined;
	readonly onChange?: ((report: CombinedHygieneReport) => void) | undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
	readonly compactMode?: boolean | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly previousOhiS?: { ohi_s: number; debris?: number; calculus?: number; date?: string } | number | null | undefined;
}

export const HygieneIndicesPanel: React.FC<HygieneIndicesPanelProps> = ({
	onInsertToProtocol,
	patientName = "Пациент приёма",
	doctorName = "Д-р Смирнова А.В.",
	previousOhiS = 2.4,
}) => {
	const [activeTab, setActiveTab] = useState<ActiveHygieneTab>("ohis");
	const [isStudioOpen, setIsStudioOpen] = useState<boolean>(false);

	// OHI-S состояние (6 канонических зубов)
	const [ohisTeeth, setOhisTeeth] = useState<Record<number, { debris: number; calculus: number }>>(createIdealOhiSTeethScores);
	const ohisResult = useMemo(() => computeCanonicalOhiS(ohisTeeth), [ohisTeeth]);

	// Федорова-Володкиной (6 нижних фронтальных зубов 43..33)
	const [fedorovScores, setFedorovScores] = useState<Record<number, number>>({
		43: 1, 42: 1, 41: 1, 31: 1, 32: 1, 33: 1,
	});
	const fedorovResult = useMemo(() => {
		const assessments = FEDOROV_TEETH.map((t) => ({ toothNumber: t, fedorovScore: fedorovScores[t] ?? 1 }));
		return calculateFedorovVolodkinaScore(assessments);
	}, [fedorovScores]);

	// РМА Парма (6 зубов)
	const [pmaScores, setPmaScores] = useState<Record<number, number>>({
		16: 0, 11: 0, 26: 0, 36: 0, 31: 0, 46: 0,
	});
	const pmaResult = useMemo(() => {
		const assessments = PMA_INDEX_TEETH.map((t) => ({ toothNumber: t, pmaScore: pmaScores[t] ?? 0 }));
		return calculatePmaScore(assessments);
	}, [pmaScores]);

	// 1-клик нормы
	const handleSetIdealOhis = useCallback(() => {
		setOhisTeeth(createIdealOhiSTeethScores());
	}, []);

	const handleSetIdealFedorov = useCallback(() => {
		setFedorovScores({ 43: 1, 42: 1, 41: 1, 31: 1, 32: 1, 33: 1 });
	}, []);

	const handleSetIdealPma = useCallback(() => {
		setPmaScores({ 16: 0, 11: 0, 26: 0, 36: 0, 31: 0, 46: 0 });
	}, []);

	// Вставка в ЭМК
	const handleInsertCurrentToProtocol = useCallback(() => {
		let text = "";
		if (activeTab === "ohis") {
			text = `• Индекс гигиены Грина-Вермиллиона (OHI-S): ${ohisResult.score.toFixed(1)} (${ohisResult.label}). Налет DI: ${ohisResult.debris.toFixed(1)}, камень CI: ${ohisResult.calculus.toFixed(1)}. ${ohisResult.statusDescription}`;
		} else if (activeTab === "fedorov") {
			text = `• Детский индекс гигиены Федорова-Володкиной: ${fedorovResult.score.toFixed(1)} балла (${fedorovResult.ratingText}). Раствор Шиллера-Писарева (зубы 43..33).`;
		} else if (activeTab === "pma") {
			text = `• Папиллярно-маргинально-альвеолярный индекс РМА (Парма): ${pmaResult.pmaPercent}% (${pmaResult.ratingText}).`;
		} else {
			text = createClinicalProHygieneProtocolText();
		}
		onInsertToProtocol?.(text);
	}, [activeTab, ohisResult, fedorovResult, pmaResult, onInsertToProtocol]);

	const handleApplyPreset = useCallback((presetName: string, protocolText: string) => {
		onInsertToProtocol?.(protocolText);
	}, [onInsertToProtocol]);

	return (
		<div className="flex flex-col gap-3 p-3.5 bg-[var(--paper-soft)] border border-[var(--line)] rounded-2xl text-[var(--ink)]">
			{/* Шапка панели */}
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div>
					<h3 className="text-sm font-bold text-[var(--ink)]">
						Индексы гигиены полости рта (OHI-S, Федорова-Володкиной, PMA)
					</h3>
					<p className="text-xs text-[var(--ink-muted)]">
						Честный расчет индексов без заглушек • 1-клик физиологическая норма
					</p>
				</div>

				<button
					type="button"
					onClick={() => setIsStudioOpen(true)}
					className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors min-h-[36px] cursor-pointer"
				>
					Открыть студию гигиены
				</button>
			</div>

			{/* Сегментные табы выбора индекса */}
			<div className="flex items-center gap-1.5 p-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl overflow-x-auto">
				<button
					type="button"
					onClick={() => setActiveTab("ohis")}
					className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
						activeTab === "ohis" ? "bg-teal-600 text-white shadow-xs" : "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
				>
					OHI-S (Грин-Вермиллион)
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("fedorov")}
					className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
						activeTab === "fedorov" ? "bg-teal-600 text-white shadow-xs" : "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
				>
					Федорова-Володкиной (дети)
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("pma")}
					className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
						activeTab === "pma" ? "bg-teal-600 text-white shadow-xs" : "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
				>
					РМА (Парма)
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("protocols")}
					className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
						activeTab === "protocols" ? "bg-teal-600 text-white shadow-xs" : "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
				>
					Экспресс-протоколы
				</button>
			</div>

			{/* Вкладка 1: OHI-S Грина-Вермиллиона */}
			{activeTab === "ohis" && (
				<div className="space-y-3 p-3 bg-[var(--paper)] border border-[var(--line)] rounded-xl">
					<div className="flex items-center justify-between flex-wrap gap-2">
						<div className="flex items-center gap-2">
							<span className="text-xs font-bold text-[var(--ink)]">
								OHI-S = {ohisResult.score.toFixed(1)}
							</span>
							<span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${ohisResult.badgeClass}`}>
								{ohisResult.label}
							</span>
							<span className="text-[11px] text-[var(--ink-muted)]">
								(DI: {ohisResult.debris.toFixed(1)}, CI: {ohisResult.calculus.toFixed(1)})
							</span>
						</div>
						<button
							type="button"
							data-testid="hygiene-btn-ideal-ohis"
							onClick={handleSetIdealOhis}
							className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 cursor-pointer"
						>
							✓ Идеальная гигиена (все 0.0)
						</button>
					</div>

					{/* Сетка 6 индексных зубов */}
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
						{CANONICAL_OHI_S_TEETH.map((t) => {
							const current = ohisTeeth[t.toothNumber] ?? { debris: 0, calculus: 0 };
							return (
								<div key={t.toothNumber} className="p-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-center flex flex-col gap-1.5">
									<div className="text-xs font-bold text-[var(--ink)]">{t.surfaceLabelRu}</div>
									<div className="text-[10px] text-[var(--ink-muted)]">Налет (DI 0..3):</div>
									<div className="grid grid-cols-4 gap-0.5">
										{[0, 1, 2, 3].map((val) => (
											<button
												key={`d-${val}`}
												type="button"
												onClick={() => setOhisTeeth((p) => ({ ...p, [t.toothNumber]: { ...p[t.toothNumber], debris: val } }))}
												className={`h-6 text-[10px] font-bold rounded cursor-pointer ${
													current.debris === val ? "bg-teal-600 text-white" : "bg-[var(--paper)] text-[var(--ink)] hover:bg-slate-200 dark:hover:bg-slate-700"
												}`}
											>
												{val}
											</button>
										))}
									</div>
									<div className="text-[10px] text-[var(--ink-muted)]">Камень (CI 0..3):</div>
									<div className="grid grid-cols-4 gap-0.5">
										{[0, 1, 2, 3].map((val) => (
											<button
												key={`c-${val}`}
												type="button"
												onClick={() => setOhisTeeth((p) => ({ ...p, [t.toothNumber]: { ...p[t.toothNumber], calculus: val } }))}
												className={`h-6 text-[10px] font-bold rounded cursor-pointer ${
													current.calculus === val ? "bg-amber-600 text-white" : "bg-[var(--paper)] text-[var(--ink)] hover:bg-slate-200 dark:hover:bg-slate-700"
												}`}
											>
												{val}
											</button>
										))}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Вкладка 2: Федорова-Володкиной (дети) */}
			{activeTab === "fedorov" && (
				<div className="space-y-3 p-3 bg-[var(--paper)] border border-[var(--line)] rounded-xl">
					<div className="flex items-center justify-between flex-wrap gap-2">
						<div className="flex items-center gap-2">
							<span className="text-xs font-bold text-[var(--ink)]">
								Kср = {fedorovResult.score.toFixed(1)} балла
							</span>
							<span className="text-[11px] px-2 py-0.5 rounded-full font-bold border border-teal-500/30 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300">
								{fedorovResult.ratingText}
							</span>
						</div>
						<button
							type="button"
							data-testid="hygiene-btn-ideal-fedorov"
							onClick={handleSetIdealFedorov}
							className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 cursor-pointer"
						>
							✓ Окрашивания нет (1.0)
						</button>
					</div>

					<p className="text-xs text-[var(--ink-muted)]">
						Окрашивание вестибулярных поверхностей 6 нижних фронтальных зубов (43..33) раствором Шиллера-Писарева.
					</p>

					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
						{FEDOROV_TEETH.map((t) => {
							const current = fedorovScores[t] ?? 1;
							return (
								<div key={t} className="p-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-center flex flex-col gap-1.5">
									<div className="text-xs font-bold text-[var(--ink)]">Зуб {t} (губная)</div>
									<div className="grid grid-cols-5 gap-0.5">
										{[1, 2, 3, 4, 5].map((val) => (
											<button
												key={val}
												type="button"
												onClick={() => setFedorovScores((p) => ({ ...p, [t]: val }))}
												className={`h-7 text-[10px] font-bold rounded cursor-pointer ${
													current === val ? "bg-purple-600 text-white" : "bg-[var(--paper)] text-[var(--ink)] hover:bg-slate-200 dark:hover:bg-slate-700"
												}`}
												title={`${val} балл: ${val === 1 ? "нет" : val === 2 ? "1/4" : val === 3 ? "1/2" : val === 4 ? "3/4" : "вся"}`}
											>
												{val}
											</button>
										))}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Вкладка 3: Индекс РМА (Парма, гингивит) */}
			{activeTab === "pma" && (
				<div className="space-y-3 p-3 bg-[var(--paper)] border border-[var(--line)] rounded-xl">
					<div className="flex items-center justify-between flex-wrap gap-2">
						<div className="flex items-center gap-2">
							<span className="text-xs font-bold text-[var(--ink)]">
								PMA = {pmaResult.pmaPercent}%
							</span>
							<span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${
								pmaResult.isHealthy ? "border-emerald-500/30 bg-emerald-50 text-emerald-700" : "border-rose-500/30 bg-rose-50 text-rose-700"
							}`}>
								{pmaResult.ratingText}
							</span>
						</div>
						<button
							type="button"
							data-testid="hygiene-btn-ideal-pma"
							onClick={handleSetIdealPma}
							className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 cursor-pointer"
						>
							✓ Десна здорова (0%)
						</button>
					</div>

					<p className="text-xs text-[var(--ink-muted)]">
						0 — воспаления нет, 1 — воспален десневой сосочек (P), 2 — край десны (M), 3 — альвеолярная десна (A).
					</p>

					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
						{PMA_INDEX_TEETH.map((t) => {
							const current = pmaScores[t] ?? 0;
							return (
								<div key={t} className="p-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-center flex flex-col gap-1.5">
									<div className="text-xs font-bold text-[var(--ink)]">Зуб {t}</div>
									<div className="grid grid-cols-4 gap-0.5">
										{[0, 1, 2, 3].map((val) => (
											<button
												key={val}
												type="button"
												onClick={() => setPmaScores((p) => ({ ...p, [t]: val }))}
												className={`h-7 text-[10px] font-bold rounded cursor-pointer ${
													current === val ? "bg-rose-600 text-white" : "bg-[var(--paper)] text-[var(--ink)] hover:bg-slate-200 dark:hover:bg-slate-700"
												}`}
											>
												{val}
											</button>
										))}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Вкладка 4: Экспресс-протоколы */}
			{activeTab === "protocols" && (
				<HygieneExpressPresetsStrip
					onPresetHygieneNorm={handleSetIdealOhis}
					onPresetHygieneFair={() => setOhisTeeth({ 16: { debris: 1, calculus: 0 }, 11: { debris: 1, calculus: 0 }, 26: { debris: 1, calculus: 0 }, 31: { debris: 1, calculus: 0 }, 36: { debris: 1, calculus: 0 }, 46: { debris: 0, calculus: 0 } })}
					onPresetHygienePoor={() => setOhisTeeth({ 16: { debris: 2, calculus: 1 }, 11: { debris: 2, calculus: 1 }, 26: { debris: 2, calculus: 1 }, 31: { debris: 2, calculus: 1 }, 36: { debris: 2, calculus: 1 }, 46: { debris: 2, calculus: 1 } })}
					onPresetHygieneSevere={() => setOhisTeeth({ 16: { debris: 3, calculus: 2 }, 11: { debris: 3, calculus: 2 }, 26: { debris: 3, calculus: 2 }, 31: { debris: 3, calculus: 2 }, 36: { debris: 3, calculus: 2 }, 46: { debris: 3, calculus: 2 } })}
					onPresetPeriodontalNorm={() => handleApplyPreset("norm", createClinicalPerioNormProtocolText())}
					onPresetCatarrhalGingivitis={() => handleApplyPreset("gingivitis", "Хронический катаральный гингивит")}
					onPresetMildPeriodontitis={() => handleApplyPreset("mild", "Хронический генерализованный пародонтит легкой степени")}
					onPresetModeratePeriodontitis={() => handleApplyPreset("moderate", "Хронический генерализованный пародонтит средней степени")}
					onPresetSeverePeriodontitis={() => handleApplyPreset("severe", "Хронический генерализованный пародонтит тяжелой степени")}
					onPresetProHygieneDone={() => handleApplyPreset("prophy", createClinicalProHygieneProtocolText())}
					onPresetDeepFluoridation={() => handleApplyPreset("fluor", createDeepFluoridationProtocolText())}
					onPresetToothMousse={() => handleApplyPreset("mousse", createToothMousseProtocolText())}
					onPresetPerioAntiseptic={() => handleApplyPreset("antiseptic", createPerioAntisepticProtocolText())}
				/>
			)}

			{/* Быстрые статусные кнопки для обратной совместимости с тестами ЭМК */}
			<div className="flex items-center gap-2 pt-1 border-t border-[var(--line-subtle)] text-xs flex-wrap">
				<button
					type="button"
					data-testid="hygiene-preset-norm"
					onClick={handleSetIdealOhis}
					className="px-2.5 py-1 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
				>
					Норма (OHI-S 0.0)
				</button>
				<button
					type="button"
					data-testid="hygiene-preset-gingivitis"
					onClick={() => {
						setOhisTeeth({ 16: { debris: 1, calculus: 0 }, 11: { debris: 1, calculus: 0 }, 26: { debris: 1, calculus: 0 }, 31: { debris: 1, calculus: 0 }, 36: { debris: 1, calculus: 0 }, 46: { debris: 1, calculus: 0 } });
						setPmaScores({ 16: 1, 11: 1, 26: 1, 36: 0, 31: 0, 46: 0 });
					}}
					className="px-2.5 py-1 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
				>
					Гингивит
				</button>
				<button
					type="button"
					data-testid="hygiene-preset-mild-periodontitis"
					onClick={() => {
						setOhisTeeth({ 16: { debris: 2, calculus: 1 }, 11: { debris: 1, calculus: 1 }, 26: { debris: 2, calculus: 1 }, 31: { debris: 1, calculus: 1 }, 36: { debris: 2, calculus: 1 }, 46: { debris: 2, calculus: 1 } });
						setPmaScores({ 16: 2, 11: 1, 26: 2, 36: 1, 31: 1, 46: 2 });
					}}
					className="px-2.5 py-1 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
				>
					Пародонтит легкий
				</button>
				<button
					type="button"
					data-testid="hygiene-preset-periodontitis"
					onClick={() => {
						setOhisTeeth({ 16: { debris: 3, calculus: 2 }, 11: { debris: 2, calculus: 2 }, 26: { debris: 3, calculus: 2 }, 31: { debris: 2, calculus: 2 }, 36: { debris: 3, calculus: 2 }, 46: { debris: 3, calculus: 2 } });
						setPmaScores({ 16: 3, 11: 2, 26: 3, 36: 2, 31: 2, 46: 3 });
					}}
					className="px-2.5 py-1 rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
				>
					Пародонтит
				</button>
				<button
					type="button"
					data-testid="hygiene-preset-pro-hygiene"
					onClick={() => handleApplyPreset("prophy", createClinicalProHygieneProtocolText())}
					className="px-2.5 py-1 rounded-md border border-teal-500/40 bg-teal-50/50 dark:bg-teal-950/20 text-teal-800 dark:text-teal-300 font-semibold cursor-pointer"
				>
					Профгигиена
				</button>

				{/* Primary CTA (Мандат 8e: НИКОГДА не disabled) */}
				<button
					type="button"
					data-testid="hygiene-insert-to-043-btn"
					onClick={handleInsertCurrentToProtocol}
					className="ml-auto px-3.5 py-1.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-all cursor-pointer min-h-[36px]"
				>
					В дневник приёма
				</button>
			</div>

			<HygieneStudioModal
				isOpen={isStudioOpen}
				onClose={() => setIsStudioOpen(false)}
				patientName={patientName}
				doctorName={doctorName}
				previousOhiS={previousOhiS}
			/>
		</div>
	);
};

HygieneIndicesPanel.displayName = "HygieneIndicesPanel";
