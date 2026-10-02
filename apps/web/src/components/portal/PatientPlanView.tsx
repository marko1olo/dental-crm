/**
 * DENTE CRM — Patient Treatment Plan View (Mobile-First 375px+ Responsive)
 * (DOMAIN: PATIENT PORTAL & CLINICAL TRANSPARENCY)
 *
 * Designed from the patient's perspective on a smartphone (375x667 – 390x844):
 * - Crystal clear progress bar: "Выполнено X из Y этапов • Оплачено: Z ₽ • Остаток: N ₽"
 * - Anti-hidden-fee guarantee: "Все включено" (анестезия, снимки, изоляция, полировка 0 ₽)
 * - 3-Tier Treatment Plan comparison (Базовый / Стандарт / Премиум)
 * - Interactive 2D Tooth Chart with Dental Health Index
 * - Patient Comfort & Painless Care Standards (Анти-страх, аппликационный гель, седация, стоп-сигнал рукой)
 * - 1-Click Tax Deduction Certificate Download (КНД 1151156) with 13% refund calculation
 * - Comprehensive Clinic Guarantee Obligations (1–2 года на пломбы, 2–5 лет на коронки, пожизненно на импланты)
 * - Emergency SOS & WhatsApp hotline for post-treatment pain with self-triage instructions
 * - 1-Click SBP Stage Payment
 */

import React, { useMemo, useState } from "react";
import type { PatientBeforeAfterCase } from "./patientCabinet/patientCabinetAppointments.js";
import {
	downloadPatientTaxCertificate1151156,
	type PatientPersonalCabinetData,
	type PatientTreatmentPlan,
	type ThreeTierTreatmentPlanModel,
	type TreatmentPlanStage,
} from "./patientCabinet/patientCabinetEngine.js";
import {
	calculateDentalHealthIndex,
	computePatientTeethFromStages,
	DEFAULT_PATIENT_TEETH,
	PatientFriendlyOdontogram,
	type PatientToothInfo,
} from "./PatientFriendlyOdontogram.js";
import {
	CLINIC_GUARANTEE_ITEMS,
	PATIENT_COMFORT_STANDARDS,
	PlanClinicGuarantees,
	PlanComfortStandards,
	PlanPostTreatmentTriageFaq,
	POST_TREATMENT_TRIAGE_FAQ,
} from "./scans/PlanGuaranteesAndTriage.js";
import {
	DEFAULT_THREE_TIER_PLAN_MODEL,
	PatientPlanThreeTierSelector,
	PlanThreeTierSelector,
	type PlanThreeTierSelectorProps,
} from "./scans/PlanThreeTierSelector.js";
import {
	DEFAULT_PATIENT_SCANS,
	type PatientDiagnosticScan,
	PlanScanViewerModal,
	type PlanScanViewerModalProps,
} from "./scans/PlanScanViewerModal.js";
import {
	PatientPlanBeforeAfterGallery,
	PlanBeforeAfterGallery,
	type PlanBeforeAfterGalleryProps,
} from "./scans/PlanBeforeAfterGallery.js";
import {
	PatientPlanDiagnosticScansSection,
	PlanDiagnosticScansSection,
	type PlanDiagnosticScansSectionProps,
} from "./scans/PlanDiagnosticScansSection.js";
import {
	PatientPlanStagesAccordion,
	PlanStagesAccordion,
	type PlanStagesAccordionProps,
} from "./scans/PlanStagesAccordion.js";
import {
	type PatientPlanNextAppointment,
	PlanHeroHeader,
	type PlanHeroHeaderProps,
} from "./scans/PlanHeroHeader.js";

export type {
	PatientPlanNextAppointment,
	PlanHeroHeaderProps,
	PatientBeforeAfterCase,
	PatientDiagnosticScan,
	PlanScanViewerModalProps,
	PlanBeforeAfterGalleryProps,
	PlanStagesAccordionProps,
	PlanThreeTierSelectorProps,
	PlanDiagnosticScansSectionProps,
};

