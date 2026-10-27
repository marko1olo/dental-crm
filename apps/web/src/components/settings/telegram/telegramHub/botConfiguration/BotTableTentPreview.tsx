import React from "react";
import { generateQrCodeSvg } from "@dental/shared";
import type { TableTentFormat } from "./botConfigTypes";

interface BotTableTentPreviewProps {
	format: TableTentFormat;
	patientBotLink: string;
	botUsername: string;
}

export function BotTableTentPreview({
	format,
	patientBotLink,
	botUsername,
}: BotTableTentPreviewProps) {
	const isA5 = format === "a5";
	return (
		<div
			id="dente-printable-table-tent"
			style={{
				background: "#ffffff",
				color: "#0f172a",
				border: "2px dashed #94a3b8",
				borderRadius: "12px",
				padding: isA5 ? "28px 20px" : "16px 12px",
				textAlign: "center",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: "10px",
				boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
			}}
		>
			<div
				style={{
					fontSize: "11px",
					fontWeight: 800,
					letterSpacing: "0.08em",
					textTransform: "uppercase",
					color: "#0d9488",
				}}
			>
				Стоматологическая клиника DENTE
			</div>

			<div
				style={{
					fontSize: isA5 ? "17px" : "14px",
					fontWeight: 800,
					lineHeight: 1.3,
					maxWidth: "360px",
				}}
			>
				Запишитесь на приём онлайн через нашего Telegram-бота
			</div>

			<div
				style={{
					width: isA5 ? "160px" : "130px",
					height: isA5 ? "160px" : "130px",
					padding: "8px",
					background: "#ffffff",
					border: "1px solid #cbd5e1",
					borderRadius: "8px",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					margin: "4px 0",
				}}
			>
				<div
					// biome-ignore lint/security/noDangerouslySetInnerHtml: safe SVG
					dangerouslySetInnerHTML={{
						__html: generateQrCodeSvg(patientBotLink, {
							size: isA5 ? 144 : 114,
							margin: 1,
						}),
					}}
					style={{ width: "100%", height: "100%" }}
				/>
			</div>

			<div style={{ fontSize: "12px", color: "#475569", maxWidth: "320px", lineHeight: 1.4 }}>
				1. Наведите камеру смартфона на QR-код
				<br />
				2. В Telegram нажмите <strong>«Запустить»</strong>
			</div>

			<div
				style={{
					fontSize: "11px",
					fontWeight: 600,
					color: "#0f766e",
					background: "rgba(13, 148, 136, 0.1)",
					padding: "5px 12px",
					borderRadius: "20px",
				}}
			>
				@{botUsername || "dente_bot"}
			</div>
		</div>
	);
}
