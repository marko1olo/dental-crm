/**
 * TreatmentPlanPriceValidatorModal.tsx — Интерактивный Touch-First HUD валидации цен, фиксации смет и протоколов СтАР (DENTE CRM).
 * (DOMAIN: PLAN PRICE VALIDATION, PRICELIST LOCK & STAR CLINICAL PROTOCOLS)
 *
 * Архитектурно декомпозирован согласно Engineering Rule 2:
 * - PriceValidatorHeader: заголовок, бейджи статуса, автономия и срок действия.
 * - PriceValidatorMetricsGrid: сетка карточек финансовых метрик плана.
 * - PriceValidatorPricesTab: сверка цен с прейскурантом, пороги инфляции, согласование цен в 1 клик.
 * - PriceValidatorStarTab: соответствие клиническим протоколам СтАР и Номенклатуре услуг.
 * - PriceValidatorSummaryTab: сводное экспертное заключение по смете.
 * - PriceValidatorFooter: итоговая сводка и действия (печать протокола, оформление наряда ЗТЛ, акт).
 */

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { Award, CheckCircle2 } from "lucide-react";
import {
	type CatalogServiceItem,
	PLAN_PRICE_POLICY_PRESETS,
	type PlanPricePolicyPresetId,
	type PriceLockResolutionPolicy,
	SAMPLE_CURRENT_PRICELIST,
	SAMPLE_TREATMENT_PLAN_FOR_VALIDATION,
	type TreatmentPlanValidationPayload,
} from "./planPriceValidationPresets";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import {
	type AdminOverrideMetadata,
	generateWorkOrderExportPayload,
	validateTreatmentPlanPrices,
	type WorkOrderValidatedExport,
} from "./planPriceValidationEngine";
import { validateTreatmentPlanStarProtocols } from "./starProtocolValidationEngine";
import { LabWorkOrderModal } from "../../lab/orders/LabWorkOrderModal";
import type { TreatmentPlanStage } from "../types";
import { PriceValidatorHeader } from "./PriceValidatorHeader";
import { PriceValidatorMetricsGrid } from "./PriceValidatorMetricsGrid";
import { PriceValidatorPricesTab } from "./PriceValidatorPricesTab";
import {
	PriceValidatorStarTab,
	type StarProtocolSeverityFilter,
} from "./PriceValidatorStarTab";
import { PriceValidatorSummaryTab } from "./PriceValidatorSummaryTab";
import { PriceValidatorFooter } from "./PriceValidatorFooter";
if (typeof document !== "undefined") {
	void import("./planPriceValidation.css");
}

export type PriceValidatorActiveTab = "prices" | "star_protocols" | "summary";

export interface TreatmentPlanPriceValidatorModalProps {
	readonly isOpen?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly planId?: string | undefined;
	readonly planPayload?: TreatmentPlanValidationPayload | undefined;
	readonly stages?: readonly TreatmentPlanStage[] | undefined;
	readonly catalogPricelist?: readonly CatalogServiceItem[] | undefined;
	readonly initialPresetId?: PlanPricePolicyPresetId | undefined;
	readonly onExportWorkOrder?: ((exportData: WorkOrderValidatedExport) => void) | undefined;
	readonly onExportCompletedAct?: ((exportData: WorkOrderValidatedExport) => void) | undefined;
}

const EMPTY_PLAN_PAYLOAD: TreatmentPlanValidationPayload = {
	planId: "",
	planNumber: "",
	planTitle: "План лечения",
	patientId: "",
	patientName: "Пациент",
	doctorId: "",
	doctorFullName: "Врач",
	createdAtIso: new Date().toISOString(),
	items: [],
};

