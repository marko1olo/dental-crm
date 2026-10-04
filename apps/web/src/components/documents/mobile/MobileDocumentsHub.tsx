import type React from "react";
import { useMemo, useState } from "react";
import type {
	DocumentKind,
	DocumentKindMetadata,
	DocumentStatus,
	GeneratedDocument,
	Patient,
	StaffMember,
} from "@dental/shared";
import {
	AlertCircle,
	CheckCircle2,
	ChevronRight,
	Clock,
	FileCheck,
	FilePlus,
	FileSignature,
	FileText,
	Printer,
	Receipt,
	Search,
	Shield,
	ShieldCheck,
	Sparkles,
	UserCheck,
	X,
	Zap,
} from "lucide-react";
import { DentalForm043 } from "../../icons/DentalIcons";
import { EmptyState } from "../../EmptyState";
import { MobileDocumentPreviewSheet } from "./MobileDocumentPreviewSheet";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";

const DEMO_SHOWCASE_DOCUMENTS: GeneratedDocument[] = [
	{
		id: "00000000-0000-4000-8000-000000000001",
		organizationId: "00000000-0000-4000-8000-000000000000",
		patientId: "00000000-0000-4000-8000-000000000010",
		visitId: null,
		kind: "paid_medical_services_contract",
		title: "Договор на оказание платных медицинских услуг № 2026/0412",
		issuedAt: "2026-03-12T10:00:00.000Z",
		status: "issued",
		doctorSignedAt: "2026-03-12T10:15:00.000Z",
		totalAmountRub: 45000,
	},
	{
		id: "00000000-0000-4000-8000-000000000002",
		organizationId: "00000000-0000-4000-8000-000000000000",
		patientId: "00000000-0000-4000-8000-000000000010",
		visitId: null,
		kind: "informed_consent",
		title: "ИДС на проведение терапевтического лечения (Приказ 1051н)",
		issuedAt: null,
		status: "draft",
		totalAmountRub: null,
	},
	{
		id: "00000000-0000-4000-8000-000000000003",
		organizationId: "00000000-0000-4000-8000-000000000000",
		patientId: "00000000-0000-4000-8000-000000000010",
		visitId: null,
		kind: "completed_works_act",
		title: "Акт выполненных работ и приёма услуг № А-890 (Приказ 804н)",
		issuedAt: "2026-03-15T12:30:00.000Z",
		status: "issued",
		doctorSignedAt: "2026-03-15T12:45:00.000Z",
		totalAmountRub: 12500,
	},
	{
		id: "00000000-0000-4000-8000-000000000004",
		organizationId: "00000000-0000-4000-8000-000000000000",
		patientId: "00000000-0000-4000-8000-000000000010",
		visitId: null,
		kind: "tax_deduction_certificate",
		title: "Справка об оплате медицинских услуг для ФНС России",
		issuedAt: "2026-03-20T14:10:00.000Z",
		status: "issued",
		doctorSignedAt: "2026-03-20T14:15:00.000Z",
		totalAmountRub: 57500,
		taxYear: 2026,
	},
	{
		id: "00000000-0000-4000-8000-000000000005",
		organizationId: "00000000-0000-4000-8000-000000000000",
		patientId: "00000000-0000-4000-8000-000000000010",
		visitId: null,
		kind: "dental_medical_card_043u",
		title: "Медицинская карта стоматологического пациента № 043/у-1082",
		issuedAt: "2026-03-01T09:00:00.000Z",
		status: "issued",
		doctorSignedAt: "2026-03-01T09:30:00.000Z",
		totalAmountRub: null,
	},
];

export interface MobileDocumentsHubProps {
	readonly documents: GeneratedDocument[];
	readonly activePatient?: Patient | null | undefined;
	readonly activeDoctor?: StaffMember | null | undefined;
	readonly documentLabels?: Record<DocumentKind, string> | undefined;
	readonly documentStatusLabels?: Record<DocumentStatus, string> | undefined;
	readonly documentKindMetadata?: Record<DocumentKind, DocumentKindMetadata> | undefined;
	readonly formatShortDate?: ((date: string | null | undefined) => string) | undefined;
	readonly money?: ((val: number | null | undefined) => string) | undefined;
	readonly onRequestIssue?: ((doc: GeneratedDocument) => void) | undefined;
	readonly onDownloadPdf: (id: string) => Promise<void> | void;
	readonly onOpenHtml: (id: string) => Promise<void> | void;
	readonly onLoadAuditFacts?: ((id: string) => Promise<void> | void) | undefined;
	readonly onDirectPrintPrimaryIntake?: (() => void) | undefined;
	readonly onOpenPrimaryIntakeModal?: (() => void) | undefined;
	readonly onOpenCreateDocumentModal?: ((kind: DocumentKind) => void) | undefined;
}

