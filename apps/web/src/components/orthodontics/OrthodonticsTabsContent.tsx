/**
 * @dental/web/components/orthodontics/OrthodonticsTabsContent.tsx
 *
 * DENTE Dental CRM — Контент вкладок ортодонтической студии (Мандаты 8b, 8e, 8x).
 * Брекеты, элайнеры, фотопротокол, ТРГ и клинический дневник SOAP.
 */

import React, { useState, useMemo } from "react";
import { Check, Layers, ArrowRight, Copy, BookOpen, Camera, Activity, UploadCloud, Calculator, Scale, RotateCcw } from "lucide-react";
import {
	isSlotMatching,
	calculateBoltonIndex,
	calculateTonnIndex,
	calculatePontIndex,
	calculateSnaginaIndex,
} from "@dental/shared";
import {
	ARCHWIRE_ALLOYS_SSOT, ARCHWIRE_SECTIONS_SSOT, ELASTICS_CATALOG,
	CHAIRSIDE_ACTIONS_CATALOG, ANGLE_CLASSES_CATALOG, ORTHO_PHOTO_SLOTS_SSOT,
	TRG_ANGLES_NORMS_SSOT, ORTHO_PATIENT_MEMO_SECTIONS, evaluateTrgAngleStatus,
	type ArchwireAlloy, type ArchwireSection, type OrthoProtocolState,
} from "./orthodonticsCatalogData";
import { AlignerCaseTracker } from "./AlignerCaseTracker";
import { BiteClassificationCard } from "./BiteClassificationCard";
import { CephalometricCanvas, type PointCoord } from "./CephalometricCanvas";
import { calculateCephalometrics } from "./cephalometricMath";
import { OrthodonticTimeline } from "./OrthodonticTimeline";
import type { CephalometricSavedStudy } from "./cephalometricPersistence";

export interface OrthodonticsTabsContentProps {
	readonly activeTab: "brackets" | "aligners" | "photo_trg" | "biometrics" | "diary";
	readonly protocol: OrthoProtocolState;
	readonly setProtocol: React.Dispatch<React.SetStateAction<OrthoProtocolState>>;
	readonly selectedElasticSize: string;
	readonly setSelectedElasticSize: (val: string) => void;
	readonly handleToggleAction: (actionId: string) => void;
	readonly handleSyncUpperToLower: () => void;
	readonly handleAdvanceAlignerStep: () => void;
	readonly handleTogglePhotoSlot: (slotId: string) => void;
	readonly handleCopyText: (textToCopy: string, successMsg: string) => void;
	readonly soapSummary: string;
	readonly memoText: string;
	readonly onOpenPhotoModal: () => void;
	readonly onOpenCephModal: () => void;
	readonly totalSetupCostKopecks?: bigint | undefined;
	readonly cephStudy?: CephalometricSavedStudy | null | undefined;
	readonly onUpdateCephStudy?: ((study: CephalometricSavedStudy) => void) | undefined;
}

