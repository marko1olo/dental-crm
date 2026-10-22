/**
 * SigningMainActions.tsx — Primary UKEP buttons (Sign both, doctor, MO, send, defer)
 */

import React from "react";
import { Building2, Clock, Key, Send } from "lucide-react";

export interface SigningMainActionsProps {
	readonly isSigning: boolean;
	readonly isSending: boolean;
	readonly onSignBoth: () => void;
	readonly onSignDocument: () => void;
	readonly onSignMoDocument: () => void;
	readonly onSendToRegistry: () => void;
	readonly onQueueDeferred: () => void;
}

export const SigningMainActions: React.FC<SigningMainActionsProps> = ({
	isSigning,
	isSending,
	onSignBoth,
	onSignDocument,
	onSignMoDocument,
	onSendToRegistry,
	onQueueDeferred,
}) => {
	return (
		<div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
			<button
				type="button"
				onClick={onSignBoth}
				data-testid="egisz-sign-both-one-click-btn"
				className="egisz-btn"
				style={{
					display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.6rem 1.1rem",
					minHeight: "44px", fontSize: "0.8125rem", fontWeight: 700, borderRadius: "6px",
					background: "var(--teal)", color: "var(--ink-inverse)", border: "none",
					cursor: isSigning ? "wait" : "pointer",
				}}
			>
				<Key size={16} />
				{isSigning ? "Выполняется подписание..." : "Подписать пакет (Врач + Клиника в 1 клик)"}
			</button>
			<button
				type="button"
				onClick={onSignDocument}
				data-testid="egisz-sign-doctor-btn"
				className="egisz-btn"
				style={{
					display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.9rem",
					minHeight: "44px", fontSize: "0.8125rem", fontWeight: 600, borderRadius: "6px",
					background: "var(--paper)", color: "var(--ink)", border: "1px solid var(--line)",
					cursor: isSigning ? "wait" : "pointer",
				}}
			>
				<Key size={16} />
				Подписать УКЭП врача
			</button>
			<button
				type="button"
				onClick={onSignMoDocument}
				data-testid="egisz-sign-mo-btn"
				className="egisz-btn"
				style={{
					display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.9rem",
					minHeight: "44px", fontSize: "0.8125rem", fontWeight: 600, borderRadius: "6px",
					background: "var(--paper)", color: "var(--ink)", border: "1px solid var(--line)",
					cursor: isSigning ? "wait" : "pointer",
				}}
			>
				<Building2 size={16} />
				Подписать УКЭП организации
			</button>
			<button
				type="button"
				onClick={onSendToRegistry}
				data-testid="egisz-send-remd-btn"
				className="egisz-btn egisz-btn-primary"
				style={{
					display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.9rem",
					minHeight: "44px", fontSize: "0.8125rem", fontWeight: 700, borderRadius: "6px",
					background: "var(--primary)", color: "var(--ink-inverse)", border: "none",
					cursor: isSending ? "wait" : "pointer",
				}}
			>
				<Send size={16} />
				Отправить в РЭМД ЕГИСЗ
			</button>
			<button
				type="button"
				onClick={onQueueDeferred}
				className="egisz-btn sm"
				style={{
					display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.75rem",
					minHeight: "44px", fontSize: "0.8125rem", fontWeight: 600, borderRadius: "6px",
					border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)", cursor: "pointer",
				}}
			>
				<Clock size={14} />
				Отложить отправку (не блокировать приём)
			</button>
		</div>
	);
};
