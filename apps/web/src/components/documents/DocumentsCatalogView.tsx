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
	AlertCircle,
	Award,
	Check,
	CheckCircle2,
	ChevronRight,
	ClipboardList,
	Eye,
	FileCheck,
	FilePlus,
	FileText,
	Heart,
	Printer,
	Receipt,
	Scan,
	Search,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	UserCheck,
	X,
	Zap,
} from "lucide-react";
import { DentalForm043, ToothDeciduous } from "../icons/DentalIcons";
import { useDocumentStore } from "../../store/documentStore";
import { showToast } from "../GlobalToast";
import type { DocumentKind, Patient } from "@dental/shared";
import { PediatricBraveryDiplomaModal } from "../pediatric/PediatricBraveryDiplomaModal";
import { ConsentModal } from "../consents/ConsentModal";
import { FnsTaxCertificateModal } from "./FnsTaxCertificateModal";
import { PrimaryIntakePackageModal } from "./PrimaryIntakePackageModal";
import { OutpatientCardPrintModal } from "./OutpatientCardPrintModal";
import { DocumentA4PrintPreviewModal } from "./DocumentA4PrintPreviewModal";

export type DocumentCatalogCategory =
	| "all"
	| "intake"
	| "clinical"
	| "finance_tax"
	| "refusal"
	| "pediatric";

export interface DocumentCatalogItem {
	readonly id: string;
	readonly kind?: DocumentKind | undefined;
	readonly titleRu: string;
	readonly category: DocumentCatalogCategory;
	readonly descriptionRu: string;
	readonly badgeRu: string;
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
	readonly onOpenDocument?: ((kind: DocumentKind) => void) | undefined;
	readonly onOpenPrimaryIntakePackage?: (() => void) | undefined;
	readonly onOpenTaxCertificate?: (() => void) | undefined;
	readonly className?: string | undefined;
}

