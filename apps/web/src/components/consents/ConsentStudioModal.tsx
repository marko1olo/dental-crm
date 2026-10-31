/**
 * apps/web/src/components/consents/ConsentStudioModal.tsx
 *
 * Каноническая студия информированных согласий и медицинских договоров DENTE CRM (SSOT).
 * Декомпозирована на специализированные sweet-spot модули (Мандат 8b/8zi):
 *   - studio/ConsentSignaturePad.tsx — сенсорный холст подписи пальцем/стилусом (Apple HIG)
 *   - studio/ConsentDocumentViewer.tsx — окно предпросмотра бланка с хешем целостности
 *   - studio/ConsentBatchSignActions.tsx — панель реестра и пакетного выбора документов
 * Пакетная подпись в 1 клик (Мандаты 8e, 8n), ровно 1 Primary CTA кнопка (#0d9488, Мандат 8am).
 */

import React, { useState, useEffect } from "react";
import { ShieldCheck, Printer, X, UserCheck } from "lucide-react";
import {
	CANONICAL_CONSENT_CATALOG,
	type ConsentDocumentId,
	type ConsentSignStatus,
	type ConsentPartyContext,
	getConsentDocumentById,
	generateConsentPrintHtml,
	computeConsentIntegrityHash,
} from "./consentCatalogData";
import { ConsentSignaturePad } from "./studio/ConsentSignaturePad";
import { ConsentDocumentViewer, type DocumentSignRecord } from "./studio/ConsentDocumentViewer";
import { ConsentBatchSignActions } from "./studio/ConsentBatchSignActions";

export interface ConsentStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientContext?: Partial<ConsentPartyContext>;
	readonly initialDocId?: ConsentDocumentId;
	readonly initialSelectedIds?: readonly ConsentDocumentId[];
	readonly onDocumentSigned?: (payload: {
		docIds: ConsentDocumentId[];
		status: ConsentSignStatus;
		signatureSvg?: string;
		signedAt: string;
		integrityHash: string;
	}) => void;
}