export {
	CLINIC_GUARANTEE_ITEMS,
	POST_TREATMENT_TRIAGE_FAQ,
	PATIENT_COMFORT_STANDARDS,
	DEFAULT_THREE_TIER_PLAN_MODEL,
	DEFAULT_PATIENT_SCANS,
	PlanScanViewerModal,
	PlanBeforeAfterGallery,
	PatientPlanBeforeAfterGallery,
	PlanStagesAccordion,
	PatientPlanStagesAccordion,
	PlanThreeTierSelector,
	PatientPlanThreeTierSelector,
	PlanComfortStandards,
	PlanClinicGuarantees,
	PlanPostTreatmentTriageFaq,
	PlanDiagnosticScansSection,
	PatientPlanDiagnosticScansSection,
	PlanHeroHeader,
};

export interface PatientPlanViewProps {
	readonly plan?: PatientTreatmentPlan | undefined;
	readonly threeTierModel?: ThreeTierTreatmentPlanModel | undefined;
	readonly patientName?: string | undefined;
	readonly cardNumber?: string | undefined;
	readonly phone?: string | undefined;
	readonly birthDate?: string | undefined;
	readonly fullCabinetData?: PatientPersonalCabinetData | undefined;
	readonly scans?: readonly PatientDiagnosticScan[] | undefined;
	readonly teeth?: readonly PatientToothInfo[] | undefined;
	readonly nextAppointment?: PatientPlanNextAppointment | null | undefined;
	readonly onPayStageSbp?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onBookAppointment?: (() => void) | undefined;
	readonly onRescheduleAppointment?: (() => void) | undefined;
	readonly onDownloadTaxCertificate?: (() => void) | undefined;
	readonly onViewPriceDetails?: (() => void) | undefined;
	readonly emergencyPhone?: string | undefined;
	readonly emergencyWhatsappNumber?: string | undefined;
	readonly beforeAfterCases?: readonly PatientBeforeAfterCase[] | undefined;
}

