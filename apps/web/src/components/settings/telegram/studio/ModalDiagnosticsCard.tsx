import React, { useState } from "react";
import { Activity, Check, Copy } from "lucide-react";
import { generateQrCodeSvg } from "@dental/shared";
import { showToast } from "../../../GlobalToast";

interface ModalDiagnosticsCardProps {
	botUsername: string;
	botLink: string;
}

export const ModalDiagnosticsCard: React.FC<ModalDiagnosticsCardProps> = ({
	botUsername,
	botLink,
}) => {
	const [copiedLink, setCopiedLink] = useState<boolean>(false);

	const handleCopyBotLink = async () => {
		try {
			if (typeof navigator !== "undefined" && navigator.clipboard) {
				await navigator.clipboard.writeText(botLink);
			}
			setCopiedLink(true);
			showToast("Ссылка на бота клиники скопирована", "success");
			setTimeout(() => setCopiedLink(false), 2500);
		} catch {
			showToast("Не удалось скопировать ссылку", "warning");
		}
	};

	return (
		<div
			className="bot-diagnostics-card"
			style={{
				width: "100%",
				padding: "14px 16px",
				background: "var(--paper-soft, #f8fafc)",
				border: "1px solid var(--line, #e2e8f0)",
				borderRadius: "12px",
				display: "flex",
				flexDirection: "column",
				gap: "10px",
				boxSizing: "border-box",
			}}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Activity size={15} color="var(--teal)" />
					<strong style={{ fontSize: "13px", color: "var(--ink)" }}>Диагностика бота</strong>
				</div>
				<span
					style={{
						fontSize: "11px",
						fontWeight: 600,
						padding: "2px 8px",
						borderRadius: "4px",
						background: "rgba(16, 185, 129, 0.15)",
						color: "#10b981",
						display: "inline-flex",
						alignItems: "center",
						gap: "4px",
					}}
				>
					<span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
					<span>Online</span>
				</span>
			</div>

			<div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "12px", alignItems: "center" }}>
				<div style={{ fontSize: "12px", color: "var(--muted)" }}>
					<div>
						Имя: <strong style={{ color: "var(--ink)" }}>@{botUsername}</strong>
					</div>
					<div style={{ marginTop: "2px" }}>
						Шифрование: <span style={{ color: "var(--ink)" }}>AES-256-GCM</span>
					</div>
				</div>

				<div
					style={{
						width: "48px",
						height: "48px",
						background: "#ffffff",
						padding: "2px",
						borderRadius: "6px",
						border: "1px solid var(--line, #cbd5e1)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
					title="QR-код для старта пациента в боте"
				>
					<div
						// biome-ignore lint/security/noDangerouslySetInnerHtml: safe SVG
						dangerouslySetInnerHTML={{ __html: generateQrCodeSvg(botLink, { size: 44, margin: 1 }) }}
						style={{ width: "100%", height: "100%" }}
					/>
				</div>
			</div>

			<button
				type="button"
				onClick={handleCopyBotLink}
				className="secondary-button compact-button"
				style={{
					width: "100%",
					fontSize: "12px",
					minHeight: "32px",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: "6px",
				}}
			>
				{copiedLink ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
				<span>{copiedLink ? "Ссылка скопирована!" : "Скопировать ссылку для пациентов"}</span>
			</button>
		</div>
	);
};
