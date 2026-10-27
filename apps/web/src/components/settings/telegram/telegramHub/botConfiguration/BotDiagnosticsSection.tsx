import React from "react";
import { ExternalLink } from "lucide-react";
import type { BotInfo } from "./botConfigTypes";

interface BotDiagnosticsSectionProps {
	botUsername: string;
	effectiveBot: BotInfo;
}

export function BotDiagnosticsSection({
	botUsername,
	effectiveBot,
}: BotDiagnosticsSectionProps) {
	return (
		<div className="tg-info-grid">
			<div className="tg-info-item">
				<span className="tg-info-label">Юзернейм бота</span>
				<a
					href={`https://t.me/${botUsername}`}
					target="_blank"
					rel="noreferrer"
					className="tg-profile-link tg-info-value"
					style={{ minHeight: "28px", display: "inline-flex", alignItems: "center", gap: "4px" }}
				>
					<span>@{botUsername}</span>
					<ExternalLink size={12} />
				</a>
			</div>
			<div className="tg-info-item">
				<span className="tg-info-label">Имя бота</span>
				<span className="tg-info-value">{effectiveBot.firstName || "Стоматология DENTE"}</span>
			</div>
			<div className="tg-info-item">
				<span className="tg-info-label">Зашифрованный токен</span>
				<span className="tg-info-value" style={{ fontFamily: "monospace" }}>
					{effectiveBot.tokenMasked || "••••••••••••••••••••••••••••••••"}
				</span>
			</div>
			<div className="tg-info-item">
				<span className="tg-info-label">Возможности и права</span>
				<span className="tg-info-value">
					Группы: {effectiveBot.canJoinGroups ? "Да" : "—"} • Чтение:{" "}
					{effectiveBot.canReadAllGroupMessages ? "Да" : "—"} • Inline:{" "}
					{effectiveBot.supportsInlineQueries ? "Да" : "—"}
				</span>
			</div>
		</div>
	);
}
