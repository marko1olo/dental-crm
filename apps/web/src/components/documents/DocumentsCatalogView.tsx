/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DOCUMENTS CATALOG VIEW (КАТАЛОГ КЛИНИЧЕСКИХ ДОКУМЕНТОВ КЛИНИКИ)
 * 1-Row Compact Toolbar (32–36px) | Apple HIG / DENTE Design System
 * Pure Clinical Russian Language | Zero Cartoon Emojis | Strict Lucide Icons
 * Zero Mocks (Connected to Drizzle/Zustand Store) | Mandates 8d, 8e, 8k, 8n
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useMemo, useState } from "react";
import {
	Award, CheckCircle2, ClipboardList, Clock, Eye, FileCheck, FileText,
	Heart, Printer, Receipt, Scan, Search, ShieldAlert, ShieldCheck,
	Sparkles, UserCheck, X, Zap,
} from "lucide-react";
import { DentalForm043, ToothDeciduous } from "../icons/DentalIcons";
import { useDocumentStore } from "../../store/documentStore";
import { showToast } from "../GlobalToast";
import type { DocumentKind, GeneratedDocument, Patient } from "@dental/shared";
import { formatShortDate } from "../../AppHelpers";
import { PediatricBraveryDiplomaModal } from "../pediatric/PediatricBraveryDiplomaModal";
import { ConsentModal } from "../consents/ConsentModal";
import { FnsTaxCertificateModal } from "./FnsTaxCertificateModal";
import type { TaxPaymentRecord } from "./taxCertificateEngine";
import { PrimaryIntakePackageModal } from "./PrimaryIntakePackageModal";
import { OutpatientCardPrintModal } from "./OutpatientCardPrintModal";
import { DocumentA4PrintPreviewModal } from "./DocumentA4PrintPreviewModal";
import type { ProfessionalA4DocumentTab } from "./ProfessionalDocumentA4Sheet";

export type DocumentCatalogCategory =
	| "all"
	| "intake"
	| "clinical"
	| "finance_tax"
	| "refusal"
	| "pediatric"
	| "registry";

export interface DocumentCatalogItem {
	readonly id: string;
	readonly kind?: DocumentKind | undefined;
	readonly titleRu: string;
	readonly category: DocumentCatalogCategory;
	readonly descriptionRu: string;
	readonly badgeRu: string;
	readonly regulationRu: string;
	readonly icon: React.ComponentType<{ className?: string; size?: number }>;
	readonly isPediatric?: boolean | undefined;
	readonly isStatutory?: boolean | undefined;
	readonly printSupported: boolean;
	readonly onQuickAction?: () => void;
}

export interface DocumentsCatalogViewProps {
	readonly patient?: Patient | null | undefined;
	readonly patientName?: string | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicName?: string | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: clinicProfileDraft
	readonly clinicProfileDraft?: any | undefined;
	readonly existingDocuments?: readonly GeneratedDocument[] | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: eligibleTaxPayments
	readonly eligibleTaxPayments?: readonly any[] | undefined;
	readonly onCreateDocument?: ((kind: DocumentKind) => void | Promise<void>) | undefined;
	readonly onOpenIssuedDocumentHtml?: ((id: string) => void | Promise<void>) | undefined;
	readonly onOpenDocument?: ((kind: DocumentKind) => void) | undefined;
	readonly onOpenPrimaryIntakePackage?: (() => void) | undefined;
	readonly onOpenTaxCertificate?: (() => void) | undefined;
	readonly onSelectRegistryTab?: (() => void) | undefined;
	readonly onOpenFocusEditor?: ((kind: DocumentKind) => void) | undefined;
	readonly className?: string | undefined;
}

