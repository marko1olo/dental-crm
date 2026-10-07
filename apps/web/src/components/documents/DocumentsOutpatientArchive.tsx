import { useEffect, useMemo, useState, memo } from "react";
import {
	CheckCircle2,
	Clock,
	FileCode2,
	FileText,
	FolderArchive,
	MoreHorizontal,
	Printer,
	Search,
	ShieldCheck,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import type { GeneratedDocument } from "@dental/shared";
import { renderForm043uHtml } from "@dental/shared";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import {
	DEFAULT_DOM_CHUNK_STEP,
	DEFAULT_DOM_PAGE_SIZE,
	sliceDomList,
} from "../../utils/domVirtualizationHelper";
import { printPrimaryIntakePackage } from "./primaryIntakePackagePrintEngine";

interface OutpatientDocumentCardProps {
	doc: GeneratedDocument;
	isDropdownOpen: boolean;
	onToggleDropdown: () => void;
	onOpen: () => void;
	onPrint: () => void;
	onDownloadHtml?: (() => void) | undefined;
}

const OutpatientDocumentCard = memo<OutpatientDocumentCardProps>(({
	doc,
	isDropdownOpen,
	onToggleDropdown,
	onOpen,
	onPrint,
	onDownloadHtml,
}) => {
	const isSigned = doc.status === "issued";
	const isDraft = doc.status === "draft";
	const stampText = isSigned
		? "ПОДПИСАНО ВРАЧОМ"
		: isDraft
			? "ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП"
			: "АННУЛИРОВАН";

	return (
		<div
			data-testid={`archive-document-card-${doc.id}`}
			className="archive-document-card"
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				padding: "10px 14px",
				background: "var(--paper, #ffffff)",
				border: "1px solid var(--line, #e2e8f0)",
				borderRadius: "10px",
				gap: "12px",
				flexWrap: "wrap",
				contentVisibility: "auto",
				containIntrinsicSize: "1px 64px",
				contain: "paint layout",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
				{isSigned ? (
					<CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
				) : (
					<Clock size={18} className="text-amber-500 shrink-0" />
				)}
				<div style={{ minWidth: 0 }}>
					<div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
						<span style={{ fontWeight: 700, fontSize: "13px", color: "var(--ink, #0f172a)" }}>
							{doc.title || doc.kind}
						</span>
						<span
							data-testid={`stamp-badge-${doc.id}`}
							style={{
								fontSize: "11px",
								fontWeight: 800,
								textTransform: "uppercase",
								padding: "2px 6px",
								borderRadius: "4px",
								letterSpacing: "0.04em",
								background: isSigned ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
								color: isSigned ? "#059669" : "#d97706",
								border: `1px solid ${isSigned ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
							}}
						>
							{stampText}
						</span>
					</div>
					<p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "var(--muted, #64748b)" }}>
						ID: {doc.id} · Дата: {doc.issuedAt ? new Date(doc.issuedAt).toLocaleDateString("ru-RU") : "Черновик"}
					</p>
				</div>
			</div>

			{/* Max 2 direct action buttons + context menu (...) per Miller's Law / 7 sins */}
			<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
				<button
					type="button"
					data-testid={`archive-open-btn-${doc.id}`}
					onClick={onOpen}
					className="min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-medium rounded-lg secondary-button inline-flex items-center gap-1.5 cursor-pointer"
					title="Открыть документ"
				>
					<FileText size={14} className="shrink-0" />
					<span>Открыть</span>
				</button>

				<button
					type="button"
					data-testid={`archive-print-btn-${doc.id}`}
					onClick={onPrint}
					className="min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-semibold rounded-lg primary-button inline-flex items-center gap-1.5 cursor-pointer"
					title="Печать или сохранение PDF"
				>
					<Printer size={14} className="shrink-0" />
					<span>Печать</span>
				</button>

				{/* Context Menu Trigger for secondary actions */}
				<div style={{ position: "relative" }}>
					<button
						type="button"
						data-testid={`archive-more-btn-${doc.id}`}
						onClick={onToggleDropdown}
						className="min-h-[44px] sm:min-h-8 sm:h-8 w-8 sm:w-8 px-0 flex items-center justify-center rounded-lg secondary-button cursor-pointer"
						title="Дополнительные действия"
						aria-expanded={isDropdownOpen}
					>
						<MoreHorizontal size={15} />
					</button>

					{isDropdownOpen && (
						<div
							data-testid={`archive-context-menu-${doc.id}`}
							style={{
								position: "absolute",
								right: 0,
								top: "100%",
								marginTop: "4px",
								background: "var(--paper, #ffffff)",
								border: "1px solid var(--line, #e2e8f0)",
								borderRadius: "8px",
								boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
								zIndex: 20,
								minWidth: "160px",
								padding: "4px",
							}}
						>
							<button
								type="button"
								style={{
									width: "100%",
									textAlign: "left",
									padding: "8px 10px",
									fontSize: "12px",
									background: "none",
									border: "none",
									borderRadius: "6px",
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									gap: "6px",
								}}
								onClick={onDownloadHtml}
							>
								<FileCode2 size={14} />
								<span>Скачать HTML</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
});
OutpatientDocumentCard.displayName = "OutpatientDocumentCard";

export interface DocumentsOutpatientArchiveProps {
	patientId?: string;
	onOpenDocument?: (documentId: string) => void;
	onPrintDocument?: (documentId: string) => void;
	onOpenBlankContract?: () => void;
	onOpenBlankConsent?: () => void;
	onOpenBlankForm043?: () => void;
	className?: string;
}

export const DocumentsOutpatientArchive: React.FC<DocumentsOutpatientArchiveProps> = ({
	patientId,
	onOpenDocument,
	onPrintDocument,
	onOpenBlankContract,
	onOpenBlankConsent,
	onOpenBlankForm043,
	className = "",
}) => {
	let appLogic: any = null;
	try {
		appLogic = useAppLogicContext();
	} catch {
		// safe fallback when outside context
	}

	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "issued" | "voided">("all");
	const [activeDropdownDocId, setActiveDropdownDocId] = useState<string | null>(null);
	const [displayLimit, setDisplayLimit] = useState(DEFAULT_DOM_PAGE_SIZE);

	const activePatient = appLogic?.activePatient;
	const activeDoctor = appLogic?.activeDoctor;
	const allDocuments: GeneratedDocument[] = appLogic?.activeDocuments || [];

	const filteredDocuments = useMemo(() => {
		return allDocuments.filter((doc) => {
			if (patientId && doc.patientId !== patientId) return false;
			if (statusFilter !== "all" && doc.status !== statusFilter) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const title = (doc.title || doc.kind || "").toLowerCase();
				const id = (doc.id || "").toLowerCase();
				return title.includes(q) || id.includes(q);
			}
			return true;
		});
	}, [allDocuments, patientId, statusFilter, searchQuery]);

	// Reset pagination limit when filters change
	useEffect(() => {
		setDisplayLimit(DEFAULT_DOM_PAGE_SIZE);
	}, [patientId, statusFilter, searchQuery]);

	// Memory-bounded slice of documents to prevent DOM bloat and pagefile.sys thrashing (Mandate 8e & Low-Spec PC)
	const documentSlice = useMemo(() => {
		return sliceDomList(filteredDocuments, displayLimit, 0);
	}, [filteredDocuments, displayLimit]);

	// 1-Click Quick Blank Print Handlers (Mandates 8e, 8k, 8n)
	const handlePrintBlankContract = () => {
		if (onOpenBlankContract) {
			onOpenBlankContract();
			return;
		}
		printPrimaryIntakePackage({
			patient: activePatient
				? {
						fullName: activePatient.fullName || "",
						birthDate: activePatient.birthDate,
						phone: activePatient.phone,
					}
				: null,
			clinic: {
				clinicName: appLogic?.dashboard?.clinicSettings?.profile?.clinicName || "ООО «Денте»",
				legalName: "ООО «Денте»",
				fullName: "ООО «Денте»",
				inn: (appLogic?.dashboard?.organization as { inn?: string } | undefined)?.inn || "",
			},
			doctorFullName: activeDoctor?.fullName || "",
		});
	};

	const handlePrintBlankConsent = () => {
		if (onOpenBlankConsent) {
			onOpenBlankConsent();
			return;
		}
		printPrimaryIntakePackage({
			patient: activePatient
				? {
						fullName: activePatient.fullName || "",
						birthDate: activePatient.birthDate,
						phone: activePatient.phone,
					}
				: null,
			clinic: {
				clinicName: appLogic?.dashboard?.clinicSettings?.profile?.clinicName || "ООО «Денте»",
				legalName: "ООО «Денте»",
				fullName: "ООО «Денте»",
				inn: (appLogic?.dashboard?.organization as { inn?: string } | undefined)?.inn || "",
			},
			doctorFullName: activeDoctor?.fullName || "",
		});
	};

	const handlePrintBlankForm043 = () => {
		if (onOpenBlankForm043) {
			onOpenBlankForm043();
			return;
		}
		if (typeof window !== "undefined") {
			const blankHtml = renderForm043uHtml({
				medicalCardNumber: activePatient?.cardNumber || "__________",
				cardOpenedDate: "«___» _________ 20___ г.",
				patientFullName: activePatient?.fullName || "________________________________________________________",
				patientBirthDate: activePatient?.birthDate || "«___» _________ _____ г.",
				patientPhone: activePatient?.phone || "+7 (___) ___-__-__",
				patientAddressRegistration: "________________________________________________________",
				chiefComplaint: "________________________________________________________",
				historyOfPresentIllness: "________________________________________________________",
				allergologicalHistory: "________________________________________________________",
				concomitantDiseases: "________________________________________________________",
				attendingDoctorFullName: activeDoctor?.fullName || "________________________",
				isClosed: false,
				watermarkText: "ЧЕРНОВИК (БЛАНК)",
			});
			const printWindow = window.open("", "_blank");
			if (printWindow) {
				printWindow.document.write(blankHtml);
				printWindow.document.close();
				printWindow.focus();
				printWindow.print();
			} else {
				window.print();
			}
		}
	};

	const handleOpenLatest = () => {
		const latest = filteredDocuments[0] || allDocuments[0];
		if (latest) {
			if (onOpenDocument) {
				onOpenDocument(latest.id);
			} else if (appLogic?.openIssuedDocumentHtml) {
				appLogic.openIssuedDocumentHtml(latest.id);
			}
		}
	};

	return (
		<div className={`outpatient-archive-container ${className}`} data-testid="outpatient-documents-archive">
			{/* Top Autonomy Quick Toolbar (Mandate 8e: print blanks in 1 click without 403) */}
			<div
				className="archive-quick-toolbar"
				style={{
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "10px",
					padding: "12px 16px",
					background: "var(--paper-soft, #f8fafc)",
					border: "1px solid var(--line, #e2e8f0)",
					borderRadius: "12px",
					marginBottom: "16px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
					<span
						style={{
							fontSize: "12px",
							fontWeight: 700,
							color: "var(--ink, #0f172a)",
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
						}}
					>
						<Sparkles size={16} className="text-teal-600 dark:text-teal-400" />
						Печать чистых бланков («________»):
					</span>

					<button
						type="button"
						data-testid="archive-quick-blank-contract-btn"
						onClick={handlePrintBlankContract}
						className="min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-medium rounded-lg secondary-button inline-flex items-center gap-1.5 cursor-pointer"
						title="Распечатать чистый бланк договора на медицинские услуги со строками «________» для ручного заполнения"
					>
						<Printer size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Бланк договора</span>
					</button>

					<button
						type="button"
						data-testid="archive-quick-blank-consent-btn"
						onClick={handlePrintBlankConsent}
						className="min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-medium rounded-lg secondary-button inline-flex items-center gap-1.5 cursor-pointer"
						title="Распечатать чистый бланк информированного согласия на лечение со строками «________» для ручного заполнения"
					>
						<FileText size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Бланк согласия</span>
					</button>

					<button
						type="button"
						data-testid="archive-quick-blank-form043-btn"
						onClick={handlePrintBlankForm043}
						className="min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-medium rounded-lg secondary-button inline-flex items-center gap-1.5 cursor-pointer"
						title="Распечатать чистую амбулаторную медкарту со строками «________» и зубной формулой FDI"
					>
						<ShieldCheck size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Бланк медкарты</span>
					</button>
				</div>

				<button
					type="button"
					data-testid="archive-quick-open-latest-btn"
					onClick={handleOpenLatest}
					className="min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-semibold text-teal-700 dark:text-teal-300 rounded-lg secondary-button inline-flex items-center gap-1.5 cursor-pointer"
					title="Открыть последний документ в архиве"
				>
					<Zap size={14} className="text-amber-500 shrink-0" />
					<span>Открыть последний</span>
				</button>
			</div>

			{/* Search & Filter Row */}
			<div
				className="archive-search-filter-row"
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "10px",
					marginBottom: "12px",
					flexWrap: "wrap",
				}}
			>
				<div className="dente-search-wrap" style={{ minWidth: "240px", flex: 1 }}>
					<Search size={14} className="dente-search-icon" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск по архиву документов..."
						className="dente-search-input"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="dente-search-clear"
							aria-label="Очистить поиск"
						>
							<X size={13} />
						</button>
					)}
				</div>

				<div className="dente-segmented-bar">
					{(
						[
							{ id: "all", label: "Все" },
							{ id: "draft", label: "Черновики" },
							{ id: "issued", label: "Подписано / Выдано" },
						] as const
					).map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setStatusFilter(tab.id)}
							className={`dente-segmented-item ${statusFilter === tab.id ? "active" : ""}`}
							data-active={statusFilter === tab.id}
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>

			{/* Documents List */}
			{filteredDocuments.length === 0 ? (
				<div
					data-testid="archive-empty-state"
					style={{
						padding: "32px 16px",
						textAlign: "center",
						background: "var(--paper-soft, #f8fafc)",
						border: "1px dashed var(--line, #cbd5e1)",
						borderRadius: "12px",
						color: "var(--muted, #64748b)",
					}}
				>
					<FolderArchive size={32} style={{ margin: "0 auto 8px auto", opacity: 0.6 }} />
					<p style={{ margin: 0, fontSize: "13px", fontWeight: 600 }}>В архиве нет документов по выбранному фильтру</p>
					<p style={{ margin: "4px 0 0 0", fontSize: "12px" }}>
						Воспользуйтесь кнопками выше для моментальной печати чистых бланков («________»)
					</p>
				</div>
			) : (
				<div className="archive-cards-list" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
					{documentSlice.visibleItems.map((doc) => (
						<OutpatientDocumentCard
							key={doc.id}
							doc={doc}
							isDropdownOpen={activeDropdownDocId === doc.id}
							onToggleDropdown={() => setActiveDropdownDocId(activeDropdownDocId === doc.id ? null : doc.id)}
							onOpen={() => {
								if (onOpenDocument) onOpenDocument(doc.id);
								else if (appLogic?.openIssuedDocumentHtml) appLogic.openIssuedDocumentHtml(doc.id);
							}}
							onPrint={() => {
								if (onPrintDocument) onPrintDocument(doc.id);
								else if (appLogic?.downloadIssuedDocumentPdf) appLogic.downloadIssuedDocumentPdf(doc.id);
							}}
							onDownloadHtml={() => {
								setActiveDropdownDocId(null);
								if (appLogic?.downloadIssuedDocumentHtml) appLogic.downloadIssuedDocumentHtml(doc.id);
							}}
						/>
					))}

					{/* Progressive pagination controls for long document lists (100+ documents) */}
					{documentSlice.hasMore && (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "8px",
								marginTop: "12px",
								padding: "8px 0",
							}}
						>
							<button
								type="button"
								data-testid="archive-load-more-btn"
								onClick={() => setDisplayLimit((prev) => prev + DEFAULT_DOM_CHUNK_STEP)}
								className="min-h-[44px] sm:min-h-8 sm:h-8 px-4 text-[13px] font-medium rounded-lg secondary-button cursor-pointer inline-flex items-center gap-1.5"
							>
								<span>Показать ещё ({documentSlice.remainingCount} из {documentSlice.totalCount})</span>
							</button>

							<button
								type="button"
								data-testid="archive-load-all-btn"
								onClick={() => setDisplayLimit(documentSlice.totalCount)}
								className="min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-medium rounded-lg ghost-button cursor-pointer"
							>
								<span>Показать все</span>
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default DocumentsOutpatientArchive;
