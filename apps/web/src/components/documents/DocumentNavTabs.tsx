import type React from "react";
import type { DocumentKind } from "@dental/shared";
import {
	FileText,
	UserCheck,
	Stethoscope,
	Receipt,
	FileCheck,
} from "lucide-react";

export type DocumentCategoryTab =
	| "all"
	| "intake"
	| "clinical"
	| "finance_tax"
	| "certificates_sanpin";

export const DOCUMENT_CATEGORY_KINDS: Record<
	Exclude<DocumentCategoryTab, "all">,
	ReadonlySet<DocumentKind>
> = {
	intake: new Set<DocumentKind>([
		"paid_medical_services_contract",
		"informed_consent",
		"personal_data_processing_consent",
		"patient_intake_questionnaire",
		"minor_legal_representative_consent",
		"photo_video_consent",
		"medical_intervention_refusal",
	]),
	clinical: new Set<DocumentKind>([
		"dental_medical_card_043u",
		"orthodontic_medical_card_043_1u",
		"treatment_plan",
		"treatment_plan_acceptance",
		"treatment_cost_estimate",
		"procedure_specific_consent_packet",
		"anesthesia_consent_log",
		"post_visit_recommendations",
		"prescription_medication_order",
		"daily_dentist_diary_037u",
		"summary_dentist_statement_039u",
		"medical_record_extract",
	]),
	finance_tax: new Set<DocumentKind>([
		"payment_invoice",
		"payment_receipt",
		"completed_works_act",
		"installment_payment_schedule",
		"tax_deduction_certificate",
		"tax_deduction_application",
		"legacy_tax_deduction_certificate",
		"tax_deduction_registry",
		"payment_refund_correction_request",
	]),
	certificates_sanpin: new Set<DocumentKind>([
		"visit_attendance_certificate",
		"radiation_dose_sheet",
		"xray_cbct_referral",
		"lab_work_order",
		"warranty_service_memo",
		"medical_record_copy_request",
		"medical_document_release_receipt",
	]),
};

export interface DocumentNavTabsProps {
	readonly activeTab: DocumentCategoryTab;
	readonly onSelectTab: (tab: DocumentCategoryTab) => void;
	readonly counts?: Partial<Record<DocumentCategoryTab, number>> | Record<DocumentCategoryTab, number>;
}

export function DocumentNavTabs({
	activeTab,
	onSelectTab,
	counts = {} as Record<DocumentCategoryTab, number>,
}: DocumentNavTabsProps): React.JSX.Element {
	const tabs: Array<{
		id: DocumentCategoryTab;
		label: string;
		tabletLabel: string;
		mobileLabel: string;
		icon: React.ReactNode;
	}> = [
		{
			id: "all",
			label: "Все документы и реестр",
			tabletLabel: "Все документы",
			mobileLabel: "Все",
			icon: <FileText size={15} aria-hidden="true" className="shrink-0" />,
		},
		{
			id: "intake",
			label: "Первичный приём и ИДС",
			tabletLabel: "Первичный и ИДС",
			mobileLabel: "Первичный",
			icon: <UserCheck size={15} aria-hidden="true" className="shrink-0" />,
		},
		{
			id: "clinical",
			label: "Клинический приём и 043/у",
			tabletLabel: "Клинический / 043/у",
			mobileLabel: "043/у",
			icon: <Stethoscope size={15} aria-hidden="true" className="shrink-0" />,
		},
		{
			id: "finance_tax",
			label: "Оплата и Налоговая",
			tabletLabel: "Оплата и ФНС",
			mobileLabel: "Финансы",
			icon: <Receipt size={15} aria-hidden="true" className="shrink-0" />,
		},
		{
			id: "certificates_sanpin",
			label: "Справки и СанПиН",
			tabletLabel: "Справки и СанПиН",
			mobileLabel: "СанПиН",
			icon: <FileCheck size={15} aria-hidden="true" className="shrink-0" />,
		},
	];

	return (
		<nav
			className="document-nav-tabs overflow-x-auto no-scrollbar scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x flex flex-nowrap w-full min-w-0"
			aria-label="Категории документов"
			role="tablist"
			onWheel={(e) => {
				if (e.deltaY !== 0) {
					e.currentTarget.scrollLeft += e.deltaY;
				}
			}}
		>
			{tabs.map((tab) => {
				const isActive = activeTab === tab.id;
				const count = counts?.[tab.id] ?? 0;
				return (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={isActive}
						className={`document-nav-tab-btn ${isActive ? "active" : ""}`}
						onClick={() => onSelectTab(tab.id)}
					>
						{tab.icon}
						<span className="whitespace-nowrap shrink-0 flex-shrink-0 min-w-max">
							<span className="sm:hidden">{tab.mobileLabel}</span>
							<span className="hidden sm:inline 2xl:hidden">{tab.tabletLabel}</span>
							<span className="hidden 2xl:inline">{tab.label}</span>
						</span>
						<span
							className="document-nav-tab-badge text-[11px] h-4.5 min-w-[18px] px-1 shrink-0 flex-shrink-0"
							aria-label={`Количество: ${count}`}
						>
							{count}
						</span>
					</button>
				);
			})}
		</nav>
	);
}
