/**
 * TreatmentPlanStudioModal.tsx — Интерактивная студия планов лечения и кресельный презентер (SSOT).
 * Мандаты 8b, 8zi: Целевой размер 350–450 строк (Sweet Spot). Консолидированный монолит без микро-шредера.
 * Мандат 8e: Автономия врача — свобода скидок до 100%, автосейв, кнопки НИКОГДА не блокируются (disabled=false).
 * Мандат 8am: Ровно 1 Primary CTA кнопка var(--teal) (#0d9488) на видимый экран, вторичные кнопки в нейтрале.
 * Мандат 8n: Простота для соло-врача и клиники у кресла — выбор из 3 вариантов в 1 клик, генератор по МКБ-10.
 * Мандат 8x & 8ap: Человеческий клинический язык без советского канцелярита в прод-UI.
 * Apple HIG: Сенсорная зона >= 44x44px, Drag Handle 36x5px, нативный Segmented Switcher на смартфонах (390x844).
 */

import React, { useState, useMemo, useCallback } from "react";
import {
	Stethoscope, Percent, Printer, X, CheckCircle2,
	FileText, BarChart3, Package, UserCheck,
} from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId, TreatmentPlanStage, TreatmentPlanItem } from "./treatmentPlanTypes";
import { formatRubles } from "./treatmentPlanTypes";
import {
	CANONICAL_CLINICAL_STAGES, buildCanonical3TierPlans,
	applyDoctorDiscountToTiers, generateTreatmentPlanFromDiagnosis,
} from "./treatmentPlanCatalogData";
import { type ClinicalBundleDefinition } from "./treatmentPlanBundlesEngine";
import { StudioTiersAndStagesTab } from "./studioTabs/StudioTiersAndStagesTab";
import { StudioClinicalBundlesTab } from "./studioTabs/StudioClinicalBundlesTab";
import { StudioCuratorAssignmentTab } from "./studioTabs/StudioCuratorAssignmentTab";

if (typeof window !== "undefined") {
	void import("./styles/treatmentPlanStudio.css");
}

export interface TreatmentPlanStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string;
	readonly patientId?: string;
	readonly doctorFullName?: string;
	readonly initialSelectedTierId?: TreatmentPlanTierId;
	readonly onApprovePlan?: (selectedTier: TreatmentPlanTier) => void;
	readonly className?: string;
}

const DISCOUNT_PRESETS = [0, 5, 10, 15, 20, 50, 100] as const;
type StudioTab = "tiers" | "bundles" | "curator";

