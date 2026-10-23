import React from "react";
import type { ConsentSubstitutionContext } from "../consentTemplates.js";
import { ConsentSignaturesQrBar } from "./ConsentSignaturesQrBar";

export interface ConsentSignaturesBlockProps {
	cleanContext: ConsentSubstitutionContext;
	isClosedOrSigned: boolean;
	qrSvg: string;
}

export const ConsentSignaturesBlock: React.FC<ConsentSignaturesBlockProps> = ({
	cleanContext,
	isClosedOrSigned,
	qrSvg,
}) => {
	return (
		<div
			className="consent-print-signatures-block"
			style={{
				marginTop: "1.5rem",
				paddingTop: "1rem",
				borderTop: "1px solid var(--line)",
				display: "flex",
				flexDirection: "column",
				gap: "0.85rem",
				pageBreakInside: "avoid",
				breakInside: "avoid",
				pageBreakBefore: "auto",
			}}
		>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: "1.5rem",
				}}
			>
				<div>
					<div
						style={{
							fontSize: "11px",
							fontWeight: "bold",
							textTransform: "uppercase",
							color: "var(--muted)",
							marginBottom: "4px",
						}}
					>
						Пациент (законный представитель):
					</div>
					<div style={{ fontSize: "12px", color: "var(--ink)", wordBreak: "break-word" }}>
						Подпись: __________________ / {cleanContext.patientName} /
					</div>
					{!isClosedOrSigned ? (
						<div
							style={{
								fontSize: "11px",
								color: "var(--amber-dark, #b45309)",
								fontStyle: "italic",
								marginTop: "3px",
							}}
							data-testid="sheet-status-unsigned"
						>
							Статус: Не подписан (требуется роспись пациента на бланке или планшете)
						</div>
					) : (
						<div
							style={{
								fontSize: "11px",
								color: "var(--ok-fg, #059669)",
								fontWeight: 600,
								marginTop: "3px",
							}}
							data-testid="sheet-status-signed"
						>
							Статус: Подписан и заверен (подшит в архив медицинской карты)
						</div>
					)}
				</div>
				<div>
					<div
						style={{
							fontSize: "11px",
							fontWeight: "bold",
							textTransform: "uppercase",
							color: "var(--muted)",
							marginBottom: "4px",
						}}
					>
						Лечащий врач-стоматолог:
					</div>
					<div style={{ fontSize: "12px", color: "var(--ink)", wordBreak: "break-word" }}>
						Подпись: __________________ / {cleanContext.doctorName} /
					</div>
				</div>
			</div>
			<ConsentSignaturesQrBar
				cleanDate={cleanContext.date ?? undefined}
				cleanClinicName={cleanContext.clinicName ?? undefined}
				qrSvg={qrSvg}
			/>
		</div>
	);
};
