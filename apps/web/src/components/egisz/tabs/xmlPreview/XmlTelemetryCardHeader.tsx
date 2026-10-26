/**
 * XmlTelemetryCardHeader.tsx
 * Telemetry header with shield icon, title, subtitle and quiet status badge.
 */

import React from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import type { EgiszDentalSemdCode } from "../../egiszRemdEngine";

export interface XmlTelemetryCardHeaderProps {
	readonly semdDocCode: EgiszDentalSemdCode;
}

export const XmlTelemetryCardHeader: React.FC<XmlTelemetryCardHeaderProps> = ({ semdDocCode }) => {
	const docTitle =
		semdDocCode === "302"
			? "Протокол консультации стоматолога"
			: semdDocCode === "303"
			? "Протокол стоматологического вмешательства"
			: "Медицинская карта приёма";

	return (
		<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
			<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
				<div
					style={{
						width: "40px",
						height: "40px",
						borderRadius: "10px",
						background: "rgba(13, 148, 136, 0.15)",
						color: "var(--teal, #0d9488)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<ShieldCheck size={22} />
				</div>
				<div>
					<h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--ink)" }}>{docTitle}</h3>
					<p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted)" }}>
						Электронный медицинский документ сформирован и готов к фоновой передаче
					</p>
				</div>
			</div>
			<div
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: "0.35rem",
					padding: "0.35rem 0.75rem",
					borderRadius: "20px",
					background: "rgba(16, 185, 129, 0.15)",
					color: "var(--success, #10b981)",
					fontSize: "0.8125rem",
					fontWeight: 700,
				}}
				data-testid="egisz-status-badge"
			>
				<CheckCircle2 size={15} />
				<span>Отправлено в ЕГИСЗ ✓</span>
			</div>
		</div>
	);
};