export const DocumentsCatalogView: React.FC<DocumentsCatalogViewProps> = ({
	patient,
	patientName = "Пациент",
	patientAgeYears = 6,
	doctorName,
	clinicName,
	clinicProfileDraft,
	onOpenDocument,
	onOpenPrimaryIntakePackage,
	onOpenTaxCertificate,
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

	const { setSelectedDocumentKind } = useDocumentStore();

	const effectivePatientName = patient?.fullName || patientName;

	const handleOpenKind = useCallback(
		(kind: DocumentKind) => {
			setSelectedDocumentKind(kind);
			onOpenDocument?.(kind);
			showToast(`Открыт документ: ${kind}`, "info", 1500);
		},
		[onOpenDocument, setSelectedDocumentKind],
	);

	const handleOpenIntake = useCallback(() => {
		if (onOpenPrimaryIntakePackage) {
			onOpenPrimaryIntakePackage();
		} else {
			setIsLocalIntakeModalOpen(true);
		}
	}, [onOpenPrimaryIntakePackage]);

	const handleOpenTax = useCallback(() => {
		if (onOpenTaxCertificate) {
			onOpenTaxCertificate();
		} else {
			setIsLocalTaxModalOpen(true);
		}
	}, [onOpenTaxCertificate]);

	// Каталог документов клиники на чистом медицинском языке без птичьего жаргона
	const catalogItems = useMemo<readonly DocumentCatalogItem[]>(() => {
		return [
			// 1. ПЕРВИЧНЫЙ ПРИЁМ
			{
				id: "consent_medical_intervention",
				kind: "informed_consent",
				titleRu: "Согласие на медицинское вмешательство (ИДС)",
				category: "intake",
				descriptionRu: "Добровольное согласие пациента на первичный осмотр, диагностику и местную анестезию",
				badgeRu: "Стандарт Минздрава",
				icon: ShieldCheck,
				isStatutory: true,
				printSupported: true,
				onQuickAction: () => setIsConsentModalOpen(true),
			},
			{
				id: "treatment_contract_paid",
				kind: "paid_medical_services_contract",
				titleRu: "Договор платных медицинских услуг",
				category: "intake",
				descriptionRu: "Обязательный договор с пациентом или заказчиком до начала процедур с реквизитами клиники",
				badgeRu: "Договор клиники",
				icon: FileText,
				isStatutory: true,
				printSupported: true,
				onQuickAction: () => {
					handleOpenKind("paid_medical_services_contract");
					setIsContractModalOpen(true);
				},
			},
			{
				id: "personal_data_processing_consent",
				kind: "personal_data_processing_consent",
				titleRu: "Согласие на обработку персданных",
				category: "intake",
				descriptionRu: "Правовое основание для ведения медицинской карты, связи с пациентом и оповещений",
				badgeRu: "152-ФЗ",
				icon: UserCheck,
				isStatutory: true,
				printSupported: true,
				onQuickAction: () => handleOpenKind("personal_data_processing_consent"),
			},
			{
				id: "patient_intake_questionnaire",
				kind: "patient_intake_questionnaire",
				titleRu: "Анкета первичного пациента о здоровье",
				category: "intake",
				descriptionRu: "Сбор аллергоанамнеза, соматических патологий, непереносимости анестетиков и постоянных препаратов",
				badgeRu: "Анкета здоровья",
				icon: ClipboardList,
				isStatutory: true,
				printSupported: true,
				onQuickAction: () => handleOpenKind("patient_intake_questionnaire"),
			},

			// 2. ЛЕЧЕНИЕ И МЕДКАРТА
			{
				id: "dental_card_043u",
				kind: "dental_medical_card_043u",
				titleRu: "Медицинская карта приёма",
				category: "clinical",
				descriptionRu: "Официальный амбулаторный протокол осмотра, одонтограммы обеих челюстей и дневника лечения",
				badgeRu: "Амбулаторная карта",
				icon: DentalForm043,
				isStatutory: true,
				printSupported: true,
				onQuickAction: () => {
					handleOpenKind("dental_medical_card_043u");
					setIsOutpatientCardModalOpen(true);
				},
			},
			{
				id: "treatment_plan",
				kind: "treatment_plan",
				titleRu: "План стоматологического лечения",
				category: "clinical",
				descriptionRu: "Комплексный поэтапный график санации, финансовая смета и согласование процедур с пациентом",
				badgeRu: "План и смета",
				icon: FileText,
				printSupported: true,
				onQuickAction: () => handleOpenKind("treatment_plan"),
			},
			{
				id: "xray_cbct_referral",
				kind: "xray_cbct_referral",
				titleRu: "Направление на рентгенодиагностику и КТ",
				category: "clinical",
				descriptionRu: "Направление на прицельные снимки, ОПТГ и КЛКТ с указанием лучевой нагрузки",
				badgeRu: "Рентген / КЛКТ",
				icon: Scan,
				printSupported: true,
				onQuickAction: () => handleOpenKind("xray_cbct_referral"),
			},
			{
				id: "post_visit_recommendations",
				kind: "post_visit_recommendations",
				titleRu: "Рекомендации пациенту после приёма",
				category: "clinical",
				descriptionRu: "Памятка по гигиене и режиму после хирургического, эндодонтического или ортопедического лечения",
				badgeRu: "Памятка ухода",
				icon: Sparkles,
				printSupported: true,
				onQuickAction: () => handleOpenKind("post_visit_recommendations"),
			},

			// 3. ФИНАНСЫ И ФНС
			{
				id: "tax_deduction_certificate",
				kind: "tax_deduction_certificate",
				titleRu: "Справка для налогового вычета (ФНС)",
				category: "finance_tax",
				descriptionRu: "Справка об оплате медицинских услуг по кодам 1 и 2 с расчетом 13% НДФЛ для налоговых органов",
				badgeRu: "Справка ФНС",
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
				descriptionRu: "Итоговый финансовый акт оказанных услуг с подписью пациента о сдаче-приемке работы",
				badgeRu: "Акт услуг",
				icon: FileCheck,
				printSupported: true,
				onQuickAction: () => handleOpenKind("completed_works_act"),
			},
			{
				id: "payment_receipt",
				kind: "payment_receipt",
				titleRu: "Квитанция и подтверждение оплаты",
				category: "finance_tax",
				descriptionRu: "Подтверждение фискальной оплаты медицинских услуг наличными, картой, СБП или депозитом",
				badgeRu: "Касса 54-ФЗ",
				icon: Receipt,
				printSupported: true,
				onQuickAction: () => handleOpenKind("payment_receipt"),
			},

			// 4. ОТКАЗЫ
			{
				id: "medical_intervention_refusal",
				kind: "medical_intervention_refusal",
				titleRu: "Отказ от медицинского вмешательства",
				category: "refusal",
				descriptionRu: "Официальный отказ пациента от предложенного медицинского вмешательства или госпитализации",
				badgeRu: "Ст. 20 323-ФЗ",
				icon: ShieldAlert,
				isStatutory: true,
				printSupported: true,
				onQuickAction: () => handleOpenKind("medical_intervention_refusal"),
			},

			// 5. ДЕТСКИЕ ДОКУМЕНТЫ (ТАБУ: ПЕДИАТРИЯ ПОЛНОСТЬЮ СОХРАНЕНА)
			{
				id: "minor_legal_consent",
				kind: "minor_legal_representative_consent",
				titleRu: "Согласие законного представителя ребёнка",
				category: "pediatric",
				descriptionRu: "Согласие родителя или опекуна на осмотр и лечение несовершеннолетнего",
				badgeRu: "Педиатрия",
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
				icon: ToothDeciduous,
				isPediatric: true,
				printSupported: true,
				onQuickAction: () => handleOpenKind("treatment_plan"),
			},
		];
	}, [handleOpenKind, handleOpenTax]);

	// Фильтрация по поиску и категориям
	const filteredItems = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		return catalogItems.filter((item) => {
			if (activeCategory !== "all" && item.category !== activeCategory) {
				return false;
			}
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
			all: catalogItems.length,
			intake: 0,
			clinical: 0,
			finance_tax: 0,
			refusal: 0,
			pediatric: 0,
		};
		for (const item of catalogItems) {
			counts[item.category] = (counts[item.category] || 0) + 1;
		}
		return counts;
	}, [catalogItems]);

	return (
		<div
			className={`flex flex-col gap-3 p-3 sm:p-4 bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-xl border border-[var(--line,#e2e8f0)] shadow-xs ${className}`}
			data-testid="documents-catalog-view"
		>
			{/* ВЕРХНИЙ КОМПАКТНЫЙ ТУЛБАР (СТРОГО 1 СТРОКА: 32–36PX) */}
			<div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-[var(--line,#e2e8f0)]">
				{/* Поле поиска по стандарту Mandate 12: padding-left >= 38px */}
				<div className="relative min-w-[200px] max-w-[280px] flex-1">
					<Search
						className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted,#64748b)] pointer-events-none"
						aria-hidden="true"
					/>
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск по бланкам и согласиям..."
						style={{ paddingLeft: "38px" }}
						className="w-full h-8 pr-8 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs text-[var(--ink,#0f172a)] placeholder:text-[var(--muted,#64748b)] focus:border-teal-500 focus:bg-[var(--paper,#ffffff)] focus:outline-hidden transition"
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

				{/* Сегментированные фильтры-пилюли (Apple-style 32px) */}
				<div className="inline-flex p-1 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] gap-1 overflow-x-auto max-w-full">
					<button
						type="button"
						onClick={() => setActiveCategory("all")}
						className={`h-7 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
							activeCategory === "all"
								? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-xs border border-[var(--line,#e2e8f0)]"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]/50"
						}`}
						data-testid="filter-cat-all"
					>
						<span>Все</span>
						<span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] font-semibold">
							{categoryCounts.all}
						</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveCategory("intake")}
						className={`h-7 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
							activeCategory === "intake"
								? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-xs border border-[var(--line,#e2e8f0)]"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]/50"
						}`}
						data-testid="filter-cat-intake"
					>
						Первичный приём
					</button>

					<button
						type="button"
						onClick={() => setActiveCategory("clinical")}
						className={`h-7 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
							activeCategory === "clinical"
								? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-xs border border-[var(--line,#e2e8f0)]"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]/50"
						}`}
						data-testid="filter-cat-clinical"
					>
						Лечение
					</button>

					<button
						type="button"
						onClick={() => setActiveCategory("finance_tax")}
						className={`h-7 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
							activeCategory === "finance_tax"
								? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-xs border border-[var(--line,#e2e8f0)]"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]/50"
						}`}
						data-testid="filter-cat-finance"
					>
						Финансы и ФНС
					</button>

					<button
						type="button"
						onClick={() => setActiveCategory("refusal")}
						className={`h-7 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
							activeCategory === "refusal"
								? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-xs border border-[var(--line,#e2e8f0)]"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]/50"
						}`}
						data-testid="filter-cat-refusal"
					>
						Отказы
					</button>

					<button
						type="button"
						onClick={() => setActiveCategory("pediatric")}
						className={`h-7 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
							activeCategory === "pediatric"
								? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-xs border border-[var(--line,#e2e8f0)]"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]/50"
						}`}
						data-testid="filter-cat-pediatric"
					>
						Детские
					</button>
				</div>

				{/* Действия тулбара: 1 Primary CTA («Пакет первичного приёма») + Secondary */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleOpenIntake}
						style={{ backgroundColor: "var(--teal, #0d9488)" }}
						className="h-8 px-3 rounded-lg text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition hover:brightness-110 active:scale-95 shrink-0"
						data-testid="btn-catalog-primary-intake"
						title="Пакет документов первичного приёма (ИДС 1051н + Договор + 152-ФЗ)"
					>
						<Printer className="w-3.5 h-3.5 text-white" />
						<span>Пакет первичного приёма</span>
					</button>

					<button
						type="button"
						onClick={() => setIsDiplomaModalOpen(true)}
						className="h-8 px-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 font-bold text-xs flex items-center gap-1 cursor-pointer transition active:scale-95 shrink-0"
						data-testid="btn-catalog-print-diploma"
						title="Печать памятного диплома маленькому пациенту за смелость"
					>
						<Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
						<span className="hidden sm:inline">Грамота за смелость</span>
					</button>
				</div>
			</div>

			{/* СЕТКА КАРТОЧЕК ДОКУМЕНТОВ (ГЛУБИНА 1, ЧИСТАЯ ТИПОГРАФИКА) */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5" data-testid="documents-catalog-grid">
				{filteredItems.map((item) => {
					const ItemIcon = item.icon;
					return (
						<div
							key={item.id}
							className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:border-teal-500/70 transition flex flex-col justify-between gap-2.5 shadow-2xs min-h-[125px]"
							data-testid={`document-item-${item.id}`}
						>
							<div className="flex items-start justify-between gap-2">
								<div className="flex items-start gap-2.5 min-w-0">
									<div
										className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
											item.isPediatric
												? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
												: item.category === "refusal"
												? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
												: item.category === "finance_tax"
												? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
												: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30"
										}`}
									>
										<ItemIcon className="w-4 h-4" />
									</div>
									<div className="min-w-0 flex-1">
										<h3 className="text-xs font-bold tracking-tight text-[var(--ink,#0f172a)] leading-snug">
											{item.titleRu}
										</h3>
										<p className="text-[11px] text-[var(--muted,#64748b)] mt-1 leading-normal break-words">
											{item.descriptionRu}
										</p>
									</div>
								</div>

								<span
									className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${
										item.isPediatric
											? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700"
											: item.category === "refusal"
											? "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-700"
											: item.category === "finance_tax"
											? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700"
											: "bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] border-[var(--line,#e2e8f0)]"
									}`}
								>
									{item.badgeRu}
								</span>
							</div>

							{/* Кнопки быстрого действия (не более 2 кнопок по Миллеру) */}
							<div className="flex items-center justify-between pt-2 border-t border-[var(--line-subtle,#f1f5f9)]">
								<span className="text-[10px] text-[var(--muted,#64748b)] font-medium">
									{item.printSupported ? "Печать А4 доступна" : "Электронная форма"}
								</span>

								<div className="flex items-center gap-1.5">
									{item.onQuickAction && (
										<button
											type="button"
											onClick={item.onQuickAction}
											className="h-7 px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-bold text-[var(--ink,#0f172a)] transition flex items-center gap-1 cursor-pointer active:scale-95"
											title="Открыть форму"
											data-testid={`btn-open-${item.id}`}
										>
											<Eye className="w-3.5 h-3.5" />
											<span>Открыть</span>
										</button>
									)}

									{item.printSupported && (
										<button
											type="button"
											onClick={item.onQuickAction}
											className="h-7 px-2.5 rounded-lg border border-teal-500/40 bg-teal-500/15 text-teal-800 dark:text-teal-200 hover:bg-teal-500/25 text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
											title="1-клик печать бланка"
											data-testid={`btn-print-${item.id}`}
										>
											<Printer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-300" />
											<span>Печать</span>
										</button>
									)}
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{/* Модалка диплома за храбрость */}
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

			{/* Модалка информированного добровольного согласия */}
			{isConsentModalOpen && (
				<ConsentModal
					isOpen={isConsentModalOpen}
					onClose={() => setIsConsentModalOpen(false)}
					patient={{
						fullName: effectivePatientName,
						phone: patient?.phone,
						birthDate: patient?.birthDate,
					}}
					doctorName={doctorName}
					clinicName={clinicName}
					isMinorPatient={patientAgeYears < 15}
				/>
			)}

			{/* Локальная модалка справки ФНС */}
			{isLocalTaxModalOpen && (
				<FnsTaxCertificateModal
					isOpen={isLocalTaxModalOpen}
					onClose={() => setIsLocalTaxModalOpen(false)}
					patient={patient ?? null}
					clinicProfileDraft={clinicProfileDraft}
				/>
			)}

			{/* Локальная модалка первичного пакета */}
			{isLocalIntakeModalOpen && (
				<PrimaryIntakePackageModal
					isOpen={isLocalIntakeModalOpen}
					onClose={() => setIsLocalIntakeModalOpen(false)}
					patient={patient ?? null}
					existingDocuments={[]}
					onCreateDocument={(kind) => handleOpenKind(kind)}
					onOpenDocument={() => {}}
					onSelectDocumentKind={(kind) => handleOpenKind(kind)}
					doctorFullName={doctorName}
					clinicProfileDraft={clinicProfileDraft}
				/>
			)}

			{/* Модалка медицинской карты / формы 043/у */}
			{isOutpatientCardModalOpen && (
				<OutpatientCardPrintModal
					isOpen={isOutpatientCardModalOpen}
					onClose={() => setIsOutpatientCardModalOpen(false)}
					patient={patient ?? null}
					doctorFullName={doctorName ?? null}
					clinicProfileDraft={clinicProfileDraft}
				/>
			)}

			{/* Модалка официального договора A4 */}
			{isContractModalOpen && (
				<DocumentA4PrintPreviewModal
					isOpen={isContractModalOpen}
					onClose={() => setIsContractModalOpen(false)}
					initialTab="contract"
					patient={patient ?? null}
					doctorFullName={doctorName ?? null}
					clinicProfileDraft={clinicProfileDraft}
				/>
			)}
		</div>
	);
};

export default DocumentsCatalogView;
