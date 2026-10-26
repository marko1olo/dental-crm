import React from "react";
import { CheckCircle2 } from "lucide-react";
import type { DecodedScanResult } from "@dental/shared/hardware";

interface Props {
	scanResult: DecodedScanResult | null;
}

export const ScannerResultCard: React.FC<Props> = ({ scanResult }) => {
	if (!scanResult) {
		return null;
	}

	return (
		<div
			data-testid="scanner-result-card"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "8px",
				padding: "12px",
				background: "var(--paper-soft)",
				border: "1px solid rgba(16, 185, 129, 0.3)",
				borderRadius: "8px",
				fontSize: "12px",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--success, green)", fontWeight: 600 }}>
					<CheckCircle2 size={14} />
					<span>Код успешно классифицирован ({scanResult.barcodeType.toUpperCase()})</span>
				</div>
				<span style={{ fontSize: "11px", color: "var(--muted)" }}>
					Источник: {scanResult.scanSource}
				</span>
			</div>

			{scanResult.parsedGs1 && (
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
						gap: "8px",
						padding: "8px",
						background: "var(--paper)",
						border: "1px solid var(--line)",
						borderRadius: "6px",
					}}
				>
					<div>
						<span style={{ color: "var(--muted)", fontSize: "11px" }}>GTIN товара:</span>
						<div style={{ fontWeight: 600 }}>{scanResult.parsedGs1.gtin || "—"}</div>
					</div>
					<div>
						<span style={{ color: "var(--muted)", fontSize: "11px" }}>Серийный номер (SN):</span>
						<div style={{ fontWeight: 600 }}>{scanResult.parsedGs1.serialNumber || "—"}</div>
					</div>
					<div>
						<span style={{ color: "var(--muted)", fontSize: "11px" }}>Криптохвост:</span>
						<div style={{ fontWeight: 600 }}>
							{scanResult.parsedGs1.cryptoKey || scanResult.parsedGs1.cryptoSignature ? "Присутствует" : "—"}
						</div>
					</div>
					<div>
						<span style={{ color: "var(--muted)", fontSize: "11px" }}>Статус Честный ЗНАК:</span>
						<div style={{ fontWeight: 600, color: "var(--success, green)" }}>
							{scanResult.parsedGs1.isValid ? "Валидный КИЗ (МДЛП)" : "Внутренний штрихкод"}
						</div>
					</div>
				</div>
			)}

			{scanResult.kraftPackageId && (
				<div style={{ padding: "8px", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "6px" }}>
					<span style={{ color: "var(--muted)", fontSize: "11px" }}>Идентификатор упаковки стерилизации:</span>
					<div style={{ fontWeight: 600, color: "var(--success, green)" }}>{scanResult.kraftPackageId}</div>
				</div>
			)}

			{scanResult.patientId && (
				<div style={{ padding: "8px", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "6px" }}>
					<span style={{ color: "var(--muted)", fontSize: "11px" }}>ID пациента в CRM:</span>
					<div style={{ fontWeight: 600, color: "var(--primary)" }}>{scanResult.patientId}</div>
				</div>
			)}
		</div>
	);
};