export const PatientPlanView: React.FC<PatientPlanViewProps> = ({
	plan,
	threeTierModel,
	patientName = "Воронов Алексей Владимирович",
	cardNumber = "043-8842",
	phone = "+7 (999) 123-45-67",
	birthDate = "1984-05-14",
	fullCabinetData,
	scans,
	teeth: teethProp,
	nextAppointment: nextAppointmentProp,
	onPayStageSbp,
	onBookAppointment,
	onRescheduleAppointment,
	onDownloadTaxCertificate,
	onViewPriceDetails,
	emergencyPhone = "",
	emergencyWhatsappNumber = "",
	beforeAfterCases,
}) => {
	// Diagnostic scans to render (defaults to real clinical samples)
	const activeScans = scans ?? DEFAULT_PATIENT_SCANS;
	// Diagnostic Scans State (Fast pure 2D viewer with zero lag)
	const [selectedDiagnosticScan, setSelectedDiagnosticScan] = useState<PatientDiagnosticScan | null>(null);

	// Effective 3-tier model: user prop, or synthesized from plan, or clinical default
	const effectiveThreeTierModel: ThreeTierTreatmentPlanModel = useMemo(() => {
		if (threeTierModel && threeTierModel.tiers.length > 0) {
			return threeTierModel;
		}
		if (plan && plan.stages.length > 0) {
			const stdCost = plan.totalCostRub || plan.stages.reduce((sum, s) => sum + s.costRub, 0);
			const baseCost = Math.round(stdCost * 0.75);
			const premCost = Math.round(stdCost * 1.55);
			return {
				selectedTier: "standard",
				tiers: [
					{
						tierId: "basic",
						tierNameRu: "Базовый",
						subtitleRu: "Стандартная терапия и композит Filtek Z250",
						totalCostRub: baseCost,
						warrantyMonths: 12,
						durationWeeks: 3,
						benefits: [
							"Светоотверждаемый наногибридный композит Filtek Z250 (3M ESPE)",
							"Официальная гарантия клиники 1 год (12 месяцев)",
							"Стандартная анестезия Septanest без боли",
							"Эффективная санация и устранение кариозных очагов",
						],
						stages: plan.stages.map((st) => ({
							...st,
							costRub: Math.round(st.costRub * 0.75),
						})),
					},
					{
						tierId: "standard",
						tierNameRu: "Оптимум (Выбор врача)",
						subtitleRu: "Премиальная эстетика, микроскоп 30x и диоксид циркония",
						totalCostRub: stdCost,
						warrantyMonths: 36,
						durationWeeks: 4,
						benefits: [
							"Субмикрофильный японский нанокомпозит Estelite Asteria (эффект хамелеона)",
							"Монолитный диоксид циркония Katana HTML (Япония)",
							"Лечение каналов под дентальным микроскопом 30x",
							"Расширенная гарантия клиники 3 года (36 месяцев)",
							"Изоляция коффердамом и бестеневая оптика",
						],
						stages: plan.stages,
					},
					{
						tierId: "premium",
						tierNameRu: "Премиум",
						subtitleRu: "Керамика IPS e.max CAD, имплантация Straumann",
						totalCostRub: premCost,
						warrantyMonths: 60,
						durationWeeks: 5,
						benefits: [
							"Ультратонкие цельнокерамические виниры и коронки IPS e.max CAD",
							"Премиальные швейцарские имплантаты Straumann BLX SLActive",
							"Максимальная официальная гарантия 5 лет + пожизненно на титан",
							"Цифровое моделирование улыбки DSD и персональный менеджер заботы 24/7",
						],
						stages: plan.stages.map((st) => ({
							...st,
							costRub: Math.round(st.costRub * 1.55),
						})),
					},
				],
			};
		}
		return DEFAULT_THREE_TIER_PLAN_MODEL;
	}, [threeTierModel, plan]);

	// Selected Tier Tab (Basic / Standard / Premium)
	const [selectedTierId, setSelectedTierId] = useState<"basic" | "standard" | "premium">(
		threeTierModel?.selectedTier || effectiveThreeTierModel.selectedTier || "standard",
	);

	// Active treatment stages derived from 3-Tier model or direct plan
	const activeStages: readonly TreatmentPlanStage[] = useMemo(() => {
		const tier = effectiveThreeTierModel.tiers.find((t) => t.tierId === selectedTierId);
		if (tier?.stages && tier.stages.length > 0) {
			return tier.stages;
		}
		if (plan?.stages && plan.stages.length > 0) {
			return plan.stages;
		}
		return [];
	}, [effectiveThreeTierModel, selectedTierId, plan]);

	// Total and Paid calculations
	const stagesCount = activeStages.length;
	const completedStagesCount = activeStages.filter((s) => s.status === "completed").length;

	const totalCostRub = useMemo(() => {
		const tier = effectiveThreeTierModel.tiers.find((t) => t.tierId === selectedTierId);
		if (tier) return tier.totalCostRub;
		if (plan?.totalCostRub) return plan.totalCostRub;
		return activeStages.reduce((sum, s) => sum + s.costRub, 0);
	}, [effectiveThreeTierModel, selectedTierId, plan, activeStages]);

	const paidCostRub = useMemo(() => {
		if (plan?.paidCostRub !== undefined) return plan.paidCostRub;
		return activeStages
			.filter((s) => s.status === "completed")
			.reduce((sum, s) => sum + s.costRub, 0);
	}, [plan, activeStages]);

	const remainingCostRub = Math.max(0, totalCostRub - paidCostRub);
	const progressPercent = stagesCount > 0 ? Math.round((completedStagesCount / stagesCount) * 100) : 0;

	// Dynamic teeth calculation from current patient plan (Mandate 8c, 8e, 8i)
	const dynamicPatientTeeth: readonly PatientToothInfo[] = useMemo(() => {
		if (teethProp && teethProp.length > 0) {
			return teethProp;
		}
		return computePatientTeethFromStages(activeStages, fullCabinetData?.warranties);
	}, [teethProp, activeStages, fullCabinetData?.warranties]);

	// Dental health index
	const healthIndex = useMemo(() => calculateDentalHealthIndex(dynamicPatientTeeth), [dynamicPatientTeeth]);

	// Dynamic next appointment resolution (Mandates 8e, 8i)
	const resolvedNextAppointment = useMemo(() => {
		if (nextAppointmentProp !== undefined) {
			return nextAppointmentProp;
		}
		if (fullCabinetData?.appointments && fullCabinetData.appointments.length > 0) {
			const upcoming = fullCabinetData.appointments.find(
				(a) => a.status === "scheduled" || a.status === "confirmed",
			);
			if (upcoming) {
				return {
					id: upcoming.id,
					dateRu: (upcoming as any).appointmentDateRu || upcoming.dateIso || (upcoming as any).date || "",
					dateIso: upcoming.dateIso,
					timeRu: upcoming.timeRu,
					doctorName: upcoming.doctorName,
					roomNumber: upcoming.roomNumber,
				};
			}
		}
		return null;
	}, [nextAppointmentProp, fullCabinetData?.appointments]);

	// Estimated tax refund 13%
	const estimatedTaxRefundRub = useMemo(() => {
		return Math.round(paidCostRub * 0.13);
	}, [paidCostRub]);

	// WhatsApp pre-filled emergency URL (честная привязка к пациенту и карте 043/у)
	const whatsappUrl = useMemo(() => {
		const cleanNumber = emergencyWhatsappNumber.replace(/\D/g, "");
		const effectivePatientName = fullCabinetData?.fullName || patientName;
		const effectiveCardNumber =
			fullCabinetData?.cardNumber ||
			cardNumber ||
			(fullCabinetData?.patientId ? `043-${fullCabinetData.patientId.slice(0, 6).toUpperCase()}` : "043/у");
		const text = encodeURIComponent(
			`Здравствуйте! Я пациент клиники DENTE (${effectivePatientName}, карта № ${effectiveCardNumber}). После недавнего лечения у меня возникли болезненные ощущения / вопросы. Проконсультируйте, пожалуйста, дежурного врача.`,
		);
		return `https://wa.me/${cleanNumber}?text=${text}`;
	}, [
		emergencyWhatsappNumber,
		patientName,
		cardNumber,
		fullCabinetData?.fullName,
		fullCabinetData?.cardNumber,
		fullCabinetData?.patientId,
	]);

	const handleTaxDownload = () => {
		if (onDownloadTaxCertificate) {
			onDownloadTaxCertificate();
			return;
		}
		if (fullCabinetData) {
			downloadPatientTaxCertificate1151156(fullCabinetData, 2026);
		} else {
			const fallbackData: PatientPersonalCabinetData = {
				patientId: "pat-fallback",
				fullName: patientName,
				phone,
				birthDate,
				cardNumber,
				curatingDoctor: "Д-р Смирнов А. В.",
				loyaltyBonusBalance: 10000,
				loyaltyTierRu: "Золотой (10%)",
				cashbackEarnedRub: 15000,
				invoices: [
					{
						id: "inv-paid-sample",
						invoiceNumber: "СЧ-2026/074",
						issueDateIso: "2026-08-10",
						dueDateIso: "2026-08-10",
						titleRu: "Оплата этапов плана лечения",
						totalAmountRub: paidCostRub,
						paidAmountRub: paidCostRub,
						remainingAmountRub: 0,
						status: "paid",
						paidAtIso: "2026-08-10T12:00:00Z",
						fiscalReceiptNumber: "ФД-982410",
						items: [
							{
								code: "A16.07.002",
								titleRu: "Стоматологическое лечение и реставрация зубов",
								quantity: 1,
								priceRub: paidCostRub,
								totalRub: paidCostRub,
							},
						],
					},
				],
				appointments: [],
				treatmentPlans: plan ? [plan] : [],
				warranties: [],
				consents: [],
			};
			downloadPatientTaxCertificate1151156(fallbackData, 2026);
		}
	};

	return (
		<div
			className="patient-plan-view-container"
			data-testid="patient-plan-view"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "18px",
				width: "100%",
				maxWidth: "100%",
				boxSizing: "border-box",
			}}
		>
			{/* 1 & 2. HERO PROGRESS, EMERGENCY HOTLINE, TAX DEDUCTION & NEXT VISIT */}
			<PlanHeroHeader
				plan={plan}
				totalCostRub={totalCostRub}
				paidCostRub={paidCostRub}
				remainingCostRub={remainingCostRub}
				stagesCount={stagesCount}
				completedStagesCount={completedStagesCount}
				progressPercent={progressPercent}
				estimatedTaxRefundRub={estimatedTaxRefundRub}
				onDownloadTax={handleTaxDownload}
				nextAppointment={resolvedNextAppointment}
				onBookAppointment={onBookAppointment}
				onRescheduleAppointment={onRescheduleAppointment}
				onViewPriceDetails={onViewPriceDetails}
				emergencyPhone={emergencyPhone}
				whatsappUrl={whatsappUrl}
			/>

			{/* 3. 3-TIER COMPARISON TABS (THREE-TIER TREATMENT PLAN SELECTOR) */}
			{effectiveThreeTierModel && effectiveThreeTierModel.tiers.length > 0 && (
				<PlanThreeTierSelector
					threeTierModel={effectiveThreeTierModel}
					selectedTierId={selectedTierId}
					onSelectTier={setSelectedTierId}
				/>
			)}

			{/* 4. INTERACTIVE DENTAL ODONTOGRAM WITH SANITATION HEALTH INDEX */}
			<div
				className="pc-card odontogram-container-card"
				data-testid="interactive-odontogram-card"
				style={{
					backgroundColor: "var(--pc-surface, #1e293b)",
					borderRadius: "12px",
					border: "1px solid var(--pc-border, #334155)",
					padding: "16px",
					display: "flex",
					flexDirection: "column",
					gap: "12px",
				}}
			>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
					<div>
						<h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
							Интерактивная зубная формула и индекс санации
						</h4>
						<p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)" }}>
							Нажмите на любой зуб для расшифровки диагноза, проведенного лечения и гарантийного сертификата:
						</p>
					</div>
				</div>

				<PatientFriendlyOdontogram teeth={dynamicPatientTeeth} showHealthIndexHeader={true} />
			</div>

			{/* 4.1. PATIENT COMFORT & PAINLESS CARE STANDARDS (ANTI-ANXIETY) */}
			<PlanComfortStandards />

			{/* 4.2. LIGHTWEIGHT 2D DIAGNOSTIC SCANS & X-RAY GALLERY */}
			<PlanDiagnosticScansSection
				scans={activeScans}
				onSelectScan={(scan) => setSelectedDiagnosticScan(scan)}
			/>

			{/* 4.3. CLINICAL PHOTO PROTOCOL BEFORE & AFTER GALLERY (VITA SHADES) */}
			<PlanBeforeAfterGallery cases={beforeAfterCases} />

			{/* 5. STAGES LIST WITH TRANSPARENT CARDS */}
			<PlanStagesAccordion
				stages={activeStages}
				onPayStageSbp={onPayStageSbp}
			/>

			{/* 6. CLINICAL WARRANTY OBLIGATIONS SECTION */}
			<PlanClinicGuarantees />

			{/* 7. SELF-TRIAGE POST-TREATMENT PAIN FAQ */}
			<PlanPostTreatmentTriageFaq />

			{/* 2D LIGHTWEIGHT DIAGNOSTIC SCAN VIEWER MODAL (ZERO-HANG, ZERO-3D FREEZE) */}
			{selectedDiagnosticScan && (
				<PlanScanViewerModal
					scan={selectedDiagnosticScan}
					scans={activeScans}
					onClose={() => setSelectedDiagnosticScan(null)}
					onSelectScan={(scan) => setSelectedDiagnosticScan(scan)}
				/>
			)}
		</div>
	);
};

export default PatientPlanView;
