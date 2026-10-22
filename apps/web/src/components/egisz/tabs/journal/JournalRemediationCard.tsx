/**
 * JournalRemediationCard.tsx — Remediation guide for statutory validation errors
 */

import React from "react";
import { AlertCircle } from "lucide-react";
import type { RemdDocumentRecord, RemdDocumentStatus } from "../../egiszJournalData";

export interface JournalRemediationCardProps {
	readonly selectedRecord: RemdDocumentRecord | undefined;
	readonly journalFilter: RemdDocumentStatus | "all";
}

export const JournalRemediationCard: React.FC<JournalRemediationCardProps> = ({
	selectedRecord,
	journalFilter,
}) => {
	const shouldShow =
		selectedRecord?.validationError ||
		journalFilter === "error" ||
		selectedRecord?.status === "error" ||
		selectedRecord?.status === "rejected_by_egisz";

	if (!shouldShow) return null;

	return (
		<div style={{ padding: "1rem", borderRadius: "8px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
			<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "var(--danger)", fontSize: "0.875rem" }}>
				<AlertCircle size={18} />
				Ошибка валидации РЭМД: {selectedRecord?.validationError?.errorCode || "ERR_FRMR_SNILS_NOT_FOUND"}
			</div>
			<div style={{ fontSize: "0.8125rem", color: "var(--ink)", marginTop: "0.25rem" }}>
				{selectedRecord?.validationError?.errorMessage || "СНИЛС врача (112-233-445 00) не найден в Федеральном регистре медицинских работников (ФРМР)."}
			</div>
			<div style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--ink)", marginTop: "0.35rem" }}>
				Инструкция по устранению ошибки:
			</div>
			<p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--muted)", marginTop: "0.2rem", lineHeight: 1.5 }}>
				{selectedRecord?.validationError?.actionableHint || "Проверьте правильность ввода СНИЛС врача в справочнике сотрудников клиники. Врач должен быть зарегистрирован в подсистеме ФРМР ЕГИСЗ Минздрава РФ с подтвержденной специальностью."}
			</p>
		</div>
	);
};
