/**
 * @dental/web/components/orthodontics/OrthodonticsTabsContent.tsx
 *
 * DENTE Dental CRM — Контент вкладок ортодонтической студии (Мандаты 8b, 8e, 8x).
 * Брекеты, элайнеры, фотопротокол, ТРГ и клинический дневник SOAP.
 */

import React, { useState } from "react";
import { Check, Layers, ArrowRight, Copy, BookOpen, Camera, Activity } from "lucide-react";
import { isSlotMatching } from "@dental/shared";
import {
	ARCHWIRE_ALLOYS_SSOT, ARCHWIRE_SECTIONS_SSOT, ELASTICS_CATALOG,
	CHAIRSIDE_ACTIONS_CATALOG, ANGLE_CLASSES_CATALOG, ORTHO_PHOTO_SLOTS_SSOT,
	TRG_ANGLES_NORMS_SSOT, ORTHO_PATIENT_MEMO_SECTIONS, evaluateTrgAngleStatus,
	type ArchwireAlloy, type ArchwireSection, type OrthoProtocolState,
} from "./orthodonticsCatalogData";
import { AlignerCaseTracker } from "./AlignerCaseTracker";
import { BiteClassificationCard } from "./BiteClassificationCard";
import { CephalometricCanvas, SAMPLE_TRG_CEPHALOGRAM_URL, type PointCoord } from "./CephalometricCanvas";
import { calculateCephalometrics } from "./cephalometricMath";
import { OrthodonticTimeline } from "./OrthodonticTimeline";

export interface OrthodonticsTabsContentProps {
	readonly activeTab: "brackets" | "aligners" | "photo_trg" | "diary";
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
}) => {
	const [showTracingPreview, setShowTracingPreview] = useState<boolean>(false);
	const [sampleCephLandmarks, setSampleCephLandmarks] = useState<Record<string, PointCoord>>({
		S: { x: 480, y: 310 },
		N: { x: 740, y: 290 },
		A: { x: 730, y: 520 },
		B: { x: 710, y: 640 },
		Pog: { x: 720, y: 720 },
		Gn: { x: 710, y: 750 },
		Me: { x: 690, y: 770 },
		Go: { x: 440, y: 650 },
		Ba: { x: 380, y: 460 },
		Pt: { x: 550, y: 420 },
		Or: { x: 670, y: 370 },
		Po: { x: 430, y: 390 },
		U1t: { x: 735, y: 590 },
		U1a: { x: 710, y: 510 },
		L1t: { x: 725, y: 605 },
		L1a: { x: 705, y: 690 },
	});

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
							<CephalometricCanvas
								imageUrl={SAMPLE_TRG_CEPHALOGRAM_URL}
								landmarks={sampleCephLandmarks}
								onLandmarkChange={(id, pt) => {
									const updated = { ...sampleCephLandmarks, [id]: pt };
									setSampleCephLandmarks(updated);
									// DEF-ORTHO-SEV2-03: Реактивный пересчет углов ТРГ и синхронизация с карточками
									const result = calculateCephalometrics(updated, 0.15);
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
								}}
								className="min-h-[420px] rounded-xl border border-[var(--line)]"
							/>
						)}
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