export const TreatmentPlanPriceValidatorModal: React.FC<TreatmentPlanPriceValidatorModalProps> = ({
	isOpen = true,
	onClose,
	planId,
	planPayload: propPlanPayload,
	stages,
	catalogPricelist: propCatalogPricelist,
	initialPresetId = "standard_30",
	onExportWorkOrder,
	onExportCompletedAct,
}) => {
	const isDemo = isDemoShowcaseMode();
	const demoFallbackPlan: TreatmentPlanValidationPayload | undefined =
		isDemo ? SAMPLE_TREATMENT_PLAN_FOR_VALIDATION : undefined;
	const demoFallbackCatalog: readonly CatalogServiceItem[] =
		isDemo ? SAMPLE_CURRENT_PRICELIST : [];

	const [liveCatalog, setLiveCatalog] = useState<CatalogServiceItem[] | null>(null);
	const [livePlan, setLivePlan] = useState<TreatmentPlanValidationPayload | null>(null);

	useEffect(() => {
		if (isDemo) return;
		let isCancelled = false;

		const fetchPricelist = async () => {
			if (propCatalogPricelist && propCatalogPricelist.length > 0) return;
			try {
				const res = await fetch("/api/pricelists");
				if (!res.ok) return;
				const data = (await res.json()) as { success?: boolean; items?: any[] };
				if (!isCancelled && data.items && Array.isArray(data.items)) {
					const mapped: CatalogServiceItem[] = data.items.map((it) => ({
						id: String(it.id ?? ""),
						code804n: String(it.code ?? ""),
						title: String(it.title ?? ""),
						category: String(it.category ?? "other"),
						basePriceRub: Number(it.basePriceRub ?? 0),
						active: Boolean(it.active ?? it.isActive ?? true),
						isArchived: it.active === false || it.isActive === false,
					}));
					setLiveCatalog(mapped);
				}
			} catch (err) {
				console.error("[PriceValidator] Failed to fetch live catalog from PostgreSQL:", err);
			}
		};

		const fetchPlan = async () => {
			if (propPlanPayload || !planId) return;
			try {
				const res = await fetch(`/api/treatment-plans/${encodeURIComponent(planId)}`);
				if (!res.ok) return;
				const data = (await res.json()) as {
					success?: boolean;
					validationPayload?: TreatmentPlanValidationPayload;
				};
				if (!isCancelled && data.validationPayload) {
					setLivePlan(data.validationPayload);
				}
			} catch (err) {
				console.error("[PriceValidator] Failed to fetch live treatment plan from PostgreSQL:", err);
			}
		};

		void fetchPricelist();
		void fetchPlan();

		return () => {
			isCancelled = true;
		};
	}, [isDemo, planId, propCatalogPricelist, propPlanPayload]);

	const planPayload: TreatmentPlanValidationPayload =
		propPlanPayload ??
		livePlan ??
		(demoFallbackPlan ?? EMPTY_PLAN_PAYLOAD);

	const catalogPricelist: readonly CatalogServiceItem[] =
		propCatalogPricelist ??
		liveCatalog ??
		demoFallbackCatalog;
	const [activeTab, setActiveTab] = useState<PriceValidatorActiveTab>("prices");
	const [selectedPresetId, setSelectedPresetId] =
		useState<PlanPricePolicyPresetId>(initialPresetId);
	const [itemResolutions, setItemResolutions] = useState<
		Record<string, PriceLockResolutionPolicy>
	>({});
	const [customPrices] = useState<Record<string, number>>({});
	const [adminOverride, setAdminOverride] = useState<AdminOverrideMetadata>({
		isAuthorized: false,
	});
	const [isLabOrderModalOpen, setIsLabOrderModalOpen] = useState<boolean>(false);
	const [protocolSeverityFilter, setProtocolSeverityFilter] =
		useState<StarProtocolSeverityFilter>("all");

	// Поля ввода для согласования цен (быстрое согласование лечащим врачом в 1 клик)
	const [adminPinInput, setAdminPinInput] = useState<string>("");
	const [adminReasonInput, setAdminReasonInput] = useState<string>(
		"Согласовано сохранение цен в рамках клинической программы лояльности пациента",
	);
	const [showAdminDrawer, setShowAdminDrawer] = useState<boolean>(false);
	const [statusNotice, setStatusNotice] = useState<string | null>(null);

	const activePreset = PLAN_PRICE_POLICY_PRESETS[selectedPresetId];

	// Комплексный отчет валидации цен
	const report = useMemo(() => {
		return validateTreatmentPlanPrices(
			planPayload,
			catalogPricelist,
			activePreset,
			itemResolutions,
			customPrices,
			adminOverride,
		);
	}, [
		planPayload,
		catalogPricelist,
		activePreset,
		itemResolutions,
		customPrices,
		adminOverride,
	]);

	// Комплексный отчет соответствия клиническим протоколам СтАР и 804н
	const starValidation = useMemo(() => {
		if (stages && stages.length > 0) {
			return validateTreatmentPlanStarProtocols(stages);
		}
		const payloadItems = Array.isArray(planPayload?.items) ? planPayload.items : [];
		if (payloadItems.length === 0) {
			return validateTreatmentPlanStarProtocols([]);
		}
		// Если этапы не переданы напрямую, строим синтетическую структуру этапа из planPayload
		const syntheticStage: TreatmentPlanStage = {
			stageNumber: 1,
			stageKind: "stage_1_therapy",
			title: "Комплексный этап лечения",
			subtitle: "Все манипуляции плана",
			clinicalGoal: "Санация и реабилитация",
			items: payloadItems.map((it) => ({
				id: it.itemId,
				...(it.toothNumber !== undefined ? { toothNumber: it.toothNumber } : {}),
				code804n: it.code804n,
				name: it.serviceTitle,
				category: it.category,
				priceRub: Math.max(0, it.planUnitPriceRub - it.planDiscountRub) * it.quantity,
				unitPriceRub: it.planUnitPriceRub,
				discountRub: it.planDiscountRub * it.quantity,
				quantity: it.quantity,
				phase: 1,
				stageKind: "stage_1_therapy",
			})),
			totalRub: payloadItems.reduce(
				(acc, it) => acc + Math.max(0, it.planUnitPriceRub - it.planDiscountRub) * it.quantity,
				0,
			),
			totalKopecks: 0 as any,
			estimatedVisits: 3,
			estimatedWeeks: 4,
			order804nCodes: payloadItems.map((i) => i.code804n),
		};
		return validateTreatmentPlanStarProtocols([syntheticStage]);
	}, [stages, planPayload]);

	const filteredStarChecks = useMemo(() => {
		if (!starValidation?.checks) return [];
		if (protocolSeverityFilter === "warnings_errors") {
			return starValidation.checks.filter(
				(c) => c.status === "warning" || c.status === "error",
			);
		}
		if (protocolSeverityFilter === "passed") {
			return starValidation.checks.filter((c) => c.status === "pass");
		}
		return starValidation.checks;
	}, [starValidation?.checks, protocolSeverityFilter]);

	const labTeeth = useMemo(() => {
		const payloadItems = Array.isArray(planPayload?.items) ? planPayload.items : [];
		const teeth = payloadItems
			.map((i) => i.toothNumber)
			.filter((t): t is number => typeof t === "number" && t > 0);
		return teeth.length > 0 ? Array.from(new Set(teeth)) : [21];
	}, [planPayload]);

	if (!isOpen) return null;

	// Смена политики для отдельной позиции
	const handleItemResolutionChange = (
		itemId: string,
		resolution: PriceLockResolutionPolicy,
	) => {
		setItemResolutions((prev) => ({
			...prev,
			[itemId]: resolution,
		}));
		setStatusNotice(null);
	};

	// Пакетная фиксация всех цен плана (Гарантия)
	const handleBatchLockOriginal = () => {
		const newResolutions: Record<string, PriceLockResolutionPolicy> = {};
		for (const item of planPayload.items) {
			newResolutions[item.itemId] = "LOCK_ORIGINAL_PRICE";
		}
		setItemResolutions(newResolutions);
		setStatusNotice("Применена фиксация оригинальных цен плана ко всем позициям.");
	};

	// Пакетное обновление до актуального прайса
	const handleBatchUpdateToCurrent = () => {
		const newResolutions: Record<string, PriceLockResolutionPolicy> = {};
		for (const item of planPayload?.items ?? []) {
			newResolutions[item.itemId] = "UPDATE_TO_CURRENT_PRICE";
		}
		setItemResolutions(newResolutions);
		setStatusNotice("Все позиции пересчитаны по актуальному прайс-листу клиники.");
	};

	// Авторизация согласования цен (согласование врачом в 1 клик без обязательного PIN-кода)
	const handleAuthorizeDoctorAutonomy = () => {
		setAdminOverride({
			isAuthorized: true,
			authorizedByAdminName: "Лечащий врач (автономия)",
			overrideReason:
				adminReasonInput.trim() ||
				"Фиксация цен плана в рамках автономии врача",
			authorizedAtIso: new Date().toISOString(),
		});
		setShowAdminDrawer(false);
		setStatusNotice("Цены плана подтверждены лечащим врачом.");
	};

	// Сброс авторизации
	const handleRevokeAdminOverride = () => {
		setAdminOverride({ isAuthorized: false });
		setAdminPinInput("");
		setStatusNotice("Авторизация согласования сброшена.");
	};

	// Оформление Наряд-заказа
	const handleGenerateWorkOrder = () => {
		const exportData = generateWorkOrderExportPayload(report, "work_order");
		if (onExportWorkOrder) {
			onExportWorkOrder(exportData);
		}
		setIsLabOrderModalOpen(true);
		setStatusNotice(
			`Зуботехнический наряд-заказ ${exportData.orderNumber} на сумму ${exportData.totalPayableRub.toLocaleString("ru-RU")} ₽ успешно сформирован.`,
		);
	};

	// Оформление Акта выполненных работ
	const handleGenerateCompletedAct = () => {
		const exportData = generateWorkOrderExportPayload(
			report,
			"completed_works_act",
		);
		if (onExportCompletedAct) {
			onExportCompletedAct(exportData);
		}
		setStatusNotice(
			`Акт выполненных работ ${exportData.orderNumber} на сумму ${exportData.totalPayableRub.toLocaleString("ru-RU")} ₽ готов к печати и подписанию.`,
		);
	};

	// Печать протокола валидации
	const handlePrintProtocol = () => {
		window.print();
	};

	// Мандат 8d (Анти-Матрёшка глубина 1): при переходе к наряду ЗТЛ показываем его как самостоятельное модальное окно без задваивания бэкдропов
	if (isLabOrderModalOpen) {
		return (
			<LabWorkOrderModal
				isOpen={isLabOrderModalOpen}
				onClose={() => setIsLabOrderModalOpen(false)}
				patientId={planPayload?.patientId || "pat-001"}
				patientName={planPayload?.patientName || "Пациент"}
				patientChartNumber={
					planPayload?.planNumber ||
					`К-${(planPayload?.patientId || "001").slice(0, 5)}`
				}
				doctorId={planPayload?.doctorId || "doc-001"}
				doctorName={planPayload?.doctorFullName || "Д-р Ковалев С. П."}
				initialTeeth={labTeeth}
			/>
		);
	}

	return (
		<div className="price-validator-backdrop" role="dialog" aria-modal="true">
			<div className="price-validator-modal">
				{/* Header */}
				<PriceValidatorHeader
					planPayload={planPayload}
					report={report}
					starValidation={starValidation}
					onClose={onClose}
				/>

				{/* Top Metrics Cards Grid */}
				<PriceValidatorMetricsGrid report={report} />

				{/* Tab Navigation Bar */}
				<div className="flex items-center justify-between px-6 py-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={() => setActiveTab("prices")}
							className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
								activeTab === "prices"
									? "bg-[var(--paper)] text-[var(--teal-dark,var(--teal))] shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							Сверка цен и прайс-листа
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("star_protocols")}
							className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
								activeTab === "star_protocols"
									? "bg-[var(--paper)] text-[var(--teal-dark,var(--teal))] shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							<Award size={14} />
							<span>Стандарты и прейскурант</span>
							<span className="px-1.5 py-0.2 rounded-full bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] text-[10px] font-mono">
								{starValidation.checks.length}
							</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("summary")}
							className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
								activeTab === "summary"
									? "bg-[var(--paper)] text-[var(--teal-dark,var(--teal))] shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							Экспертное заключение
						</button>
					</div>

					<div className="text-xs text-slate-500 font-mono">
						Код в прейскуранте
					</div>
				</div>

				{/* Body Content */}
				<main className="price-validator-body">
					{/* Status Notice Toast */}
					{statusNotice && (
						<div className="price-validator-banner status-ok">
							<CheckCircle2 size={18} />
							<div>{statusNotice}</div>
						</div>
					)}

					{/* TAB 1: PRICELIST VERIFICATION */}
					{activeTab === "prices" && (
						<PriceValidatorPricesTab
							report={report}
							selectedPresetId={selectedPresetId}
							onPresetChange={setSelectedPresetId}
							onBatchLockOriginal={handleBatchLockOriginal}
							onBatchUpdateToCurrent={handleBatchUpdateToCurrent}
							showAdminDrawer={showAdminDrawer}
							onToggleAdminDrawer={() => setShowAdminDrawer(!showAdminDrawer)}
							adminOverride={adminOverride}
							onRevokeAdminOverride={handleRevokeAdminOverride}
							onAuthorizeDoctorAutonomy={handleAuthorizeDoctorAutonomy}
							adminReasonInput={adminReasonInput}
							onAdminReasonChange={setAdminReasonInput}
							adminPinInput={adminPinInput}
							onAdminPinChange={setAdminPinInput}
							onItemResolutionChange={handleItemResolutionChange}
						/>
					)}

					{/* TAB 2: STAR PROTOCOLS & 804N COMPLIANCE */}
					{activeTab === "star_protocols" && (
						<PriceValidatorStarTab
							starValidation={starValidation}
							filteredStarChecks={filteredStarChecks}
							protocolSeverityFilter={protocolSeverityFilter}
							onSeverityFilterChange={setProtocolSeverityFilter}
						/>
					)}

					{/* TAB 3: EXPERT SUMMARY */}
					{activeTab === "summary" && (
						<PriceValidatorSummaryTab
							report={report}
							starValidation={starValidation}
							activePreset={activePreset}
						/>
					)}
				</main>

				{/* Footer Actions */}
				<PriceValidatorFooter
					report={report}
					onPrintProtocol={handlePrintProtocol}
					onGenerateWorkOrder={handleGenerateWorkOrder}
					onGenerateCompletedAct={handleGenerateCompletedAct}
				/>
			</div>
		</div>
	);
};

export default TreatmentPlanPriceValidatorModal;