export const OrthodonticsTabsContent: React.FC<OrthodonticsTabsContentProps> = ({
	activeTab,
	protocol,
	setProtocol,
	selectedElasticSize,
	setSelectedElasticSize,
	handleToggleAction,
	handleSyncUpperToLower,
	handleAdvanceAlignerStep,
	handleTogglePhotoSlot,
	handleCopyText,
	soapSummary,
	memoText,
	onOpenPhotoModal,
	onOpenCephModal,
	totalSetupCostKopecks,
	cephStudy,
	onUpdateCephStudy,
}) => {
	const [showTracingPreview, setShowTracingPreview] = useState<boolean>(false);

	const activeLandmarks: Record<string, PointCoord> = useMemo(() => {
		if (!cephStudy?.landmarks) return {};
		const res: Record<string, PointCoord> = {};
		for (const [k, v] of Object.entries(cephStudy.landmarks)) {
			if (v && typeof v.x === "number" && typeof v.y === "number") {
				res[k] = { x: v.x, y: v.y };
			}
		}
		return res;
	}, [cephStudy?.landmarks]);

	// Биометрические индексы (Болтон, Тонн, Пон, Снагина)
	const [isDeciduous, setIsDeciduous] = useState<boolean>(false);
	const [sumUpper4, setSumUpper4] = useState<number>(31.0);
	const [sumLower4, setSumLower4] = useState<number>(23.2);
	const [sumUpper6, setSumUpper6] = useState<number>(47.0);
	const [sumLower6, setSumLower6] = useState<number>(36.3);
	const [upper12Sum, setUpper12Sum] = useState<number>(85.0);
	const [lower12Sum, setLower12Sum] = useState<number>(77.6);
	const [apicalBaseUpper, setApicalBaseUpper] = useState<number>(50.5);
	const [apicalBaseLower, setApicalBaseLower] = useState<number>(36.4);
	const [measuredPremolars, setMeasuredPremolars] = useState<number>(38.8);
	const [measuredMolars, setMeasuredMolars] = useState<number>(48.4);

	const tonnResult = useMemo(() => calculateTonnIndex(sumUpper4, sumLower4, isDeciduous), [sumUpper4, sumLower4, isDeciduous]);
	const boltonResult = useMemo(() => calculateBoltonIndex(sumUpper6, sumLower6, upper12Sum, lower12Sum), [sumUpper6, sumLower6, upper12Sum, lower12Sum]);
	const pontResult = useMemo(() => calculatePontIndex(sumUpper4, measuredPremolars, measuredMolars), [sumUpper4, measuredPremolars, measuredMolars]);
	const snaginaUpperResult = useMemo(() => calculateSnaginaIndex(sumUpper4, apicalBaseUpper, "maxilla"), [sumUpper4, apicalBaseUpper]);
	const snaginaLowerResult = useMemo(() => calculateSnaginaIndex(sumLower4, apicalBaseLower, "mandible"), [sumLower4, apicalBaseLower]);

	const formattedBiometricsSoap = useMemo(() => {
		return [
			`[БИОМЕТРИЧЕСКИЕ ИНДЕКСЫ ЗУБНЫХ РЯДОВ И ЧЕЛЮСТЕЙ]`,
			`1. Индекс Тонна: ${tonnResult.ratio} (норма ${tonnResult.normReference}). ${tonnResult.interpretation}`,
			`2. Индекс Болтона (переднее): ${boltonResult.anteriorRatioPercent}% (норма 77.2%). ${boltonResult.anteriorDiscrepancyInterpretation}`,
			`   Индекс Болтона (полное): ${boltonResult.overallRatioPercent}% (норма 91.3%). ${boltonResult.overallDiscrepancyInterpretation}`,
			`3. Индекс Пона: премоляры ${pontResult.measuredPremolarWidthMm} мм (расч. ${pontResult.calculatedPremolarWidthMm} мм, ${pontResult.premolars.status === "normal" ? "норма" : pontResult.premolarDiscrepancyMm > 0 ? `расширение +${pontResult.premolarDiscrepancyMm}` : `сужение ${pontResult.premolarDiscrepancyMm}`} мм); моляры ${pontResult.measuredMolarWidthMm} мм (расч. ${pontResult.calculatedMolarWidthMm} мм, ${pontResult.molars.status === "normal" ? "норма" : pontResult.molarDiscrepancyMm > 0 ? `расширение +${pontResult.molarDiscrepancyMm}` : `сужение ${pontResult.molarDiscrepancyMm}`} мм).`,
			`4. Индекс Снагиной: ВЧ ${snaginaUpperResult.ratioPercent}% (норма 61.4%). ${snaginaUpperResult.interpretation}`,
			`   Индекс Снагиной: НЧ ${snaginaLowerResult.ratioPercent}% (норма 63.8%). ${snaginaLowerResult.interpretation}`,
		].join("\n");
	}, [tonnResult, boltonResult, pontResult, snaginaUpperResult, snaginaLowerResult]);

	const renderJawCard = (title: string, isUpper: boolean) => {
		const currentAlloy = isUpper ? protocol.upperAlloy : protocol.lowerAlloy;
		const currentSection = isUpper ? protocol.upperSection : protocol.lowerSection;
		const setAlloy = (a: ArchwireAlloy) => setProtocol((p) => (isUpper ? { ...p, upperAlloy: a } : { ...p, lowerAlloy: a }));
		const setSection = (s: ArchwireSection) => setProtocol((p) => (isUpper ? { ...p, upperSection: s } : { ...p, lowerSection: s }));

		return (
			<div className="ortho-card">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2 min-w-0">
						<Layers className={`w-4 h-4 shrink-0 ${isUpper ? "text-[var(--primary)]" : "text-[var(--primary-strong,var(--primary))]"}`} />
						<span className="text-sm font-semibold text-[var(--ink)]">{title}</span>
					</div>
					{isUpper && (
						<button
							type="button"
							onClick={handleSyncUpperToLower}
							className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--primary)] hover:border-[var(--primary)] flex items-center gap-1 whitespace-nowrap shrink-0 min-h-[36px] transition-colors cursor-pointer"
						>
							<span>Копировать на НЧ</span>
							<ArrowRight className="w-3 h-3 shrink-0" />
						</button>
					)}
				</div>
				<div className="flex flex-col gap-1.5">
					<span className="text-[11px] font-medium text-[var(--ink-muted)]">Сплав дуги:</span>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
						{ARCHWIRE_ALLOYS_SSOT.map((alloy) => (
							<button key={alloy.key} type="button" onClick={() => setAlloy(alloy.key)} className={`ortho-touch-button ${currentAlloy === alloy.key ? "selected" : ""}`}>
								{alloy.shortRu}
							</button>
						))}
					</div>
				</div>
				<div className="flex flex-col gap-1.5">
					<span className="text-[11px] font-medium text-[var(--ink-muted)]">Сечение дуги:</span>
					<div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
						{ARCHWIRE_SECTIONS_SSOT.map((sec) => (
							<button key={sec.section} type="button" onClick={() => setSection(sec.section)} className={`ortho-touch-button ${currentSection === sec.section ? "selected" : ""}`}>
								{sec.dimensionRu}
							</button>
						))}
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className="ortho-content-body">
			{activeTab === "brackets" && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					{renderJawCard("Верхняя челюсть (ВЧ)", true)}
					{renderJawCard("Нижняя челюсть (НЧ)", false)}
					<div className="ortho-card">
						<div className="flex items-center justify-between">
							<span className="text-sm font-semibold text-[var(--ink)]">Межчелюстные эластики</span>
							{protocol.selectedElasticId && (
								<button type="button" onClick={() => setProtocol((p) => ({ ...p, selectedElasticId: null }))} className="text-[11px] text-[var(--ink-muted)] hover:text-[var(--ink)]">Снять тяги</button>
							)}
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
							{ELASTICS_CATALOG.map((elastic) => {
								const isSelected = protocol.selectedElasticId === elastic.id;
								return (
									<button key={elastic.id} type="button" onClick={() => setProtocol((p) => ({ ...p, selectedElasticId: isSelected ? null : elastic.id }))} className={`min-h-[44px] p-2.5 rounded-lg border text-left transition-all flex flex-col gap-1 ${isSelected ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--ink)] shadow-xs" : "border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper)]"}`}>
										<div className="flex items-center justify-between">
											<span className="text-xs font-bold">{elastic.classNameRu}</span>
											<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--paper-soft)]">{elastic.animalName}</span>
										</div>
										<div className="text-[11px] text-[var(--ink-muted)]">{elastic.forceOz} ({elastic.sizeInch})</div>
										<div className="text-[10px] text-[var(--primary)] font-medium">{elastic.hookSchemeRu}</div>
									</button>
								);
							})}
						</div>
						<div className="flex items-center gap-2 pt-2 border-t border-[var(--line)]">
							<span className="text-[11px] font-medium text-[var(--ink-muted)]">Калибр эластиков:</span>
							<select
								aria-label="Размер эластиков"
								value={selectedElasticSize}
								onChange={(e) => setSelectedElasticSize(e.target.value)}
								className="h-8 px-2 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] cursor-pointer"
							>
								<option value="3/16 Medium">3/16" Medium (Fox) 4.5 oz</option>
								<option value="1/4 Medium">1/4" Medium (Rabbit) 4.5 oz</option>
								<option value="5/16 Medium">5/16" Medium (Penguin) 4.5 oz</option>
								<option value="1/8 Heavy">1/8" Heavy (Chipmunk) 6.0 oz</option>
							</select>
						</div>
					</div>
					<div className="ortho-card">
						<span className="text-sm font-semibold text-[var(--ink)]">Манипуляции приёма</span>
						<div className="flex flex-wrap gap-1.5">
							{CHAIRSIDE_ACTIONS_CATALOG.map((action) => {
								const isChecked = protocol.selectedActionIds.includes(action.id);
								return (
									<button key={action.id} type="button" onClick={() => handleToggleAction(action.id)} className={`min-h-[44px] px-3 py-2 text-xs font-medium rounded-lg border transition-all flex items-center gap-2 ${isChecked ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] font-semibold shadow-xs" : "border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper)]"}`}>
										<div className={`w-4 h-4 rounded flex items-center justify-center border ${isChecked ? "bg-[var(--primary)] border-[var(--primary)] text-white" : "border-[var(--line)] bg-[var(--paper)]"}`}>
											{isChecked && <Check className="w-3 h-3" />}
										</div>
										<span>{action.label}</span>
									</button>
								);
							})}
						</div>
					</div>
				</div>
			)}

			{activeTab === "aligners" && (
				<div className="flex flex-col gap-4">
					<AlignerCaseTracker
						tracking={protocol.alignerTracking}
						onChange={(updater) => setProtocol((p) => ({ ...p, alignerTracking: updater(p.alignerTracking) }))}
						onAdvanceStep={handleAdvanceAlignerStep}
						onAddAligner={() => {
							setProtocol((p) => ({
								...p,
								alignerTracking: {
									...p.alignerTracking,
									totalSteps: (p.alignerTracking.totalSteps || 24) + 2,
								},
							}));
						}}
						totalSetupCostKopecks={totalSetupCostKopecks}
					/>
					<BiteClassificationCard
						angleClass={protocol.angleClass}
						onAngleClassChange={(ac) => setProtocol((p) => ({ ...p, angleClass: ac }))}
						verticalBite={protocol.verticalBite}
						onVerticalBiteChange={(vb) => setProtocol((p) => ({ ...p, verticalBite: vb }))}
						overjetMm={protocol.overjetMm}
						onOverjetMmChange={(val) => setProtocol((p) => ({ ...p, overjetMm: val }))}
						overbitePercent={protocol.overbitePercent}
						onOverbitePercentChange={(val) => setProtocol((p) => ({ ...p, overbitePercent: val }))}
						anbDeg={protocol.trgValues?.anb ?? 2.0}
						onAnbDegChange={(val) => setProtocol((p) => ({
							...p,
							trgValues: { ...(p.trgValues ?? {}), anb: val },
						}))}
					/>
				</div>
			)}

			{activeTab === "photo_trg" && (
				<div className="flex flex-col gap-4">
					<div className="ortho-card">
						<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
							<div>
								<h4 className="text-sm font-semibold text-[var(--ink)]">Клинический фотопротокол и ТРГ</h4>
								<p className="text-[11px] text-[var(--ink-muted)]">Связка со специализированными модулями фотопротокола и цефалометрии</p>
							</div>
							<div className="flex items-center gap-2 flex-wrap">
								<button
									type="button"
									onClick={onOpenPhotoModal}
									className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all flex items-center gap-1.5 min-h-[36px]"
								>
									<Camera className="w-3.5 h-3.5" />
									<span>Фотопротокол (8 проекций)</span>
								</button>
								<button
									type="button"
									onClick={onOpenCephModal}
									className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all flex items-center gap-1.5 min-h-[36px]"
								>
									<Activity className="w-3.5 h-3.5 text-[var(--primary)]" />
									<span>Анализ ТРГ</span>
								</button>
							</div>
						</div>
						<div className="ortho-photo-grid pt-2">
							{ORTHO_PHOTO_SLOTS_SSOT.map((slot) => {
								const isVerified =
									Boolean(protocol.photoStatuses[slot.id]) ||
									Object.entries(protocol.photoStatuses).some(
										([key, val]) => Boolean(val) && isSlotMatching(key, slot.id),
									);
								return (
									<div key={slot.id} onClick={() => handleTogglePhotoSlot(slot.id)} className={`ortho-photo-card cursor-pointer ${isVerified ? "verified" : ""}`}>
										<div className="flex items-center justify-between">
											<span className="text-xs font-bold text-[var(--ink)]">{slot.titleRu}</span>
											<span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${isVerified ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "bg-[var(--paper-soft)] text-[var(--ink-muted)]"}`}>
												{isVerified ? "Зафиксировано" : "Ожидает"}
											</span>
										</div>
										<p className="text-[11px] text-[var(--ink-muted)] leading-tight">{slot.descriptionRu}</p>
									</div>
								);
							})}
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{TRG_ANGLES_NORMS_SSOT.map((norm) => {
							const currentVal = protocol.trgValues?.[norm.key] ?? norm.normDeg;
							const evaluation = evaluateTrgAngleStatus(norm.key, currentVal);
							return (
								<div key={norm.key} className="ortho-card">
									<div className="flex items-center justify-between">
										<span className="text-xs font-bold text-[var(--ink)]">{norm.symbol}</span>
										<span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${evaluation.status === "normal" ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "bg-[var(--warning-soft)] text-[var(--warning-ink)]"}`}>
											{evaluation.badgeLabelRu}
										</span>
									</div>
									<div className="flex items-baseline gap-2">
										<span className="text-2xl font-extrabold text-[var(--ink)]">{currentVal}°</span>
										<span className="text-xs text-[var(--ink-muted)]">Норма: {norm.normDeg}° ± {norm.toleranceDeg}°</span>
									</div>
									<p className="text-[11px] text-[var(--ink-muted)] leading-tight">{norm.interpretationRu}</p>
								</div>
							);
						})}
					</div>

					<div className="ortho-card flex flex-col gap-3">
						<div className="flex items-center justify-between flex-wrap gap-2">
							<div>
								<h4 className="text-sm font-semibold text-[var(--ink)]">Интерактивная трассировка ТРГ</h4>
								<p className="text-[11px] text-[var(--ink-muted)]">16 краниофациальных ориентиров, анатомические плоскости и фильтры кости</p>
							</div>
							<button
								type="button"
								onClick={() => setShowTracingPreview((v) => !v)}
								className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--primary)] hover:border-[var(--primary)] flex items-center gap-1.5 transition-colors cursor-pointer min-h-[36px]"
							>
								<Activity className="w-3.5 h-3.5" />
								<span>{showTracingPreview ? "Скрыть холст" : "Развернуть трассировку"}</span>
							</button>
						</div>
						{showTracingPreview && (
							cephStudy?.imageUrl ? (
								<CephalometricCanvas
									imageUrl={cephStudy.imageUrl}
									landmarks={activeLandmarks}
									scaleMmPerPixel={cephStudy.scaleMmPerPixel || 0.15}
									onLandmarkChange={(id, pt) => {
										const updated = { ...activeLandmarks, [id]: pt };
										const scale = cephStudy.scaleMmPerPixel || 0.15;
										// DEF-ORTHO-SEV2-03: Реактивный пересчет углов ТРГ и синхронизация с карточками
										const result = calculateCephalometrics(updated, scale);
										const newTrg: Record<string, number> = {};
										for (const m of result.measurements) {
											if (typeof m.value === "number") {
												if (m.id === "SNA") newTrg.sna = m.value;
												if (m.id === "SNB") newTrg.snb = m.value;
												if (m.id === "ANB") newTrg.anb = m.value;
												if (m.id === "1-NA-Angle") newTrg.u1_na = m.value;
												if (m.id === "1-NB-Angle") newTrg.l1_nb = m.value;
												if (m.id === "FMA") newTrg.fma = m.value;
											}
										}
										setProtocol((prev) => ({
											...prev,
											trgValues: {
												...(prev.trgValues || {}),
												...newTrg,
											},
										}));
										if (onUpdateCephStudy && cephStudy) {
											onUpdateCephStudy({
												...cephStudy,
												landmarks: updated,
											});
										}
									}}
									className="min-h-[420px] rounded-xl border border-[var(--line)]"
								/>
							) : (
								<div
									data-testid="ceph-tracing-empty-state"
									className="py-10 px-4 flex flex-col items-center justify-center text-center gap-3 rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper-soft)]/50"
								>
									<Activity className="w-10 h-10 text-[var(--ink-muted)] stroke-[1.5]" />
									<div className="flex flex-col gap-1 max-w-sm">
										<span className="text-sm font-semibold text-[var(--ink)]">
											Снимок ТРГ ещё не загружен
										</span>
										<p className="text-xs text-[var(--ink-muted)] leading-relaxed">
											Для интерактивной трассировки и расчета углов требуется боковая телерентгенограмма пациента.
										</p>
									</div>
									<button
										type="button"
										onClick={onOpenCephModal}
										className="px-3 py-2 text-xs font-semibold rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs min-h-[36px]"
									>
										<UploadCloud className="w-4 h-4" />
										<span>Загрузить снимок ТРГ</span>
									</button>
								</div>
							)
						)}
					</div>

					<div className="ortho-card flex items-center justify-between p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
						<div className="flex items-center gap-2.5">
							<Calculator className="w-4 h-4 text-[var(--primary)]" />
							<div>
								<span className="text-xs font-bold text-[var(--ink)]">Биометрический экспресс-анализ (Болтон, Тонн, Пон, Снагина)</span>
								<p className="text-[11px] text-[var(--ink-muted)]">
									Тонн: {tonnResult.ratio} · Болтон: {boltonResult.anteriorRatioPercent}% / {boltonResult.overallRatioPercent}% · Снагина ВЧ: {snaginaUpperResult.ratioPercent}% · Снагина НЧ: {snaginaLowerResult.ratioPercent}%
								</p>
							</div>
						</div>
						<button
							type="button"
							onClick={() => handleCopyText(formattedBiometricsSoap, "Биометрический анализ скопирован")}
							className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--primary)] hover:border-[var(--primary)] flex items-center gap-1 transition-colors cursor-pointer min-h-[32px] shrink-0"
						>
							<Copy className="w-3 h-3" />
							<span>В дневник</span>
						</button>
					</div>
				</div>
			)}

			{activeTab === "biometrics" && (
				<div className="flex flex-col gap-4" data-testid="biometrics-calculator-tab">
					{/* Заголовок и быстрые пресеты */}
					<div className="ortho-card">
						<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
							<div className="flex items-center gap-2.5">
								<div className="w-8 h-8 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
									<Calculator className="w-4 h-4" />
								</div>
								<div>
									<h4 className="text-sm font-bold text-[var(--ink)]">Калькулятор биометрических индексов у кресла</h4>
									<p className="text-xs text-[var(--ink-muted)]">Анализ пропорций зубов и апикальных базисов: Болтон, Тонн, Пон и Снагина</p>
								</div>
							</div>
							<div className="flex items-center gap-2 flex-wrap">
								<button
									type="button"
									onClick={() => setIsDeciduous((v) => !v)}
									className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer min-h-[36px] ${
										isDeciduous
											? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
											: "border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)]"
									}`}
								>
									{isDeciduous ? "Сменный прикус (Тонн 1.30)" : "Постоянный прикус (Тонн 1.33)"}
								</button>
								<button
									type="button"
									onClick={() => {
										setIsDeciduous(false);
										setSumUpper4(31.0);
										setSumLower4(23.2);
										setSumUpper6(47.0);
										setSumLower6(36.3);
										setUpper12Sum(85.0);
										setLower12Sum(77.6);
										setApicalBaseUpper(50.5);
										setApicalBaseLower(36.4);
										setMeasuredPremolars(38.8);
										setMeasuredMolars(48.4);
									}}
									className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink-muted)] hover:text-[var(--ink)] flex items-center gap-1 transition-colors cursor-pointer min-h-[36px]"
								>
									<RotateCcw className="w-3.5 h-3.5" />
									<span>Физиологическая норма</span>
								</button>
								<button
									type="button"
									onClick={() => handleCopyText(formattedBiometricsSoap, "Биометрический анализ скопирован")}
									className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center gap-1.5 transition-colors cursor-pointer min-h-[36px] shadow-xs"
								>
									<Copy className="w-3.5 h-3.5" />
									<span>Скопировать в дневник</span>
								</button>
							</div>
						</div>
					</div>

					{/* Интерактивный ввод параметров измерений */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{/* Верхняя челюсть */}
						<div className="ortho-card">
							<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
								<Layers className="w-3.5 h-3.5 text-[var(--primary)]" />
								<span>Измерения верхней челюсти (ВЧ)</span>
							</span>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
								<div className="p-2 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col gap-1">
									<label htmlFor="bio-sum-upper-4" className="text-[10px] text-[var(--ink-muted)] font-medium">Сумма 4 резцов ВЧ (SI ВЧ, мм)</label>
									<input
										id="bio-sum-upper-4"
										type="number"
										step="0.1"
										min="10"
										max="60"
										value={sumUpper4}
										onChange={(e) => setSumUpper4(parseFloat(e.target.value) || 0)}
										className="h-8 px-2 text-xs font-mono font-bold bg-[var(--paper)] border border-[var(--line)] rounded text-[var(--ink)]"
									/>
									<span className="text-[9px] text-[var(--ink-muted)]">Норма: ~28–35 мм</span>
								</div>
								<div className="p-2 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col gap-1">
									<label htmlFor="bio-sum-upper-6" className="text-[10px] text-[var(--ink-muted)] font-medium">Сумма 6 передних ВЧ (13–23, мм)</label>
									<input
										id="bio-sum-upper-6"
										type="number"
										step="0.1"
										min="20"
										max="80"
										value={sumUpper6}
										onChange={(e) => setSumUpper6(parseFloat(e.target.value) || 0)}
										className="h-8 px-2 text-xs font-mono font-bold bg-[var(--paper)] border border-[var(--line)] rounded text-[var(--ink)]"
									/>
									<span className="text-[9px] text-[var(--ink-muted)]">Для переднего Болтона</span>
								</div>
								<div className="p-2 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col gap-1">
									<label htmlFor="bio-apical-upper" className="text-[10px] text-[var(--ink-muted)] font-medium">Ширина апикального базиса ВЧ (мм)</label>
									<input
										id="bio-apical-upper"
										type="number"
										step="0.1"
										min="20"
										max="80"
										value={apicalBaseUpper}
										onChange={(e) => setApicalBaseUpper(parseFloat(e.target.value) || 0)}
										className="h-8 px-2 text-xs font-mono font-bold bg-[var(--paper)] border border-[var(--line)] rounded text-[var(--ink)]"
									/>
									<span className="text-[9px] text-[var(--ink-muted)]">Индекс Снагиной (норма 61.4%)</span>
								</div>
								<div className="p-2 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col gap-1">
									<label htmlFor="bio-upper-12" className="text-[10px] text-[var(--ink-muted)] font-medium">Сумма 12 зубов ВЧ (16–26, мм)</label>
									<input
										id="bio-upper-12"
										type="number"
										step="0.1"
										min="40"
										max="130"
										value={upper12Sum}
										onChange={(e) => setUpper12Sum(parseFloat(e.target.value) || 0)}
										className="h-8 px-2 text-xs font-mono font-bold bg-[var(--paper)] border border-[var(--line)] rounded text-[var(--ink)]"
									/>
									<span className="text-[9px] text-[var(--ink-muted)]">Для общего Болтона</span>
								</div>
							</div>
						</div>

						{/* Нижняя челюсть и трансверзаль */}
						<div className="ortho-card">
							<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
								<Layers className="w-3.5 h-3.5 text-[var(--primary)]" />
								<span>Измерения нижней челюсти (НЧ) и трансверзали</span>
							</span>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
								<div className="p-2 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col gap-1">
									<label htmlFor="bio-sum-lower-4" className="text-[10px] text-[var(--ink-muted)] font-medium">Сумма 4 резцов НЧ (SI НЧ, мм)</label>
									<input
										id="bio-sum-lower-4"
										type="number"
										step="0.1"
										min="10"
										max="50"
										value={sumLower4}
										onChange={(e) => setSumLower4(parseFloat(e.target.value) || 0)}
										className="h-8 px-2 text-xs font-mono font-bold bg-[var(--paper)] border border-[var(--line)] rounded text-[var(--ink)]"
									/>
									<span className="text-[9px] text-[var(--ink-muted)]">Индекс Тонна: ВЧ / НЧ</span>
								</div>
								<div className="p-2 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col gap-1">
									<label htmlFor="bio-sum-lower-6" className="text-[10px] text-[var(--ink-muted)] font-medium">Сумма 6 передних НЧ (43–33, мм)</label>
									<input
										id="bio-sum-lower-6"
										type="number"
										step="0.1"
										min="20"
										max="70"
										value={sumLower6}
										onChange={(e) => setSumLower6(parseFloat(e.target.value) || 0)}
										className="h-8 px-2 text-xs font-mono font-bold bg-[var(--paper)] border border-[var(--line)] rounded text-[var(--ink)]"
									/>
									<span className="text-[9px] text-[var(--ink-muted)]">Передний Болтон (норма 77.2%)</span>
								</div>
								<div className="p-2 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col gap-1">
									<label htmlFor="bio-apical-lower" className="text-[10px] text-[var(--ink-muted)] font-medium">Ширина апикального базиса НЧ (мм)</label>
									<input
										id="bio-apical-lower"
										type="number"
										step="0.1"
										min="20"
										max="70"
										value={apicalBaseLower}
										onChange={(e) => setApicalBaseLower(parseFloat(e.target.value) || 0)}
										className="h-8 px-2 text-xs font-mono font-bold bg-[var(--paper)] border border-[var(--line)] rounded text-[var(--ink)]"
									/>
									<span className="text-[9px] text-[var(--ink-muted)]">Индекс Снагиной (норма 63.8%)</span>
								</div>
								<div className="p-2 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col gap-1">
									<label htmlFor="bio-meas-premolars" className="text-[10px] text-[var(--ink-muted)] font-medium">Ширина зубного ряда в премолярах (мм)</label>
									<input
										id="bio-meas-premolars"
										type="number"
										step="0.1"
										min="20"
										max="60"
										value={measuredPremolars}
										onChange={(e) => setMeasuredPremolars(parseFloat(e.target.value) || 0)}
										className="h-8 px-2 text-xs font-mono font-bold bg-[var(--paper)] border border-[var(--line)] rounded text-[var(--ink)]"
									/>
									<span className="text-[9px] text-[var(--ink-muted)]">Индекс Пона (расч. {pontResult.calculatedPremolarWidthMm} мм)</span>
								</div>
							</div>
						</div>
					</div>

					{/* 4 Карточки результатов с клиническими заключениями */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Индекс Болтона */}
						<div className="ortho-card flex flex-col justify-between gap-2">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1.5">
									<Scale className="w-4 h-4 text-[var(--primary)]" />
									<span className="text-xs font-bold text-[var(--ink)]">Индекс Болтона (Bolton Index)</span>
								</div>
								<span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
									Math.abs(boltonResult.anteriorRatioPercent - 77.2) <= 1.6 ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "bg-[var(--warning-soft)] text-[var(--warning-ink)]"
								}`}>
									{Math.abs(boltonResult.anteriorRatioPercent - 77.2) <= 1.6 ? "Гармонично" : "Диспропорция"}
								</span>
							</div>
							<div className="grid grid-cols-2 gap-2 text-xs">
								<div className="p-2 rounded bg-[var(--paper-strong)] border border-[var(--line)]">
									<span className="text-[10px] text-[var(--ink-muted)]">Переднее (13-23 / 33-43):</span>
									<div className="text-lg font-mono font-extrabold text-[var(--ink)]">{boltonResult.anteriorRatioPercent}%</div>
									<span className="text-[10px] text-[var(--ink-muted)]">Норма: 77.2% ± 1.6%</span>
								</div>
								<div className="p-2 rounded bg-[var(--paper-strong)] border border-[var(--line)]">
									<span className="text-[10px] text-[var(--ink-muted)]">Общее (16-26 / 36-46):</span>
									<div className="text-lg font-mono font-extrabold text-[var(--ink)]">{boltonResult.overallRatioPercent}%</div>
									<span className="text-[10px] text-[var(--ink-muted)]">Норма: 91.3% ± 1.9%</span>
								</div>
							</div>
							<p className="text-[11px] text-[var(--ink-muted)] leading-tight">{boltonResult.anteriorDiscrepancyInterpretation}</p>
							<p className="text-[11px] text-[var(--ink-muted)] leading-tight">{boltonResult.overallDiscrepancyInterpretation}</p>
						</div>

						{/* Индекс Тонна */}
						<div className="ortho-card flex flex-col justify-between gap-2">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1.5">
									<Scale className="w-4 h-4 text-[var(--primary)]" />
									<span className="text-xs font-bold text-[var(--ink)]">Индекс Тонна (Tonn Index)</span>
								</div>
								<span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
									tonnResult.discrepancyType === "normal" ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "bg-[var(--warning-soft)] text-[var(--warning-ink)]"
								}`}>
									{tonnResult.discrepancyType === "normal" ? "Норма" : tonnResult.discrepancyType === "upper_macrodontia" ? "Макродентия ВЧ" : "Макродентия НЧ"}
								</span>
							</div>
							<div className="p-2 rounded bg-[var(--paper-strong)] border border-[var(--line)] flex items-baseline justify-between text-xs">
								<div>
									<span className="text-[10px] text-[var(--ink-muted)]">Соотношение SI ВЧ / SI НЧ:</span>
									<div className="text-2xl font-mono font-extrabold text-[var(--ink)]">{tonnResult.ratio}</div>
								</div>
								<div className="text-right">
									<span className="text-xs font-semibold text-[var(--ink)]">Норма: {tonnResult.normReference}</span>
									<p className="text-[10px] text-[var(--ink-muted)]">{isDeciduous ? "Сменный прикус" : "Постоянный прикус"}</p>
								</div>
							</div>
							<p className="text-[11px] text-[var(--ink-muted)] leading-tight">{tonnResult.interpretation}</p>
						</div>

						{/* Индекс Пона */}
						<div className="ortho-card flex flex-col justify-between gap-2">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1.5">
									<Scale className="w-4 h-4 text-[var(--primary)]" />
									<span className="text-xs font-bold text-[var(--ink)]">Индекс Пона (Pont Index)</span>
								</div>
								<span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
									pontResult.premolars.status === "normal" && pontResult.molars.status === "normal"
										? "bg-[var(--primary)]/10 text-[var(--primary)]"
										: "bg-[var(--warning-soft)] text-[var(--warning-ink)]"
								}`}>
									{pontResult.premolars.status === "normal" && pontResult.molars.status === "normal" ? "Ширина в норме" : "Отклонение"}
								</span>
							</div>
							<div className="grid grid-cols-2 gap-2 text-xs">
								<div className="p-2 rounded bg-[var(--paper-strong)] border border-[var(--line)]">
									<span className="text-[10px] text-[var(--ink-muted)]">Премоляры (SI × 100 / 80):</span>
									<div className="text-base font-mono font-bold text-[var(--ink)]">
										{pontResult.measuredPremolarWidthMm} мм <span className="text-xs text-[var(--ink-muted)] font-normal">/ {pontResult.calculatedPremolarWidthMm} мм</span>
									</div>
									<span className="text-[10px] text-[var(--ink-muted)]">
										{pontResult.premolarDiscrepancyMm > 0 ? `Расширение +${pontResult.premolarDiscrepancyMm} мм` : pontResult.premolarDiscrepancyMm < 0 ? `Сужение ${pontResult.premolarDiscrepancyMm} мм` : "Норма"}
									</span>
								</div>
								<div className="p-2 rounded bg-[var(--paper-strong)] border border-[var(--line)]">
									<span className="text-[10px] text-[var(--ink-muted)]">Моляры (SI × 100 / 64):</span>
									<div className="text-base font-mono font-bold text-[var(--ink)]">
										{pontResult.measuredMolarWidthMm} мм <span className="text-xs text-[var(--ink-muted)] font-normal">/ {pontResult.calculatedMolarWidthMm} мм</span>
									</div>
									<span className="text-[10px] text-[var(--ink-muted)]">
										{pontResult.molarDiscrepancyMm > 0 ? `Расширение +${pontResult.molarDiscrepancyMm} мм` : pontResult.molarDiscrepancyMm < 0 ? `Сужение ${pontResult.molarDiscrepancyMm} мм` : "Норма"}
									</span>
								</div>
							</div>
							<p className="text-[11px] text-[var(--ink-muted)] leading-tight">{pontResult.interpretation}</p>
						</div>

						{/* Индекс Снагиной */}
						<div className="ortho-card flex flex-col justify-between gap-2">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1.5">
									<Scale className="w-4 h-4 text-[var(--primary)]" />
									<span className="text-xs font-bold text-[var(--ink)]">Индекс Снагиной (Snagina Index)</span>
								</div>
								<span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
									snaginaUpperResult.discrepancyType === "normal" && snaginaLowerResult.discrepancyType === "normal"
										? "bg-[var(--primary)]/10 text-[var(--primary)]"
										: "bg-[var(--warning-soft)] text-[var(--warning-ink)]"
								}`}>
									{snaginaUpperResult.discrepancyType === "normal" && snaginaLowerResult.discrepancyType === "normal" ? "Базис гармоничен" : "Диспропорция базиса"}
								</span>
							</div>
							<div className="grid grid-cols-2 gap-2 text-xs">
								<div className="p-2 rounded bg-[var(--paper-strong)] border border-[var(--line)]">
									<span className="text-[10px] text-[var(--ink-muted)]">Верхняя челюсть (ВЧ):</span>
									<div className="text-lg font-mono font-bold text-[var(--ink)]">{snaginaUpperResult.ratioPercent}%</div>
									<span className="text-[10px] text-[var(--ink-muted)]">Норма: 61.4% · {snaginaUpperResult.discrepancyType === "normal" ? "Норма" : snaginaUpperResult.discrepancyType === "narrowed_base" ? "Сужение" : "Расширение"}</span>
								</div>
								<div className="p-2 rounded bg-[var(--paper-strong)] border border-[var(--line)]">
									<span className="text-[10px] text-[var(--ink-muted)]">Нижняя челюсть (НЧ):</span>
									<div className="text-lg font-mono font-bold text-[var(--ink)]">{snaginaLowerResult.ratioPercent}%</div>
									<span className="text-[10px] text-[var(--ink-muted)]">Норма: 63.8% · {snaginaLowerResult.discrepancyType === "normal" ? "Норма" : snaginaLowerResult.discrepancyType === "narrowed_base" ? "Сужение" : "Расширение"}</span>
								</div>
							</div>
							<p className="text-[11px] text-[var(--ink-muted)] leading-tight">{snaginaUpperResult.interpretation}</p>
							<p className="text-[11px] text-[var(--ink-muted)] leading-tight">{snaginaLowerResult.interpretation}</p>
						</div>
					</div>
				</div>
			)}

			{activeTab === "diary" && (
				<div className="flex flex-col gap-4">
					<OrthodonticTimeline
						currentMonth={protocol.currentMonth}
						totalMonths={protocol.totalMonths}
						applianceCategory={protocol.applianceCategory}
						startDate={protocol.savedAt}
						onSelectMonth={(m) => setProtocol((p) => ({ ...p, currentMonth: m }))}
					/>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<div className="ortho-card">
							<div className="flex items-center justify-between">
								<span className="text-sm font-semibold text-[var(--ink)]">Дневник приёма (SOAP)</span>
								<button type="button" onClick={() => handleCopyText(soapSummary, "Дневник скопирован в буфер")} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--primary)] hover:border-[var(--primary)] flex items-center gap-1 whitespace-nowrap min-h-[36px] transition-colors cursor-pointer">
									<Copy className="w-3.5 h-3.5" /> В медкарту
								</button>
							</div>
							<pre className="p-3 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] text-xs font-mono text-[var(--ink)] whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">{soapSummary}</pre>
						</div>

						<div className="ortho-card">
							<div className="flex items-center justify-between">
								<span className="text-sm font-semibold text-[var(--ink)]">Памятка пациенту</span>
								<button type="button" onClick={() => handleCopyText(memoText, "Памятка скопирована")} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--primary)] hover:border-[var(--primary)] flex items-center gap-1 whitespace-nowrap min-h-[36px] transition-colors cursor-pointer">
									<BookOpen className="w-3.5 h-3.5" /> Копировать памятку
								</button>
							</div>
							<pre className="p-3 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] text-xs font-mono text-[var(--ink)] whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">{memoText}</pre>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
