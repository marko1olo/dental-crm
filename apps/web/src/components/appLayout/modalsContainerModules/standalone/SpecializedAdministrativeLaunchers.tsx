import type React from "react";
import { Suspense } from "react";
import { AppLoadingState } from "../../../../AppBootState";
import { lazyWithRetry } from "../../../../lib/lazyWithRetry";
import type { StandaloneLaunchersProps } from "../modalsContainerTypes";

const EgiszRemdHubModal = lazyWithRetry(() =>
	import("../../../egisz/EgiszRemdHubModal").then((module) => ({
		default: module.EgiszRemdHubModal,
	})),
);

const SmartSlotRecoveryPopover = lazyWithRetry(() =>
	import("../../../schedule/SmartSlotRecoveryPopover").then((module) => ({
		default: module.SmartSlotRecoveryPopover,
	})),
);

const DmsGuaranteeLetterModal = lazyWithRetry(() =>
	import("../../../insurance/DmsGuaranteeLetterModal").then((module) => ({
		default: module.DmsGuaranteeLetterModal,
	})),
);

const PlanScenarioComparisonModal = lazyWithRetry(() =>
	import("../../../treatment-plans/PlanScenarioComparisonModal").then(
		(module) => ({
			default: module.PlanScenarioComparisonModal,
		}),
	),
);

const LiveTreatmentPlanPresenterLauncher = lazyWithRetry(() =>
	import("./LiveTreatmentPlanPresenterLauncher").then((module) => ({
		default: module.LiveTreatmentPlanPresenterLauncher,
	})),
);

const PaymentModal = lazyWithRetry(() =>
	import("../../../billing/PaymentModal").then((module) => ({
		default: module.PaymentModal,
	})),
);

const TreatmentEstimator = lazyWithRetry(() =>
	import("../../../odontogram/TreatmentEstimator").then((module) => ({
		default: module.TreatmentEstimator,
	})),
);

const TreatmentPlanModule = lazyWithRetry(() =>
	import("../../../treatment-plans/TreatmentPlanModule").then((module) => ({
		default: module.TreatmentPlanModule,
	})),
);

const FamilyCombinedBillingModal = lazyWithRetry(() =>
	import("../../../finance/FamilyCombinedBillingModal").then((module) => ({
		default: module.FamilyCombinedBillingModal,
	})),
);

const CashReceiptPrintModal = lazyWithRetry(() =>
	import("../../../finance/CashReceiptPrintModal").then((module) => ({
		default: module.CashReceiptPrintModal,
	})),
);