export const ConsentStudioModal: React.FC<ConsentStudioModalProps> = ({
	isOpen,
	onClose,
	patientContext,
	initialDocId = "therapy",
	initialSelectedIds,
	onDocumentSigned,
}) => {
	const defaultSelection: ConsentDocumentId[] = initialSelectedIds
		? [...initialSelectedIds]
		: ["therapy", "personal_data", "anesthesia", "paid_contract"];

	const [selectedIds, setSelectedIds] = useState<Set<ConsentDocumentId>>(new Set(defaultSelection));
	const [activeDocId, setActiveDocId] = useState<ConsentDocumentId>(initialDocId);
	const [signRecords, setSignRecords] = useState<Record<string, DocumentSignRecord>>({});
	const [isPaperChecked, setIsPaperChecked] = useState<boolean>(false);
	const [signatureSvg, setSignatureSvg] = useState<string>("");
	const [toastMsg, setToastMsg] = useState<string | null>(null);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const activeDoc = getConsentDocumentById(activeDocId);
	const currentRecord: DocumentSignRecord = signRecords[activeDocId] || { status: "pending" };

	const handleBatchSign = () => {
		const nowStr = new Date().toLocaleString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
		const status: ConsentSignStatus = isPaperChecked || !signatureSvg ? "signed_paper" : "signed_digital";
		const pName = patientContext?.patientName || "Пациент клиники";
		const targetDocs = selectedIds.size > 0 ? Array.from(selectedIds) : [activeDocId];
		const updated = { ...signRecords };

		for (const docId of targetDocs) {
			const hash = computeConsentIntegrityHash(docId, pName, nowStr, signatureSvg || "PAPER-ARCHIVE");
			updated[docId] = { status, signedAt: nowStr, signatureSvg: signatureSvg || undefined, integrityHash: hash };
		}
		setSignRecords(updated);

		const firstHash = updated[targetDocs[0]]?.integrityHash || "DENTE-SSOT";
		onDocumentSigned?.({
			docIds: targetDocs,
			status,
			signatureSvg: signatureSvg || undefined,
			signedAt: nowStr,
			integrityHash: firstHash,
		});

		setToastMsg(
			status === "signed_paper"
				? `✓ Пакет из ${targetDocs.length} бланков зафиксирован на бумаге`
				: `✓ Пакет из ${targetDocs.length} бланков подписан электронной подписью`,
		);
		setTimeout(() => setToastMsg(null), 3500);
	};

	const handlePrintDoc = () => {
		const html = generateConsentPrintHtml(activeDoc, patientContext, currentRecord);
		const win = window.open("", "_blank");
		if (win) {
			win.document.write(html);
			win.document.close();
			win.focus();
			setTimeout(() => win.print(), 200);
		}
	};

	const toggleDocSelected = (id: ConsentDocumentId) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const toggleAllSelected = () => {
		setSelectedIds(
			selectedIds.size === CANONICAL_CONSENT_CATALOG.length
				? new Set()
				: new Set(CANONICAL_CONSENT_CATALOG.map((d) => d.id)),
		);
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4 overflow-x-clip"
			role="dialog"
			aria-modal="true"
			aria-labelledby="consent-studio-title"
			onClick={onClose}
		>
			<div
				className="relative w-full max-w-5xl max-h-[92vh] md:max-h-[88vh] flex flex-col bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-t-[24px] md:rounded-2xl border border-[var(--line,#e2e8f0)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Apple HIG тактильный хэндл для смартфонов (36x5px) */}
				<div className="flex md:hidden w-full justify-center pt-2.5 pb-1">
					<div className="w-9 h-1.5 rounded-full bg-[var(--line,#cbd5e1)] opacity-70" aria-hidden="true" />
				</div>

				{/* Шапка студии (Мандат 8am: компактная, без визуального мусора) */}
				<header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#f8fafc)] shrink-0">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] shrink-0">
							<ShieldCheck size={18} aria-hidden="true" />
						</div>
						<div className="min-w-0">
							<h1 id="consent-studio-title" className="text-sm md:text-lg font-semibold tracking-tight text-[var(--ink,#0f172a)] truncate">
								<span className="md:hidden">Согласия и договоры</span>
								<span className="hidden md:inline">Студия информированных согласий и договоров</span>
							</h1>
							<p className="text-xs text-[var(--ink-muted,#64748b)] hidden sm:block truncate">
								{patientContext?.patientName ? `Пациент: ${patientContext.patientName}` : "Пакетное электронное и бумажное подписание медицинских документов"}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={handlePrintDoc}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] text-xs font-medium text-[var(--ink,#0f172a)] transition-colors shadow-2xs min-h-[44px] md:min-h-[36px] cursor-pointer"
							title="Распечатать бланк А4"
						>
							<Printer size={15} aria-hidden="true" />
							<span className="hidden sm:inline">Печать бланка А4</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="flex items-center justify-center w-9 h-9 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink-muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors min-h-[44px] min-w-[44px] md:min-h-[36px] md:min-w-[36px] cursor-pointer"
							title="Закрыть студию"
							aria-label="Закрыть"
						>
							<X size={18} aria-hidden="true" />
						</button>
					</div>
				</header>

				{/* 2-колоночный рабочий стол студии */}
				<div className="flex-1 overflow-y-auto flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[var(--line,#e2e8f0)] min-h-0">
					<ConsentBatchSignActions
						documents={CANONICAL_CONSENT_CATALOG}
						activeDocId={activeDocId}
						selectedIds={selectedIds}
						signRecords={signRecords}
						onSelectDoc={setActiveDocId}
						onToggleSelected={toggleDocSelected}
						onToggleAll={toggleAllSelected}
					/>

					<main className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col gap-5 min-h-0">
						<ConsentDocumentViewer
							doc={activeDoc}
							record={currentRecord}
							patientContext={patientContext}
						/>

						<ConsentSignaturePad
							isPaperChecked={isPaperChecked}
							onPaperCheckChange={setIsPaperChecked}
							signatureSvg={signatureSvg}
							onSignatureChange={setSignatureSvg}
							selectedCount={selectedIds.size}
						/>
					</main>
				</div>

				{/* Floating Bottom Bar (Apple HIG Thumb Zone, ровно 1 Primary CTA кнопка #0d9488) */}
				<footer className="sticky bottom-0 z-10 flex items-center justify-between px-4 md:px-6 py-3 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#ffffff)]/95 backdrop-blur-md shrink-0">
					<div className="text-xs text-[var(--ink-muted,#64748b)] hidden sm:block">
						{toastMsg ? (
							<span className="text-emerald-600 dark:text-emerald-400 font-medium">{toastMsg}</span>
						) : (
							<span>Мандат 8e: подписание в 1 клик. Кнопка никогда не блокируется.</span>
						)}
					</div>

					<div className="flex items-center gap-3 w-full sm:w-auto justify-end">
						<button
							type="button"
							onClick={handleBatchSign}
							className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold bg-[var(--teal,#0d9488)] hover:bg-[#0f766e] text-white shadow-sm transition-all active:scale-[0.99] cursor-pointer border-0"
							title="Утвердить и подписать выбранный пакет документов"
						>
							<UserCheck size={18} aria-hidden="true" />
							<span>✓ Подписать пакет согласий</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default ConsentStudioModal;
