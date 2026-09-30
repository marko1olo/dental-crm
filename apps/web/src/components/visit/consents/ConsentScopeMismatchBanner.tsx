import React from "react";
import { AlertTriangle, FileText, Check } from "lucide-react";
import type { ConsentScopeMismatchResult } from "../../consents/consentSummaryHelper";

export interface ConsentScopeMismatchBannerProps {
	readonly mismatch: ConsentScopeMismatchResult;
	readonly onFormAddendumConsent: () => void;
	readonly onMarkAddendumSigned: () => void;
}

export function ConsentScopeMismatchBanner({
	mismatch,
	onFormAddendumConsent,
	onMarkAddendumSigned,
}: ConsentScopeMismatchBannerProps) {
	if (!mismatch.hasMismatch) return null;

	return (
		<div
			className="vct-scope-mismatch-banner"
			data-testid="banner-consent-scope-mismatch"
		>
			<div className="vct-package-info">
				<div
					className="vct-package-icon-box"
					style={{
						background: "rgba(217, 119, 6, 0.18)",
						color: "var(--amber, #d97706)",
					}}
				>
					<AlertTriangle size={20} />
				</div>
				<div>
					<div
						style={{
							fontSize: "13.5px",
							fontWeight: 700,
							color: "var(--amber-dark, #b45309)",
							display: "flex",
							alignItems: "center",
							gap: "6px",
							flexWrap: "wrap",
						}}
					>
						<span>{mismatch.warningTitle}</span>
						<span
							style={{
								fontSize: "10.5px",
								fontWeight: 600,
								padding: "1px 6px",
								borderRadius: "4px",
								background: "rgba(217, 119, 6, 0.15)",
								color: "var(--amber, #d97706)",
							}}
						>
							Врачебная автономия
						</span>
					</div>
					<div className="vct-package-desc" style={{ marginTop: "4px" }}>
						В плане приёма выявлены инвазивные процедуры:{" "}
						<strong>{mismatch.uncoveredProcedureNames.join(", ")}</strong>. Ранее подписанные пациентом согласия не покрывают эти вмешательства. Программа не блокирует оказание помощи (врачебная автономия), но фиксирует юридический риск ст. 20 323-ФЗ.
					</div>
				</div>
			</div>
			<div className="vct-package-actions">
				<button
					type="button"
					onClick={onFormAddendumConsent}
					data-testid="btn-create-addendum-consent"
					className="vct-btn vct-btn-primary"
					style={{
						background: "var(--amber, #d97706)",
						borderColor: "var(--amber-dark, #b45309)",
						color: "#ffffff",
						fontWeight: 700,
					}}
					title="1-клик: сформировать дополнительное согласие на новые процедуры и отправить на печать"
				>
					<FileText size={14} />
					<span>{mismatch.suggestedActionLabel}</span>
				</button>
				<button
					type="button"
					onClick={onMarkAddendumSigned}
					className="vct-btn vct-btn-secondary"
					title="Отметить доп. согласие на бумаге подписанным пациентом"
				>
					<Check size={14} />
					<span>Отметить на бумаге</span>
				</button>
			</div>
		</div>
	);
}