export const DocumentsCatalogView: React.FC<DocumentsCatalogViewProps> = ({
	patient,
	patientName = "Пациент",
	patientAgeYears = 6,
	doctorName,
	clinicName,
	clinicProfileDraft,
	existingDocuments,
	eligibleTaxPayments,
	onCreateDocument,
	onOpenIssuedDocumentHtml,
	onOpenDocument,
	onOpenPrimaryIntakePackage,
	onOpenTaxCertificate,
	onSelectRegistryTab,
	onOpenFocusEditor,
	className = "",
}) => {
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [activeCategory, setActiveCategory] = useState<DocumentCatalogCategory>("all");
	const [isDiplomaModalOpen, setIsDiplomaModalOpen] = useState<boolean>(false);
	const [isConsentModalOpen, setIsConsentModalOpen] = useState<boolean>(false);
	const [isLocalTaxModalOpen, setIsLocalTaxModalOpen] = useState<boolean>(false);
	const [isLocalIntakeModalOpen, setIsLocalIntakeModalOpen] = useState<boolean>(false);
	const [isOutpatientCardModalOpen, setIsOutpatientCardModalOpen] = useState<boolean>(false);
	const [isContractModalOpen, setIsContractModalOpen] = useState<boolean>(false);
	const [selectedA4Tab, setSelectedA4Tab] = useState<ProfessionalA4DocumentTab | null>(null);

	const { setSelectedDocumentKind } = useDocumentStore();
	const effectivePatientName = patient?.fullName || patientName;

	const mappedTaxPayments = useMemo<TaxPaymentRecord[] | undefined>(() => {
		if (!eligibleTaxPayments || eligibleTaxPayments.length === 0) return undefined;
		return eligibleTaxPayments.map((p, idx) => {
			const amountRub = Number(p.amountRub ?? p.amount ?? 0);
			const isExpensive =
				p.taxServiceCode === "2" || p.taxCode === "2" || Boolean(p.isExpensiveTreatment) || amountRub >= 100000;
			return {
				id: String(p.id || `pay-${idx}`),
				dateIso: String(p.paidAt || p.createdAt || p.dateIso || new Date().toISOString()),
				amountRub,
				amountKopecks: Math.round(amountRub * 100),
				taxCode: isExpensive ? ("2" as const) : ("1" as const),
				serviceName: String(p.description || p.serviceName || "Стоматологические медицинские услуги"),
				code804n: String(p.code804n || (isExpensive ? "A16.07.054" : "A16.07.002")),
				receiptNumber: String(p.receiptNumber || `ФЧ-${idx + 1}`),
				fiscalDocumentNumber: p.fiscalDocumentNumber ? String(p.fiscalDocumentNumber) : undefined,
				fiscalSign: p.fiscalSign ? String(p.fiscalSign) : undefined,
				isRefund: Boolean(p.status === "refunded" || p.isRefund),
			};
		});
	}, [eligibleTaxPayments]);

	const handleOpenKind = useCallback(
		(kind: DocumentKind, titleRu?: string) => {
			setSelectedDocumentKind(kind);
			onOpenDocument?.(kind);
			if (titleRu) showToast(`Выбран документ: ${titleRu}`, "info", 1500);
		},
		[onOpenDocument, setSelectedDocumentKind],
	);

	const handleOpenIntake = useCallback(() => {
		if (onOpenPrimaryIntakePackage) onOpenPrimaryIntakePackage();
		else setIsLocalIntakeModalOpen(true);
	}, [onOpenPrimaryIntakePackage]);

	const handleOpenTax = useCallback(() => {
		if (onOpenTaxCertificate) onOpenTaxCertificate();
		else setIsLocalTaxModalOpen(true);
	}, [onOpenTaxCertificate]);

	const catalogItems = useMemo<readonly DocumentCatalogItem[]>(() => {
		return [
			{
				id: "consent_medical_intervention",
				kind: "informed_consent",
				titleRu: "Согласие на медицинское вмешательство (ИДС)",
				category: "intake",
				descriptionRu: "Добровольное согласие пациента на осмотр, диагностику и анестезию",
				badgeRu: "Стандарт Минздрава",
				regulationRu: "ФЗ-323 ст. 20 · Стандарт Минздрава",
				icon: ShieldCheck,
				isStatutory: true,
				printSupported: true,
				onQuickAction: () => {
					setSelectedA4Tab("consent_1051n");
				},
			},
			{
				id: "treatment_contract_paid",
				kind: "paid_medical_services_contract",
				titleRu: "Договор платных медицинских услуг",
				category: "intake",
				descriptionRu: "Договор с пациентом или заказчиком на стоматологическое лечение",
				badgeRu: "Договор клиники",
				regulationRu: "Договор клиники · ГОСТ",
				icon: FileText,
				isStatutory: true,
				printSupported: true,
				onQuickAction: () => {
					setSelectedA4Tab("contract");
				},
			},
			{
				id: "personal_data_processing_consent",
				kind: "personal_data_processing_consent",
				titleRu: "Согласие на обработку персданных",
				category: "intake",
				descriptionRu: "Правовое основание для ведения медкарты, связи и оповещений",
				badgeRu: "Персональные данные",
				regulationRu: "152-ФЗ · Персональные данные",
				icon: UserCheck,
				isStatutory: true,
				printSupported: true,
				onQuickAction: () => {
					setSelectedA4Tab("personal_data");
				},
			},
			{
				id: "patient_intake_questionnaire",
				kind: "patient_intake_questionnaire",
				titleRu: "Анкета первичного пациента о здоровье",
				category: "intake",
				descriptionRu: "Сбор аллергоанамнеза, хронических патологий и реакций на анестетики",
				badgeRu: "Анкета здоровья",
				regulationRu: "Анкета здоровья · Аллергоанамнез",
				icon: ClipboardList,
				isStatutory: true,
				printSupported: true,
				onQuickAction: () => handleOpenKind("patient_intake_questionnaire", "Анкета первичного пациента о здоровье"),
			},
			{
				id: "dental_card_043u",
				kind: "dental_medical_card_043u",
				titleRu: "Медицинская карта приёма",
				category: "clinical",
				descriptionRu: "Амбулаторный протокол осмотра, зубной формулы и дневника приёма",
				badgeRu: "Амбулаторная карта",
				regulationRu: "Приказ МЗ № 403н · Амбулаторная карта",
				icon: DentalForm043,
				isStatutory: true,
				printSupported: true,
				onQuickAction: () => {
					setSelectedA4Tab("medical_card");
				},
			},
			{
				id: "treatment_plan",
				kind: "treatment_plan",
				titleRu: "План стоматологического лечения",
				category: "clinical",
				descriptionRu: "Поэтапный график санации, финансовая смета и согласование работ",
				badgeRu: "План и смета",
				regulationRu: "План и смета · Гарантии",
				icon: FileText,
				printSupported: true,
				onQuickAction: () => {
					setSelectedA4Tab("treatment_plan");
				},
			},
			{
				id: "xray_cbct_referral",
				kind: "xray_cbct_referral",
				titleRu: "Направление на рентгенодиагностику и КТ",
				category: "clinical",
				descriptionRu: "Направление на прицельный снимок, ОПТГ или КЛКТ челюстей",
				badgeRu: "Рентген / КЛКТ",
				regulationRu: "СанПиН · Рентген / КЛКТ",
				icon: Scan,
				printSupported: true,
				onQuickAction: () => handleOpenKind("xray_cbct_referral", "Направление на рентгенодиагностику и КТ"),
			},
			{
				id: "post_visit_recommendations",
				kind: "post_visit_recommendations",
				titleRu: "Рекомендации пациенту после приёма",
				category: "clinical",
				descriptionRu: "Памятка по уходу и режиму после проведённого лечения",
				badgeRu: "Памятка ухода",
				regulationRu: "Памятка ухода · Реабилитация",
				icon: Sparkles,
				printSupported: true,
				onQuickAction: () => handleOpenKind("post_visit_recommendations", "Рекомендации пациенту после приёма"),
			},
			{
				id: "tax_deduction_certificate",
				kind: "tax_deduction_certificate",
				titleRu: "Справка для налогового вычета (ФНС)",
				category: "finance_tax",
				descriptionRu: "Справка об оплате медуслуг по кодам 1 и 2 для возврата 13% НДФЛ",
				badgeRu: "Справка ФНС",
				regulationRu: "НК РФ ст. 219 · Справка ФНС",
				icon: Zap,
				isStatutory: true,
				printSupported: true,
				onQuickAction: handleOpenTax,
			},
			{
				id: "treatment_act_completed",
				kind: "completed_works_act",
				titleRu: "Акт выполненных стоматологических работ",
				category: "finance_tax",
				descriptionRu: "Финансовый акт оказанных услуг с подписью о приёмке работ",
				badgeRu: "Акт услуг",
				regulationRu: "54-ФЗ · Акт услуг",
				icon: FileCheck,
				printSupported: true,
				onQuickAction: () => {
					setSelectedA4Tab("act");
				},
			},
			{
				id: "payment_receipt",
				kind: "payment_receipt",
				titleRu: "Квитанция и подтверждение оплаты",
				category: "finance_tax",
				descriptionRu: "Подтверждение оплаты услуг наличными, картой, СБП или с депозита",
				badgeRu: "Кассовый чек",
				regulationRu: "54-ФЗ · Кассовый чек",
				icon: Receipt,
				printSupported: true,
				onQuickAction: () => handleOpenKind("payment_receipt", "Квитанция и подтверждение оплаты"),
			},
			{
				id: "medical_intervention_refusal",
				kind: "medical_intervention_refusal",
				titleRu: "Отказ от медицинского вмешательства",
				category: "refusal",
				descriptionRu: "Официальное оформление отказа от предложенного вмешательства",
				badgeRu: "Форма отказа",
				regulationRu: "ФЗ-323 ст. 20 · Форма отказа",
				icon: ShieldAlert,
				isStatutory: true,
				printSupported: true,
				onQuickAction: () => handleOpenKind("medical_intervention_refusal"),
			},
			{
				id: "minor_legal_consent",
				kind: "minor_legal_representative_consent",
				titleRu: "Согласие законного представителя ребёнка",
				category: "pediatric",
				descriptionRu: "Согласие родителя или опекуна на осмотр и лечение ребёнка",
				badgeRu: "Педиатрия",
				regulationRu: "ФЗ-323 · Педиатрия",
				icon: Heart,
				isPediatric: true,
				isStatutory: true,
				printSupported: true,
				onQuickAction: () => setIsConsentModalOpen(true),
			},
			{
				id: "pediatric_bravery_diploma",
				titleRu: "Грамота за смелость (детский диплом)",
				category: "pediatric",
				descriptionRu: "Памятный диплом супергероя маленькому пациенту за храбрость у кресла",
				badgeRu: "Печать грамоты",
				regulationRu: "Печать грамоты · Адаптация",
				icon: Award,
				isPediatric: true,
				printSupported: true,
				onQuickAction: () => setIsDiplomaModalOpen(true),
			},
			{
				id: "pediatric_treatment_plan",
				kind: "treatment_plan",
				titleRu: "План лечения ребёнка",
				category: "pediatric",
				descriptionRu: "Комплексный график адаптации, санации молочных зубов и профилактики",
				badgeRu: "План санации",
				regulationRu: "План санации · Педиатрия",
				icon: ToothDeciduous,
				isPediatric: true,
				printSupported: true,
				onQuickAction: () => {
					setSelectedA4Tab("treatment_plan");
				},
			},
		];
	}, [handleOpenKind, handleOpenTax]);

	const filteredItems = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		return catalogItems.filter((item) => {
			if (activeCategory !== "all" && item.category !== activeCategory) return false;
			if (!query) return true;
			return (
				item.titleRu.toLowerCase().includes(query) ||
				item.descriptionRu.toLowerCase().includes(query) ||
				item.badgeRu.toLowerCase().includes(query)
			);
		});
	}, [catalogItems, activeCategory, searchQuery]);

	const categoryCounts = useMemo(() => {
		const counts: Record<string, number> = {
			all: catalogItems.length, intake: 0, clinical: 0, finance_tax: 0, refusal: 0, pediatric: 0,
		};
		for (const item of catalogItems) counts[item.category] = (counts[item.category] || 0) + 1;
		return counts;
	}, [catalogItems]);

	return (
		<div
			className={`flex flex-col gap-3 p-3 sm:p-4 bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-xl border border-[var(--line,#e2e8f0)] shadow-xs ${className}`}
			data-testid="documents-catalog-view"
		>
			{/* ВЕРХНИЙ КОМПАКТНЫЙ ТУЛБАР (СТРОГО 1 СТРОКА: 32–36PX) */}
			<div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--line,#e2e8f0)] min-w-0 flex-wrap xl:flex-nowrap">
				{/* Поле поиска: padding-left >= 38px, гарантированная ширина 210px без сжатия */}
				<div className="relative shrink-0" style={{ width: "210px", minWidth: "210px" }}>
					<Search
						className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted,#64748b)] pointer-events-none"
						aria-hidden="true"
					/>
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск по бланкам..."
						style={{ paddingLeft: "38px" }}
						className="document-search-input w-full h-8 pr-7 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-xs text-[var(--ink,#0f172a)] placeholder:text-[var(--muted,#64748b)] focus:border-[var(--teal,#0d9488)] focus:bg-[var(--paper,#ffffff)] focus:outline-hidden transition"
						data-testid="input-documents-catalog-search"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer"
							aria-label="Очистить поиск"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					)}
				</div>

				{/* Сегментированные фильтры-пилюли */}
				<div
					className="dente-segmented-bar inline-flex p-0.5 rounded-xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#cbd5e1)] gap-0.5 overflow-x-auto max-w-full min-h-[32px] items-center shrink-0 select-none"
					role="tablist"
					aria-label="Категории документов"
				>
					{(
						[
							{ id: "all", label: "Все", testId: "filter-cat-all", count: categoryCounts.all },
							{ id: "intake", label: "Первичный приём", testId: "filter-cat-intake" },
							{ id: "clinical", label: "Лечение", testId: "filter-cat-clinical" },
							{ id: "finance_tax", label: "Финансы и ФНС", testId: "filter-cat-finance" },
							{ id: "refusal", label: "Отказы", testId: "filter-cat-refusal" },
							{ id: "pediatric", label: "Детские", testId: "filter-cat-pediatric" },
							{ id: "registry", label: "Реестр", testId: "filter-cat-registry", count: existingDocuments?.length ?? 0 },
						] as const
					).map((tab) => {
						const isActive = activeCategory === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								role="tab"
								aria-selected={isActive}
								onClick={() => {
									setActiveCategory(tab.id);
									if (tab.id === "registry") onSelectRegistryTab?.();
								}}
								className={`dente-segmented-item h-7 px-2 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 border ${
									isActive
										? "active bg-[var(--paper,#ffffff)] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]/40 shadow-2xs font-bold"
										: "bg-transparent border-transparent text-[var(--ink,#334155)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]/70 font-semibold"
								}`}
								data-testid={tab.testId}
							>
								<span>{tab.label}</span>
								{"count" in tab && tab.count !== undefined && (
									<span
										className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
											isActive
												? "bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)]"
												: "bg-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]"
										}`}
									>
										{tab.count}
									</span>
								)}
							</button>
						);
					})}
				</div>

				{/* Действия тулбара */}
				<div className="flex items-center gap-1.5 shrink-0">
					<button
						type="button"
						onClick={handleOpenIntake}
						className="primary-button h-8 px-2.5 rounded-lg bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shrink-0 shadow-2xs"
						data-testid="btn-catalog-primary-intake"
						title="Пакет приёма в 1 клик (ИДС + Договор + Персданные)"
					>
						<Printer className="w-3.5 h-3.5 text-white" />
						<span className="whitespace-nowrap">Пакет приёма в 1 клик</span>
					</button>

					<button
						type="button"
						onClick={() => setIsDiplomaModalOpen(true)}
						className="secondary-button h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)] font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition shrink-0"
						data-testid="btn-catalog-print-diploma"
						title="Печать памятного диплома маленькому пациенту за смелость"
					>
						<Award className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
						<span className="hidden xl:inline whitespace-nowrap">Грамота</span>
					</button>
				</div>
			</div>

			{/* СЕТКА КАРТОЧЕК ДОКУМЕНТОВ (0 МНОГОТОЧИЙ, ЧИСТАЯ ТИПОГРАФИКА) */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="documents-catalog-grid">
				{filteredItems.map((item) => {
					const ItemIcon = item.icon;
					const patientDoc = existingDocuments?.find((d) => d.kind === item.kind);
					// biome-ignore lint/suspicious/noExplicitAny: dynamic signedAt check
					const isSigned = Boolean(patientDoc?.doctorSignedAt || (patientDoc as any)?.signedAt || (patientDoc?.status as string) === "issued" || (patientDoc as any)?.signatureAttestation);
					const isDraft = patientDoc?.status === "draft";
					const isIssued = patientDoc?.status === "issued";
					// biome-ignore lint/suspicious/noExplicitAny: dynamic createdAt fallback
					const docDateStr = patientDoc?.issuedAt || (patientDoc as any)?.createdAt;

					return (
						<div
							key={item.id}
							className="dente-tile-card p-3.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-card,var(--paper,#ffffff))] hover:border-[var(--teal,#0d9488)] transition-all flex flex-col gap-2 shadow-[0_1px_3px_rgba(15,23,42,0.06)] hover:shadow-[0_4px_12px_rgba(13,148,136,0.10)]"
							data-testid={`document-item-${item.id}`}
						>
							<div className="flex items-start justify-between gap-2">
								<div className="flex items-start gap-2.5 min-w-0 flex-1">
									<div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-[var(--paper-soft,#f1f5f9)] text-[var(--teal,#0d9488)] border border-[var(--line,#cbd5e1)]">
										<ItemIcon className="w-4 h-4" />
									</div>
									<div className="min-w-0 flex-1">
										<h3 className="text-xs font-bold tracking-tight text-[var(--ink,#0f172a)] leading-snug">
											{item.titleRu}
										</h3>
										<div className="text-[10.5px] font-semibold text-[var(--teal,#0d9488)] dark:text-teal-400 mt-0.5 tracking-wide">
											{item.regulationRu}
										</div>
									</div>
								</div>

								<span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#334155)] border-[var(--line,#cbd5e1)]">
									{item.badgeRu}
								</span>
							</div>

							<p className="text-[11.5px] text-[var(--muted,#475569)] leading-snug">
								{item.descriptionRu}
							</p>

							<div className="mt-auto pt-2 border-t border-[var(--line,#e2e8f0)] flex flex-col gap-2">
								<div className="flex items-center justify-between text-[11px]">
									{isSigned ? (
										<span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
											<CheckCircle2 size={12} aria-hidden="true" />
											<span>Подписан {docDateStr ? formatShortDate(docDateStr) : ""}</span>
										</span>
									) : isDraft ? (
										<span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
											<Clock size={12} aria-hidden="true" />
											<span>Черновик {docDateStr ? formatShortDate(docDateStr) : ""}</span>
										</span>
									) : isIssued ? (
										<span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 dark:text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20">
											<CheckCircle2 size={12} aria-hidden="true" />
											<span>Оформлен {docDateStr ? formatShortDate(docDateStr) : ""}</span>
										</span>
									) : (
										<span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--muted,#64748b)] bg-[var(--paper-soft,#f1f5f9)] px-2 py-0.5 rounded-md border border-[var(--line,#cbd5e1)]">
											Не оформлен
										</span>
									)}

									<span className="text-[10.5px] font-medium text-[var(--muted,#64748b)]">
										{item.printSupported ? "Печать А4" : "Электронно"}
									</span>
								</div>

								<div className="flex items-center justify-end gap-1.5">
									<button
										type="button"
										onClick={() => {
											if (item.kind && onOpenFocusEditor) onOpenFocusEditor(item.kind);
											else if (item.onQuickAction) item.onQuickAction();
										}}
										className="secondary-button h-8 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] transition flex items-center gap-1.5 cursor-pointer flex-1 justify-center"
										title={patientDoc ? "Открыть документ пациента" : "Оформить документ"}
										data-testid={`btn-open-${item.id}`}
									>
										<Eye className="w-3.5 h-3.5 text-[var(--muted)]" />
										<span>{patientDoc ? "Открыть" : "Оформить"}</span>
									</button>

									{item.printSupported && (
										<button
											type="button"
											onClick={item.onQuickAction}
											className="secondary-button h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:border-[var(--teal,#0d9488)] text-xs font-semibold text-[var(--ink,#0f172a)] transition flex items-center gap-1.5 cursor-pointer"
											title="Печать бланка"
											data-testid={`btn-print-${item.id}`}
										>
											<Printer className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
											<span>Печать</span>
										</button>
									)}
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{isDiplomaModalOpen && (
				<PediatricBraveryDiplomaModal
					isOpen={isDiplomaModalOpen}
					onClose={() => setIsDiplomaModalOpen(false)}
					patientName={effectivePatientName}
					patientAgeYears={patientAgeYears}
					doctorName={doctorName}
					clinicName={clinicName}
				/>
			)}

			{isConsentModalOpen && (
				<ConsentModal
					isOpen={isConsentModalOpen}
					onClose={() => setIsConsentModalOpen(false)}
					patient={{ fullName: effectivePatientName, phone: patient?.phone, birthDate: patient?.birthDate }}
					doctorName={doctorName}
					clinicName={clinicName}
					isMinorPatient={patientAgeYears < 15}
				/>
			)}

			{isLocalTaxModalOpen && (
				<FnsTaxCertificateModal
					isOpen={isLocalTaxModalOpen}
					onClose={() => setIsLocalTaxModalOpen(false)}
					patient={patient ?? null}
					clinicProfileDraft={clinicProfileDraft}
					payments={mappedTaxPayments || []}
				/>
			)}

			{isLocalIntakeModalOpen && (
				<PrimaryIntakePackageModal
					isOpen={isLocalIntakeModalOpen}
					onClose={() => setIsLocalIntakeModalOpen(false)}
					patient={patient ?? null}
					existingDocuments={existingDocuments ? [...existingDocuments] : []}
					onCreateDocument={(kind) => (onCreateDocument ? void onCreateDocument(kind) : handleOpenKind(kind))}
					onOpenDocument={(id) => (onOpenIssuedDocumentHtml ? void onOpenIssuedDocumentHtml(id) : undefined)}
					onSelectDocumentKind={(kind) => handleOpenKind(kind)}
					doctorFullName={doctorName}
					clinicProfileDraft={clinicProfileDraft}
				/>
			)}

			{isOutpatientCardModalOpen && (
				<OutpatientCardPrintModal
					isOpen={isOutpatientCardModalOpen}
					onClose={() => setIsOutpatientCardModalOpen(false)}
					patient={patient ?? null}
					doctorFullName={doctorName ?? null}
					clinicProfileDraft={clinicProfileDraft}
				/>
			)}

			{(selectedA4Tab || isContractModalOpen) && (
				<DocumentA4PrintPreviewModal
					isOpen={Boolean(selectedA4Tab || isContractModalOpen)}
					onClose={() => { setSelectedA4Tab(null); setIsContractModalOpen(false); }}
					initialTab={selectedA4Tab || "contract"}
					patient={patient ?? null}
					doctorFullName={doctorName ?? null}
					clinicProfileDraft={clinicProfileDraft}
					existingDocuments={existingDocuments}
				/>
			)}
		</div>
	);
};

export default DocumentsCatalogView;