type MobileCategoryTab =
	| "all"
	| "contracts"
	| "consents"
	| "acts"
	| "fns"
	| "clinical"
	| "sanpin";

export function MobileDocumentsHub({
	documents,
	activePatient,
	activeDoctor,
	documentLabels,
	documentStatusLabels,
	documentKindMetadata,
	formatShortDate,
	money,
	onRequestIssue,
	onDownloadPdf,
	onOpenHtml,
	onLoadAuditFacts,
	onDirectPrintPrimaryIntake,
	onOpenPrimaryIntakeModal,
	onOpenCreateDocumentModal,
}: MobileDocumentsHubProps): React.JSX.Element {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeCategory, setActiveCategory] = useState<MobileCategoryTab>("all");
	const [activeStatus, setActiveStatus] = useState<"all" | "draft" | "signed">("all");
	const [previewDoc, setPreviewDoc] = useState<GeneratedDocument | null>(null);

	const triggerTactile = () => {
		try {
			if (typeof navigator !== "undefined" && navigator.vibrate) {
				navigator.vibrate(10);
			}
		} catch {
			// no-op if vibration not permitted
		}
	};

	// Category filter definitions
	const categories: Array<{
		id: MobileCategoryTab;
		label: string;
		icon: React.ReactNode;
		kinds?: DocumentKind[];
	}> = [
		{
			id: "all",
			label: "Все",
			icon: <FileText size={14} className="shrink-0" aria-hidden="true" />,
		},
		{
			id: "contracts",
			label: "Договоры",
			icon: <FileText size={14} className="shrink-0 text-blue-500" aria-hidden="true" />,
			kinds: ["paid_medical_services_contract"],
		},
		{
			id: "consents",
			label: "Согласия (ИДС 1051н)",
			icon: <ShieldCheck size={14} className="shrink-0 text-teal-500" aria-hidden="true" />,
			kinds: [
				"informed_consent",
				"procedure_specific_consent_packet",
				"personal_data_processing_consent",
				"photo_video_consent",
				"minor_legal_representative_consent",
			],
		},
		{
			id: "acts",
			label: "Акты (804н)",
			icon: <FileCheck size={14} className="shrink-0 text-emerald-500" aria-hidden="true" />,
			kinds: ["completed_works_act"],
		},
		{
			id: "fns",
			label: "Справки для ФНС",
			icon: <Receipt size={14} className="shrink-0 text-amber-500" aria-hidden="true" />,
			kinds: [
				"tax_deduction_certificate",
				"tax_deduction_application",
				"payment_invoice",
				"payment_receipt",
			],
		},
		{
			id: "clinical",
			label: "Медкарта и планы",
			icon: <DentalForm043 size={14} className="shrink-0 text-cyan-500" aria-hidden="true" />,
			kinds: [
				"dental_medical_card_043u",
				"orthodontic_medical_card_043_1u",
				"treatment_plan",
				"treatment_plan_acceptance",
				"treatment_cost_estimate",
				"post_visit_recommendations",
				"prescription_medication_order",
			],
		},
		{
			id: "sanpin",
			label: "Справки и СанПиН",
			icon: <Shield size={14} className="shrink-0 text-teal-500" aria-hidden="true" />,
			kinds: [
				"visit_attendance_certificate",
				"radiation_dose_sheet",
				"xray_cbct_referral",
				"lab_work_order",
				"warranty_service_memo",
			],
		},
	];

	// Canonical Dual-Mode: if documents is empty and demo mode is active, showcase sample documents
	const effectiveDocuments = useMemo(() => {
		if (documents && documents.length > 0) return documents;
		if (isDemoShowcaseMode()) return DEMO_SHOWCASE_DOCUMENTS;
		return [];
	}, [documents]);

	// Filter documents by category, search query, and status
	const filteredDocs = useMemo(() => {
		let list = effectiveDocuments;

		// Category filter
		if (activeCategory !== "all") {
			const catObj = categories.find((c) => c.id === activeCategory);
			if (catObj?.kinds) {
				const kindSet = new Set(catObj.kinds);
				list = list.filter((d) => kindSet.has(d.kind));
			}
		}

		// Status filter
		if (activeStatus === "draft") {
			list = list.filter((d) => d.status === "draft");
		} else if (activeStatus === "signed") {
			list = list.filter((d) => d.status === "issued");
		}

		// Search query filter
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter((d) => {
				const title = d.title?.toLowerCase() ?? "";
				const kind = d.kind?.toLowerCase() ?? "";
				const label = (documentLabels?.[d.kind] ?? "").toLowerCase();
				return title.includes(q) || kind.includes(q) || label.includes(q);
			});
		}

		return list;
	}, [effectiveDocuments, activeCategory, activeStatus, searchQuery, documentLabels]);

	// Category counts
	const categoryCounts = useMemo(() => {
		const counts: Record<string, number> = { all: effectiveDocuments.length };
		for (const cat of categories) {
			if (cat.id === "all") continue;
			if (cat.kinds) {
				const set = new Set(cat.kinds);
				counts[cat.id] = effectiveDocuments.filter((d) => set.has(d.kind)).length;
			} else {
				counts[cat.id] = 0;
			}
		}
		return counts;
	}, [effectiveDocuments, categories]);

	const formatRub = (val: number | null | undefined) => {
		if (typeof money === "function") return money(val);
		if (val == null) return "0 ₽";
		return `${val.toLocaleString("ru-RU")} ₽`;
	};

	const formatDate = (val: string | null | undefined) => {
		if (typeof formatShortDate === "function") return formatShortDate(val);
		if (!val) return "—";
		try {
			return new Date(val).toLocaleDateString("ru-RU", {
				day: "numeric",
				month: "short",
			});
		} catch {
			return String(val);
		}
	};

	const renderDocItemIcon = (doc: GeneratedDocument) => {
		const kind = doc.kind;
		if (kind === "paid_medical_services_contract") {
			return (
				<div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-600 dark:text-blue-400">
					<FileText size={18} aria-hidden="true" />
				</div>
			);
		}
		if (
			kind === "informed_consent" ||
			kind === "procedure_specific_consent_packet" ||
			kind === "personal_data_processing_consent"
		) {
			return (
				<div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 bg-teal-500/10 text-teal-600 dark:text-teal-400">
					<ShieldCheck size={18} aria-hidden="true" />
				</div>
			);
		}
		if (kind === "completed_works_act") {
			return (
				<div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
					<FileCheck size={18} aria-hidden="true" />
				</div>
			);
		}
		if (
			kind === "tax_deduction_certificate" ||
			kind === "payment_invoice" ||
			kind === "payment_receipt"
		) {
			return (
				<div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-600 dark:text-amber-400">
					<Receipt size={18} aria-hidden="true" />
				</div>
			);
		}
		if (
			kind === "dental_medical_card_043u" ||
			kind === "orthodontic_medical_card_043_1u"
		) {
			return (
				<div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
					<DentalForm043 size={18} aria-hidden="true" />
				</div>
			);
		}
		return (
			<div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 bg-slate-500/10 text-slate-600 dark:text-slate-400">
				<FileText size={18} aria-hidden="true" />
			</div>
		);
	};

	const handleOpenPreview = (doc: GeneratedDocument) => {
		triggerTactile();
		setPreviewDoc(doc);
	};

	return (
		<div
			className="w-full flex flex-col space-y-3 pb-8 overflow-x-clip"
			data-testid="mobile-documents-hub"
			style={{ maxWidth: "100vw" }}
		>
			{/* 1. TOP HEADER & TELEMETRY */}
			<div className="px-4 pt-1 flex items-center justify-between">
				<div className="min-w-0">
					<h2 className="text-[20px] font-bold text-[var(--ink)] tracking-tight flex items-center gap-2">
						<span>Документы</span>
						<span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line-subtle)]">
							{effectiveDocuments.length}
						</span>
					</h2>
					<div className="text-[12px] text-[var(--muted)] truncate">
						{activePatient ? `Пациент: ${activePatient.fullName}` : "Все пациенты клиники"}
					</div>
				</div>

				{onDirectPrintPrimaryIntake && (
					<button
						type="button"
						onClick={() => {
							triggerTactile();
							onDirectPrintPrimaryIntake();
						}}
						className="mobile-quick-intake-btn active:scale-95 transition-all"
						data-testid="mobile-quick-print-intake-btn"
						aria-label="Печать пакета первичного приёма в 1 клик"
					>
						<Printer size={15} aria-hidden="true" />
						<span>Пакет 1-клик</span>
					</button>
				)}
			</div>

			{/* 2. APPLE-STYLE 1-ROW SEARCH INPUT */}
			<div className="px-4">
				<div className="relative flex items-center w-full">
					<Search
						size={16}
						className="absolute left-3.5 text-[var(--muted)] pointer-events-none"
						aria-hidden="true"
					/>
					<input
						type="search"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск по документам и бланкам..."
						aria-label="Поиск по документам"
						className="mobile-doc-search-input"
						data-testid="mobile-documents-search-input"
					/>
					{searchQuery ? (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="absolute right-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)]"
							aria-label="Очистить поиск"
						>
							<X size={16} aria-hidden="true" />
						</button>
					) : null}
				</div>
			</div>

			{/* 3. HORIZONTAL SCROLLABLE CATEGORY CHIPS (0px text clipping, touch-pan-x) */}
			<div
				className="flex overflow-x-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x gap-2 px-4 py-1"
				role="tablist"
				aria-label="Категории документов"
			>
				{categories.map((cat) => {
					const isActive = activeCategory === cat.id;
					const count = categoryCounts[cat.id] ?? 0;
					return (
						<button
							key={cat.id}
							type="button"
							role="tab"
							aria-selected={isActive}
							onClick={() => {
								triggerTactile();
								setActiveCategory(cat.id);
							}}
							className={`min-h-[40px] px-3.5 py-1.5 rounded-[12px] text-[13px] font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 border transition-all active:scale-95 ${
								isActive
									? "bg-[var(--teal,#0d9488)] text-white border-transparent shadow-sm"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
							}`}
							data-testid={`mobile-chip-${cat.id}`}
						>
							{cat.icon}
							<span>{cat.label}</span>
							<span
								className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
									isActive
										? "bg-white/20 text-white"
										: "bg-[var(--paper-soft)] text-[var(--muted)]"
								}`}
							>
								{count}
							</span>
						</button>
					);
				})}
			</div>

			{/* 4. STATUS SEGMENTED BAR */}
			<div className="px-4">
				<div className="flex w-full p-1 rounded-[14px] bg-[var(--paper-soft)] border border-[var(--line-subtle)] gap-1">
					<button
						type="button"
						onClick={() => setActiveStatus("all")}
						className={`flex-1 min-h-[38px] py-1.5 px-3 rounded-[10px] text-[13px] font-medium transition-all ${
							activeStatus === "all"
								? "bg-[var(--paper)] text-[var(--ink)] font-bold shadow-sm"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="mobile-status-all"
					>
						Все ({filteredDocs.length})
					</button>

					<button
						type="button"
						onClick={() => setActiveStatus("signed")}
						className={`flex-1 min-h-[38px] py-1.5 px-3 rounded-[10px] text-[13px] font-medium transition-all ${
							activeStatus === "signed"
								? "bg-[var(--paper)] text-emerald-600 dark:text-emerald-400 font-bold shadow-sm"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="mobile-status-signed"
					>
						Подписан ПЭП
					</button>

					<button
						type="button"
						onClick={() => setActiveStatus("draft")}
						className={`flex-1 min-h-[38px] py-1.5 px-3 rounded-[10px] text-[13px] font-medium transition-all ${
							activeStatus === "draft"
								? "bg-[var(--paper)] text-amber-600 dark:text-amber-400 font-bold shadow-sm"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="mobile-status-draft"
					>
						Требует подписи
					</button>
				</div>
			</div>

			{/* 5. GROUPED LIST OF DOCUMENT CARDS (Apple Files / Health Style) */}
			<div className="px-4">
				{filteredDocs.length === 0 ? (
					<EmptyState
						title="Документы не найдены"
						description="По заданным фильтрам нет документов. Попробуйте изменить параметры поиска или категорию."
						icon={<FileText size={28} className="text-[var(--muted)]" aria-hidden="true" />}
						className="my-4 py-8"
					/>
				) : (
					<div
						className="rounded-[18px] bg-[var(--paper)] border border-[var(--line)] shadow-sm overflow-hidden divide-y divide-[var(--line-subtle)]"
						role="list"
						aria-label="Список документов"
					>
						{filteredDocs.map((doc) => {
							const isEds = Boolean(doc.doctorSignedAt || doc.cryptoSignaturePkcs7);
							const isDraft = doc.status === "draft";
							const isVoided = doc.status === "voided";
							const docLabel = documentLabels?.[doc.kind] ?? doc.title ?? "Документ";

							return (
								<div
									key={doc.id}
									onClick={() => handleOpenPreview(doc)}
									role="button"
									tabIndex={0}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											handleOpenPreview(doc);
										}
									}}
									className="flex items-center justify-between px-4 py-3.5 min-h-[64px] active:bg-[var(--paper-soft)] cursor-pointer transition-colors"
									data-testid={`mobile-doc-item-${doc.id}`}
									aria-label={`Открыть документ: ${docLabel}`}
								>
									{/* Left: Icon + Text */}
									<div className="flex items-center gap-3 min-w-0 pr-2">
										{renderDocItemIcon(doc)}
										<div className="min-w-0">
											<div className="text-[14.5px] font-semibold text-[var(--ink)] truncate tracking-tight">
												{docLabel}
											</div>
											<div className="text-[12px] text-[var(--muted)] flex items-center gap-1.5 truncate mt-0.5">
												<span>{formatDate(doc.issuedAt || (doc as any).createdAt)}</span>
												{doc.totalAmountRub != null && doc.totalAmountRub > 0 && (
													<>
														<span>·</span>
														<span className="font-bold text-[var(--ink)] font-mono">
															{formatRub(doc.totalAmountRub)}
														</span>
													</>
												)}
												{doc.taxYear && (
													<>
														<span>·</span>
														<span>ФНС {doc.taxYear}</span>
													</>
												)}
											</div>
										</div>
									</div>

									{/* Right: Status Pill & Chevron */}
									<div className="flex items-center gap-2 shrink-0">
										{isEds ? (
											<span
												className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20"
												title="Подписан простой электронной подписью"
											>
												<CheckCircle2 size={12} aria-hidden="true" />
												<span>Подписан ПЭП</span>
											</span>
										) : isDraft ? (
											<span
												className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
												title="Черновик, ожидает подписи"
											>
												<Clock size={12} aria-hidden="true" />
												<span>Требует подписи</span>
											</span>
										) : isVoided ? (
											<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
												<AlertCircle size={12} aria-hidden="true" />
												<span>Аннулирован</span>
											</span>
										) : (
											<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
												<CheckCircle2 size={12} aria-hidden="true" />
												<span>Подписан</span>
											</span>
										)}

										<ChevronRight
											size={16}
											className="text-[var(--muted)] shrink-0"
											aria-hidden="true"
										/>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* 6. FAST PREVIEW & ACTION SHARE SHEET IN NATIVE BOTTOM SHEET */}
			<MobileDocumentPreviewSheet
				document={previewDoc}
				isOpen={Boolean(previewDoc)}
				onClose={() => setPreviewDoc(null)}
				onPrint={(doc) => {
					setPreviewDoc(null);
					void onDownloadPdf(doc.id);
				}}
				onSharePdf={(doc) => {
					setPreviewDoc(null);
					void onDownloadPdf(doc.id);
				}}
				onOpenHtml={(doc) => {
					setPreviewDoc(null);
					void onOpenHtml(doc.id);
				}}
				onViewAuditFacts={(doc) => {
					setPreviewDoc(null);
					void onLoadAuditFacts?.(doc.id);
				}}
				onVerifyAndIssue={(doc) => {
					setPreviewDoc(null);
					onRequestIssue?.(doc);
				}}
				documentLabels={documentLabels}
				documentStatusLabels={documentStatusLabels}
				money={money}
				formatShortDate={formatShortDate}
				activePatientName={activePatient?.fullName}
				activeDoctorName={activeDoctor?.fullName}
			/>
		</div>
	);
}