export function renderSpecializedAdministrativeLaunchers({
	isEgiszRemdModalOpen,
	setIsEgiszRemdModalOpen,
	isSmartSlotRecoveryDemoOpen,
	setIsSmartSlotRecoveryDemoOpen,
	isDmsDirectModalOpen,
	setIsDmsDirectModalOpen,
	isPlanScenariosDirectModalOpen,
	setIsPlanScenariosDirectModalOpen,
	isCasePresenterDirectModalOpen,
	setIsCasePresenterDirectModalOpen,
	isSbpDirectModalOpen,
	setIsSbpDirectModalOpen,
	isReceiptDirectModalOpen,
	setIsReceiptDirectModalOpen,
}: StandaloneLaunchersProps): React.ReactElement | null {
	// EGISZ REMD & ORDER 947N CDA R2 XML STANDALONE LAUNCHER (?egisz=demo, ?remd=demo, #egisz, #remd)
	if (isEgiszRemdModalOpen) {
		return (
			<Suspense
				fallback={<AppLoadingState message="Загрузка хаба ЕГИСЗ РЭМД..." />}
			>
				<EgiszRemdHubModal
					isOpen={true}
					onClose={() => {
						setIsEgiszRemdModalOpen(false);
						const url = new URL(window.location.href);
						url.searchParams.delete("egisz");
						url.searchParams.delete("remd");
						url.searchParams.delete("semd");
						window.history.replaceState(
							{},
							"",
							url.pathname +
								(url.search ? url.search : "") +
								(url.hash &&
								!url.hash.includes("egisz") &&
								!url.hash.includes("remd")
									? url.hash
									: ""),
						);
					}}
					initialDocType="cda_semd"
					initialTab={
						((typeof window !== "undefined"
							? new URLSearchParams(window.location.search).get("tab")
							: null) as "clinical" | "signature" | "journal" | "xml_preview" | "preflight" | null) ??
						"signature"
					}
				/>
			</Suspense>
		);
	}

	// SMART SLOT RECOVERY STANDALONE LAUNCHER (?smart_slot=demo, ?recovery=demo, #recovery, #smart-slot)
	if (isSmartSlotRecoveryDemoOpen) {
		const demoDate = new Date();
		demoDate.setHours(demoDate.getHours() + 2, 0, 0, 0);
		const demoEndDate = new Date(demoDate);
		demoEndDate.setMinutes(demoEndDate.getMinutes() + 45);

		return (
			<Suspense
				fallback={
					<AppLoadingState message="Загрузка умного подбора слота..." />
				}
			>
				<div className="w-screen h-screen flex items-center justify-center bg-[var(--paper-soft)] p-4">
					<SmartSlotRecoveryPopover
						isOpen={true}
						onClose={() => {
							setIsSmartSlotRecoveryDemoOpen(false);
							const url = new URL(window.location.href);
							url.searchParams.delete("smart_slot");
							url.searchParams.delete("recovery");
							window.history.replaceState(
								{},
								"",
								url.pathname + (url.search ? url.search : ""),
							);
						}}
						slot={{
							appointmentId: "demo-cancelled-slot-1",
							startsAt: demoDate.toISOString(),
							endsAt: demoEndDate.toISOString(),
							doctorId: "doc-1",
							doctorName: "Д-р Смирнов А.П.",
							chairId: "chair-1",
							chairName: "Кресло №1 (Терапия)",
							freedBecause: "Отмена пациентом за 2 часа (ОРВИ)",
							patientName: "Алексеев Владимир Сергеевич",
						}}
						clinicName="Стоматология DENTE"
					/>
				</div>
			</Suspense>
		);
	}

	// DMS GUARANTEE LETTER STANDALONE LAUNCHER (?dms=letter, ?dms=1, #dms-letter, #dms)
	if (isDmsDirectModalOpen) {
		return (
			<Suspense
				fallback={
					<AppLoadingState message="Загрузка гарантийного письма ДМС..." />
				}
			>
				<DmsGuaranteeLetterModal
					isOpen={true}
					onClose={() => {
						if (setIsDmsDirectModalOpen) setIsDmsDirectModalOpen(false);
						const url = new URL(window.location.href);
						url.searchParams.delete("dms");
						window.history.replaceState(
							{},
							"",
							url.pathname +
								(url.search ? url.search : "") +
								(url.hash && !url.hash.includes("dms") ? url.hash : ""),
						);
					}}
					patient={{
						id: "demo_dms_patient",
						fullName: "Соколова Анна Викторовна",
						birthDate: "1990-04-15",
						policyNumber: "СГЗ-2026-998811",
						insuranceCompany: "АО «СОГАЗ»",
					}}
				/>
			</Suspense>
		);
	}

	// TREATMENT PLAN SCENARIOS COMPARATOR STANDALONE LAUNCHER (?scenarios=demo, ?scenarios=1, #scenarios)
	if (isPlanScenariosDirectModalOpen) {
		return (
			<Suspense
				fallback={
					<AppLoadingState message="Загрузка сравнения сценариев планов лечения..." />
				}
			>
				<PlanScenarioComparisonModal
					isOpen={true}
					onClose={() => {
						if (setIsPlanScenariosDirectModalOpen)
							setIsPlanScenariosDirectModalOpen(false);
						const url = new URL(window.location.href);
						url.searchParams.delete("scenarios");
						window.history.replaceState(
							{},
							"",
							url.pathname +
								(url.search ? url.search : "") +
								(url.hash && !url.hash.includes("scenarios") ? url.hash : ""),
						);
					}}
					patientName="Иванова Екатерина Сергеевна"
					doctorName="Д-р Воронов Алексей Владимирович"
					clinicName="DENTE Стоматология"
					isDemoMode={true}
				/>
			</Suspense>
		);
	}

	// TREATMENT PLAN CASE PRESENTER STANDALONE LAUNCHER (?presenter=demo, ?presenter=1, #presenter)
	if (isCasePresenterDirectModalOpen) {
		return (
			<Suspense
				fallback={
					<AppLoadingState message="Загрузка студии презентации плана лечения..." />
				}
			>
				<LiveTreatmentPlanPresenterLauncher
					isOpen={true}
					onClose={() => {
						if (setIsCasePresenterDirectModalOpen)
							setIsCasePresenterDirectModalOpen(false);
						const url = new URL(window.location.href);
						url.searchParams.delete("presenter");
						url.searchParams.delete("patientId");
						url.searchParams.delete("planId");
						window.history.replaceState(
							{},
							"",
							url.pathname +
								(url.search ? url.search : "") +
								(url.hash && !url.hash.includes("presenter") ? url.hash : ""),
						);
					}}
				/>
			</Suspense>
		);
	}

	// TREATMENT ESTIMATOR STANDALONE LAUNCHER (?estimator=1, ?estimator=demo, #estimator)
	const isEstimatorRoute =
		typeof window !== "undefined" &&
		((window.location.search || "").includes("estimator") ||
			(window.location.hash || "").includes("estimator"));
	if (isEstimatorRoute) {
		return (
			<Suspense
				fallback={<AppLoadingState message="Загрузка сметы плана лечения..." />}
			>
				<div className="w-screen h-screen p-3 md:p-6 bg-[var(--paper-soft,#f8fafc)] dark:bg-zinc-900 flex items-center justify-center">
					<div className="w-full max-w-5xl h-[88vh] shadow-2xl rounded-2xl overflow-hidden bg-[var(--paper,#ffffff)] dark:bg-zinc-950 border border-[var(--line,#e2e8f0)] dark:border-zinc-800">
						<TreatmentEstimator
							patientId="pat_mikhailov"
							currentTeeth={[
								{ toothNumber: 16, state: "Caries", clinicalData: {} },
								{ toothNumber: 36, state: "Pulpitis", clinicalData: {} },
								{ toothNumber: 46, state: "Crown", clinicalData: {} },
							]}
						/>
					</div>
				</div>
			</Suspense>
		);
	}

	// TREATMENT PLANS STANDALONE LAUNCHER (?treatment-plans=1, ?treatment_plans=1, #treatment-plans)
	const isTreatmentPlansRoute =
		typeof window !== "undefined" &&
		((window.location.search || "").includes("treatment-plans") ||
			(window.location.search || "").includes("treatment_plans") ||
			(window.location.hash || "").includes("treatment-plans"));
	if (isTreatmentPlansRoute) {
		return (
			<Suspense
				fallback={<AppLoadingState message="Загрузка планов лечения..." />}
			>
				<div
					className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-6 overflow-y-auto"
					data-testid="treatment-plans-standalone-workspace"
				>
					<TreatmentPlanModule
						patientId="pat-demo-01"
						patientName="Волков Дмитрий Андреевич"
					/>
				</div>
			</Suspense>
		);
	}

	// FAMILY COMBINED BILLING MODAL LAUNCHER (?family_billing=1, #family-billing)
	const isFamilyBillingRoute =
		typeof window !== "undefined" &&
		((window.location.search || "").includes("family_billing") ||
			(window.location.hash || "").includes("family-billing"));
	if (isFamilyBillingRoute) {
		return (
			<Suspense
				fallback={<AppLoadingState message="Загрузка семейного биллинга..." />}
			>
				<FamilyCombinedBillingModal
					isOpen={true}
					familyGroupName="Семья Михайловых"
					availableFamilyWalletRub={18500}
					initialPayer={{
						payerId: "pat_mikhailov",
						payerFullName: "Михайлов Артем Евгеньевич",
						payerInn: "770123456789",
						payerPhone: "+7 (926) 345-67-89",
						payerPassport: "45 12 789456",
					}}
					initialItems={[
						{
							id: "fam-item-1",
							patientId: "pat_mikhailov",
							patientFullName: "Михайлов А. Е.",
							relationship: "self",
							serviceName: "Лечение кариеса 3.6 (световая пломба)",
							code804n: "A16.07.002.001",
							priceRub: 7500,
							quantity: 1,
							taxDeductionCategory: "1",
						},
						{
							id: "fam-item-2",
							patientId: "pat_son",
							patientFullName: "Михайлов Денис Артемович (сын, 8 лет)",
							relationship: "child",
							serviceName: "Профгигиена детская и фторирование",
							code804n: "A16.07.051",
							priceRub: 4200,
							quantity: 1,
							taxDeductionCategory: "1",
						},
					]}
					onClose={() => {
						const url = new URL(window.location.href);
						url.searchParams.delete("family_billing");
						window.history.replaceState(
							{},
							"",
							url.pathname +
								(url.search ? url.search : "") +
								(url.hash && !url.hash.includes("family-billing")
									? url.hash
									: ""),
						);
					}}
				/>
			</Suspense>
		);
	}

	// CASHIER 54-FZ DYNAMIC SBP QR MODAL STANDALONE LAUNCHER (?sbp=1, ?sbp=demo, #sbp)
	if (isSbpDirectModalOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка кассы СБП..." />}>
				<PaymentModal
					isOpen={true}
					amountRub={15400}
					amountKopecks={1540000}
					defaultMethod={(window.location.search || "").includes("split") ? "split" : "sbp_qr"}
					patientId="pat_mikhailov"
					patientName="Михайлов Артем Евгеньевич"
					patientPhone="+7 (926) 345-67-89"
					patientDepositRub={5000}
					patientFamilyBalanceRub={18500}
					cashierName="Воронова А. В."
					doctorName="Д-р Воронов А. В."
					clinicLegalName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
					items={[
						{
							id: "item-1",
							name: "А16.07.002.001 Восстановление зуба пломбой (светоотверждаемый композит Filtek)",
							code804n: "A16.07.002.001",
							quantity: 1,
							priceRub: 7500,
							discountRub: 0,
							amountRub: 7500,
						},
						{
							id: "item-2",
							name: "А16.07.051 Профессиональная гигиена полости рта (AirFlow + ультразвук)",
							code804n: "A16.07.051",
							quantity: 1,
							priceRub: 7900,
							discountRub: 0,
							amountRub: 7900,
						},
					]}
					onClose={() => {
						if (setIsSbpDirectModalOpen) setIsSbpDirectModalOpen(false);
						const url = new URL(window.location.href);
						url.searchParams.delete("sbp");
						window.history.replaceState(
							{},
							"",
							url.pathname +
								(url.search ? url.search : "") +
								(url.hash && !url.hash.includes("sbp") ? url.hash : ""),
						);
					}}
				/>
			</Suspense>
		);
	}

	// 54-FZ FISCAL RECEIPT PRINT MODAL STANDALONE LAUNCHER (?receipt=1, ?receipt=demo, #receipt)
	if (isReceiptDirectModalOpen) {
		const sampleInvoice = {
			id: "inv-2026-089",
			number: "ЧЕК-089-2026",
			patientId: "pat_mikhailov",
			patientName: "Михайлов Артем Евгеньевич",
			patientPhone: "+7 (926) 345-67-89",
			doctorName: "Д-р Воронов А. В.",
			date: "2026-10-12",
			status: "paid" as const,
			totalAmountRub: 15400,
			paidAmountRub: 15400,
			remainingAmountRub: 0,
			paymentMethod: "sbp",
			items: [
				{
					id: "item-1",
					code: "A16.07.002.001",
					code804n: "A16.07.002.001",
					name: "А16.07.002.001 Восстановление зуба пломбой (светоотверждаемый композит Filtek)",
					quantity: 1,
					priceRub: 7500,
					totalRub: 7500,
				},
				{
					id: "item-2",
					code: "A16.07.051",
					code804n: "A16.07.051",
					name: "А16.07.051 Профессиональная гигиена полости рта (AirFlow + ультразвук)",
					quantity: 1,
					priceRub: 7900,
					totalRub: 7900,
				},
			],
			createdAt: new Date().toISOString(),
		};

		return (
			<Suspense fallback={<AppLoadingState message="Загрузка чека 54-ФЗ..." />}>
				<CashReceiptPrintModal
					isOpen={true}
					invoice={sampleInvoice}
					clinicName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
					clinicInn="7707083893"
					clinicAddress="г. Москва, ул. Профсоюзная, д. 42"
					cashierFullName="Воронова А. В."
					attendingDoctorName="Д-р Воронов Алексей Владимирович"
					defaultFormat="80mm"
					onClose={() => {
						if (setIsReceiptDirectModalOpen) setIsReceiptDirectModalOpen(false);
						const url = new URL(window.location.href);
						url.searchParams.delete("receipt");
						window.history.replaceState(
							{},
							"",
							url.pathname +
								(url.search ? url.search : "") +
								(url.hash && !url.hash.includes("receipt") ? url.hash : ""),
						);
					}}
				/>
			</Suspense>
		);
	}

	return null;
}
