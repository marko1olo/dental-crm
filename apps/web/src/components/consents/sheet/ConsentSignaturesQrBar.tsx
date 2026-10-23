import React from "react";

export interface ConsentSignaturesQrBarProps {
	cleanDate?: string | undefined;
	cleanClinicName?: string | undefined;
	qrSvg: string;
}

export const ConsentSignaturesQrBar: React.FC<ConsentSignaturesQrBarProps> = ({
	cleanDate,
	cleanClinicName,
	qrSvg,
}) => {
	return (
		<div
			style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				fontSize: "11px",
				color: "var(--muted)",
				flexWrap: "wrap",
				gap: "12px",
				marginTop: "4px",
				paddingTop: "8px",
				borderTop: "1px dashed var(--line)",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
				<div
					dangerouslySetInnerHTML={{ __html: qrSvg }}
					style={{ width: 48, height: 48, flexShrink: 0 }}
					title="QR-код верификации документа"
				/>
				<div style={{ fontSize: "10px", lineHeight: "1.3", color: "var(--muted)" }}>
					<span style={{ fontWeight: 600, color: "var(--ink)", display: "block" }}>
						Электронный архив клиники • Контроль целостности
					</span>
					<span>Медицинская карта стоматологического пациента</span>
				</div>
			</div>
			<div style={{ textAlign: "right", fontSize: "10px" }}>
				<div>Дата: {cleanDate}</div>
				<div>Клиника: {cleanClinicName}</div>
			</div>
		</div>
	);
};