export const TreatmentPlanStudioModal: React.FC<TreatmentPlanStudioModalProps> = ({
	isOpen,
	onClose,
	patientName = "Смирнова Екатерина Васильевна",
	patientId = "pat-walkin",
	doctorFullName = "Д-р Орлов А.В. (Главный врач)",
	initialSelectedTierId = "optimum",
	onApprovePlan,
	className = "",
}) => {
	const [activeTab, setActiveTab] = useState<StudioTab>("tiers");
	const [selectedTierId, setSelectedTierId] = useState<TreatmentPlanTierId>(initialSelectedTierId);
	const [stages, setStages] = useState<readonly TreatmentPlanStage[]>(CANONICAL_CLINICAL_STAGES);
	const [doctorDiscountPercent, setDoctorDiscountPercent] = useState<number>(0);
	const [isDiscountBarOpen, setIsDiscountBarOpen] = useState<boolean>(false);
	const [expandedStageId, setExpandedStageId] = useState<string | null>("stage-1-hygiene");
	const [approvedSuccessMessage, setApprovedSuccessMessage] = useState<string | null>(null);
	const [exportSuccessNotice, setExportSuccessNotice] = useState<string | null>(null);
	const [isComparisonMode, setIsComparisonMode] = useState<boolean>(false);

	// 1. Расчет 3 канонических тарифов с учетом текущих этапов и скидки врача
	const computedTiers = useMemo(() => {
		const baseTiers = buildCanonical3TierPlans(stages);
		return applyDoctorDiscountToTiers(baseTiers, doctorDiscountPercent);
	}, [stages, doctorDiscountPercent]);

	// 2. Активный выбранный вариант
	const activeTier = useMemo(() => {
		return computedTiers.find((t) => t.tierId === selectedTierId) || computedTiers.find((t) => t.tierId === "optimum") || computedTiers[0]!;
	}, [computedTiers, selectedTierId]);

	const sanitizedActiveTitle = activeTier.title.replace("★ ", "");

	// 3. Быстрый выбор типового плана по коду диагноза МКБ-10 (Мандат 8n)
	const handleSelectDiagnosisPreset = useCallback((diagCode: string) => {
		const newStages = generateTreatmentPlanFromDiagnosis(diagCode);
		setStages(newStages);
		if (newStages.length > 0 && newStages[0]?.id) setExpandedStageId(newStages[0].id);
	}, []);

	// 4. Добавление клинического пакета в этапы плана в 1 клик
	const handleAddBundleToStages = useCallback((bundle: ClinicalBundleDefinition, toothNumber?: number) => {
		setStages((prevStages) => {
			const newItems: TreatmentPlanItem[] = bundle.items.map((it, idx) => ({
				id: `bundle-item-${Date.now()}-${idx}`,
				name: it.name,
				code804n: it.code804n || "",
				priceRub: it.priceRub,
				unitPriceRub: it.priceRub,
				discountRub: 0,
				quantity: 1,
				stageKind: "stage_custom",
				toothNumber: toothNumber || it.toothNumber,
				isCompleted: false,
			}));

			const stageTitle = `${bundle.title}${toothNumber ? ` (зуб ${toothNumber})` : ""}`;
			const newStage: TreatmentPlanStage = {
				id: `stage-bundle-${Date.now()}`,
				stageNumber: prevStages.length + 1,
				stageKind: "stage_custom",
				title: stageTitle,
				subtitle: bundle.description,
				clinicalGoal: bundle.description,
				items: newItems,
				totalRub: newItems.reduce((acc, it) => acc + it.priceRub, 0),
				totalKopecks: newItems.reduce((acc, it) => acc + it.priceRub, 0) * 100,
				estimatedVisits: bundle.estimatedVisits,
				estimatedWeeks: 1,
				status: "draft",
			};

			return [...prevStages, newStage];
		});
		setActiveTab("tiers");
		setApprovedSuccessMessage(`Пакет «${bundle.title}» добавлен в план лечения!`);
		setTimeout(() => setApprovedSuccessMessage(null), 3000);
	}, []);

	// 5. Утверждение плана врачом / пациентом (Мандат 8e: 0 disabled блокировок)
	const handleApprove = useCallback(async () => {
		if (onApprovePlan && activeTier) onApprovePlan(activeTier);
		setApprovedSuccessMessage(`План «${activeTier?.title}» успешно утвержден и прикреплен к карте пациента!`);

		// Сквозная интеграция с Fastify API POST /api/v1/treatment-plans и PATCH /api/v1/treatment-plans/:id/status
		if (typeof window !== "undefined" && window.fetch) {
			try {
				const res = await fetch("/api/v1/treatment-plans", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						patientId: patientId || "pat-walkin",
						name: `Комплексный план: ${activeTier.title}`,
						title: `Комплексный план: ${activeTier.title}`,
						selectedTier: activeTier.tierId,
						totalPriceRub: activeTier.totalRub,
						planDiscountPercent: doctorDiscountPercent,
						stages: activeTier.stages.map((stg) => ({
							stageNumber: stg.stageNumber,
							title: stg.title,
							stageKind: stg.stageKind || "stage_custom",
							totalRub: stg.totalRub,
							items: stg.items.map((it) => ({
								name: it.name, price: it.priceRub, quantity: it.quantity || 1, discount: it.discountRub || 0, toothNumber: it.toothNumber,
							})),
						})),
					}),
				});

				let approvedPlanId = "plan-active";
				if (res.ok) {
					const data = await res.json().catch(() => null);
					if (data?.treatmentPlan?.id) {
						approvedPlanId = data.treatmentPlan.id;
						// Обновление статуса через канонический PATCH /api/v1/treatment-plans/:id/status
						await fetch(`/api/v1/treatment-plans/${approvedPlanId}/status`, {
							method: "PATCH",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ status: "Approved", selectedTier: activeTier.tierId }),
						}).catch(() => {
							// Fallback на POST /api/treatment-plans/:id/approve
							return fetch(`/api/treatment-plans/${approvedPlanId}/approve`, { method: "POST" });
						});
					}
				}

				// Диспатч канонического системного события dente:plan-status-changed
				window.dispatchEvent(
					new CustomEvent("dente:plan-status-changed", {
						detail: {
							planId: approvedPlanId,
							status: "Approved",
							selectedTier: activeTier.tierId,
							totalRub: activeTier.totalRub,
							patientId: patientId,
						},
					})
				);
			} catch {
				// Оффлайн фолбек при отсутствии сети
				window.dispatchEvent(
					new CustomEvent("dente:plan-status-changed", {
						detail: {
							planId: "plan-local",
							status: "Approved",
							selectedTier: activeTier.tierId,
							totalRub: activeTier.totalRub,
							patientId: patientId,
						},
					})
				);
			}
		}

		setTimeout(() => {
			setApprovedSuccessMessage(null);
			onClose();
		}, 1400);
	}, [activeTier, doctorDiscountPercent, onApprovePlan, onClose, patientId]);

	// 6. Вторичные действия: печать и экспорт в PDF без window.alert
	const handlePrint = useCallback(() => {
		if (typeof window !== "undefined") window.print();
	}, []);

	const handleExportPdf = useCallback(() => {
		setExportSuccessNotice(`Смета «${sanitizedActiveTitle}» подготовлена к печати / сохранению в PDF`);
		if (typeof window !== "undefined") {
			setTimeout(() => {
				window.print();
			}, 150);
			setTimeout(() => {
				setExportSuccessNotice(null);
			}, 4000);
		}
	}, [sanitizedActiveTitle]);

	if (!isOpen) return null;

	return (
		<div
			className={`tp-studio-overlay fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center bg-black/65 backdrop-blur-xs p-0 sm:p-4 overflow-x-clip max-w-[100vw] h-full ${className}`}
			data-testid="treatment-plan-studio-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="treatment-studio-title"
		>
			<div className="tp-studio-dialog flex flex-col w-full max-w-5xl bg-[var(--paper)] text-[var(--ink)] border-t sm:border border-[var(--line)] rounded-t-[24px] sm:rounded-2xl shadow-2xl overflow-hidden h-[94dvh] sm:h-auto sm:max-h-[92vh] mt-auto sm:my-auto">
				{/* 0. Тактильный Drag Handle для смартфонов по Apple HIG */}
				<div className="tp-studio-drag-handle-wrap sm:hidden flex justify-center pt-2.5 pb-1">
					<div className="tp-studio-drag-handle w-9 h-1 rounded-full bg-[var(--line-strong,#94a3b8)] opacity-60" />
				</div>

				{/* 1. ШАПКА СТУДИИ (Мандат 8am: 1 строка, скидка врача до 100%, сенсорные зоны >= 44x44px) */}
				<header className="tp-studio-header flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0 min-h-[52px]">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-9 h-9 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
							<Stethoscope className="w-5 h-5" />
						</div>
						<div className="flex flex-col min-w-0">
							<h2 id="treatment-studio-title" className="text-sm sm:text-base font-bold text-[var(--ink)] truncate m-0">
								<span className="sm:hidden">План лечения</span>
								<span className="hidden sm:inline">Комплексный план лечения</span>
							</h2>
							<div className="flex items-center gap-1.5 sm:gap-2 text-xs text-[var(--muted)] truncate">
								<span className="font-semibold text-[var(--ink)] truncate">{patientName}</span>
								<span className="hidden sm:inline">·</span>
								<span className="hidden sm:inline truncate">{doctorFullName}</span>
							</div>
						</div>
					</div>

					<div className="flex items-center gap-1.5 shrink-0">
						{/* Скидка врача до 100% */}
						<button
							type="button"
							onClick={() => setIsDiscountBarOpen((prev) => !prev)}
							className={`tp-studio-header-btn inline-flex min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-xl border text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer ${
								doctorDiscountPercent > 0 ? "bg-[var(--teal-soft,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--line-subtle)]"
							}`}
							title="Скидка врача до 100%"
							data-testid="toggle-discount-btn"
						>
							<Percent className="w-4 h-4 shrink-0" />
							<span className="hidden sm:inline">{doctorDiscountPercent > 0 ? `Скидка ${doctorDiscountPercent}%` : "Скидка врача"}</span>
						</button>

						{/* Вторичное действие: Сравнить тарифы (только десктоп) */}
						<button
							type="button"
							onClick={() => setIsComparisonMode((prev) => !prev)}
							className={`tp-studio-header-btn !hidden sm:!inline-flex min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-xl border text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer ${
								isComparisonMode ? "bg-[var(--teal-soft,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--line-subtle)]"
							}`}
							title="Сравнение преимуществ всех 3 тарифов"
							data-testid="compare-tiers-btn"
						>
							<BarChart3 className="w-4 h-4 text-[var(--muted)] shrink-0" /><span>Сравнить тарифы</span>
						</button>

						{/* Вторичное действие: Печать сметы (только десктоп) */}
						<button
							type="button"
							onClick={handlePrint}
							className="tp-studio-header-btn !hidden sm:!inline-flex min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer"
							title="Печать сметы плана"
							data-testid="print-plan-btn"
						>
							<Printer className="w-4 h-4 text-[var(--muted)] shrink-0" /><span>Печать</span>
						</button>

						{/* Закрытие модалки */}
						<button
							type="button"
							onClick={onClose}
							className="tp-studio-header-btn inline-flex min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] items-center justify-center transition-colors cursor-pointer"
							aria-label="Закрыть студию планов лечения"
							data-testid="close-studio-btn"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</header>

				{/* 1.1. ПАНЕЛЬ ВСТРОЕННЫХ ТАБОВ СТУДИИ (Мандат 8aq: консолидация оторванных модалок) */}
				<div className="flex items-center gap-1 p-1 bg-[var(--paper-soft)] border-b border-[var(--line)] px-4 sm:px-6 shrink-0" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "tiers"}
						onClick={() => setActiveTab("tiers")}
						className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
							activeTab === "tiers"
								? "bg-[var(--paper)] text-[var(--teal,#0d9488)] shadow-xs border border-[var(--line)]"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="tab-tiers-stages"
					>
						<BarChart3 className="w-4 h-4 shrink-0" />
						<span>Тарифы и этапы</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "bundles"}
						onClick={() => setActiveTab("bundles")}
						className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
							activeTab === "bundles"
								? "bg-[var(--paper)] text-[var(--teal,#0d9488)] shadow-xs border border-[var(--line)]"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="tab-clinical-bundles"
					>
						<Package className="w-4 h-4 shrink-0" />
						<span>Клинические пакеты</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "curator"}
						onClick={() => setActiveTab("curator")}
						className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
							activeTab === "curator"
								? "bg-[var(--paper)] text-[var(--teal,#0d9488)] shadow-xs border border-[var(--line)]"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="tab-curator-assignment"
					>
						<UserCheck className="w-4 h-4 shrink-0" />
						<span>Куратор плана</span>
					</button>
				</div>

				{/* 1.2. Панель скидки врача: свобода скидки до 100% без паролей */}
				{isDiscountBarOpen && (
					<div className="px-4 sm:px-6 py-2.5 bg-[var(--paper-soft)] border-b border-[var(--line)] flex items-center gap-3 flex-wrap text-xs" data-testid="doctor-discount-bar">
						<span className="font-bold text-[var(--ink)]">Скидка врача:</span>
						<div className="flex items-center gap-1.5 flex-wrap">
							{DISCOUNT_PRESETS.map((pct) => (
								<button
									key={pct}
									type="button"
									onClick={() => setDoctorDiscountPercent(pct)}
									className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
										doctorDiscountPercent === pct ? "bg-[var(--teal,#0d9488)] text-white shadow-xs" : "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--line-subtle)]"
									}`}
								>
									{pct === 100 ? "100% (Гарантия)" : `${pct}%`}
								</button>
							))}
						</div>
						{doctorDiscountPercent > 0 && <span className="text-[var(--teal,#0d9488)] font-semibold ml-auto">Применена скидка {doctorDiscountPercent}% на все варианты</span>}
					</div>
				)}

				{/* 2. ОСНОВНОЕ ТЕЛО СТУДИИ */}
				<main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28 sm:pb-6 space-y-6">
					{/* Индикатор успеха утверждения */}
					{approvedSuccessMessage && (
						<div className="p-3 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.15))] border border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] text-xs font-bold flex items-center gap-2">
							<CheckCircle2 className="w-4 h-4 shrink-0" />
							<span>{approvedSuccessMessage}</span>
						</div>
					)}

					{/* Индикатор экспорта в PDF */}
					{exportSuccessNotice && (
						<div className="p-3 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.15))] border border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] text-xs font-bold flex items-center gap-2">
							<FileText className="w-4 h-4 shrink-0" />
							<span>{exportSuccessNotice}</span>
						</div>
					)}

					{/* Вкладка 1: Тарифы и клинические этапы */}
					{activeTab === "tiers" && (
						<StudioTiersAndStagesTab
							computedTiers={computedTiers}
							activeTier={activeTier}
							selectedTierId={selectedTierId}
							onSelectTierId={setSelectedTierId}
							expandedStageId={expandedStageId}
							onToggleExpandStage={(id) => setExpandedStageId(expandedStageId === id ? null : id)}
							onSelectDiagnosisPreset={handleSelectDiagnosisPreset}
							onResetToCanonical={() => setStages(CANONICAL_CLINICAL_STAGES)}
						/>
					)}

					{/* Вкладка 2: Клинические пакеты (встроенный функционал из оторванной модалки) */}
					{activeTab === "bundles" && (
						<StudioClinicalBundlesTab onAddBundleToStages={handleAddBundleToStages} />
					)}

					{/* Вкладка 3: Куратор плана (встроенный функционал из оторванной модалки) */}
					{activeTab === "curator" && (
						<StudioCuratorAssignmentTab doctorFullName={doctorFullName} />
					)}
				</main>

				{/* 3. ПОДВАЛ СТУДИИ (Мандат 8am: РОВНО ОДНА Primary CTA КНОПКА #0d9488, ВСЕГДА КЛИКАБЕЛЬНАЯ ПО МАНДАТУ 8e) */}
				<footer className="tp-studio-footer sticky bottom-0 z-10 flex items-center justify-between flex-wrap gap-3 px-4 sm:px-6 py-3 pb-[max(14px,env(safe-area-inset-bottom))] bg-[var(--paper)] text-[var(--ink)] border-t border-[var(--line)] shrink-0">
					<div className="flex flex-col min-w-0">
						<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">Выбранный вариант:</span>
						<span className="text-sm sm:text-lg font-black text-[var(--ink)] truncate">«{sanitizedActiveTitle}» — {formatRubles(activeTier.totalRub)}</span>
					</div>

					<div className="flex items-center gap-2.5 w-full sm:w-auto">
						<button
							type="button"
							onClick={handleExportPdf}
							className="!hidden sm:!inline-flex min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line-subtle)] text-[var(--ink)] text-xs font-bold items-center gap-1.5 transition-colors cursor-pointer"
							title="Экспорт сметы в PDF"
						>
							<FileText className="w-4 h-4 text-[var(--muted)] shrink-0" /><span>Экспорт PDF</span>
						</button>

						<button
							type="button"
							onClick={handleApprove}
							className="tp-primary-cta-btn min-h-[52px] sm:min-h-[48px] w-full sm:w-auto px-6 sm:px-8 py-2.5 text-xs sm:text-sm font-black rounded-xl inline-flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer bg-[var(--teal,#0d9488)] hover:bg-[#0f766e] text-white"
							data-testid="approve-treatment-plan-btn"
						>
							<CheckCircle2 className="w-5 h-5 shrink-0" />
							<span className="hidden sm:inline">{`Утвердить выбранный план («${sanitizedActiveTitle}»)`}</span>
							<span className="sm:hidden">{`Утвердить план (${formatRubles(activeTier.totalRub)})`}</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default TreatmentPlanStudioModal;
