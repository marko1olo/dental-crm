import React from "react";
import { Check, Copy, Download, Printer, QrCode } from "lucide-react";
import { generateQrCodeSvg } from "@dental/shared";

interface BotPatientQrSectionProps {
	patientBotLink: string;
	copiedLink: boolean;
	onOpenTableTent: () => void;
	onCopyPatientLink: () => void;
	onDownloadQrSvg: () => void;
}

export function BotPatientQrSection({
	patientBotLink,
	copiedLink,
	onOpenTableTent,
	onCopyPatientLink,
	onDownloadQrSvg,
}: BotPatientQrSectionProps) {
	return (
		<div className="tg-patient-qr-card" style={{
			background: "var(--paper-soft, #f8fafc)", border: "1px solid var(--line, #e2e8f0)",
			borderRadius: "14px", padding: "20px", display: "grid", gridTemplateColumns: "160px 1fr",
			gap: "24px", alignItems: "center", boxSizing: "border-box",
		}}>
			<div style={{
				width: "160px", height: "160px", background: "#ffffff", padding: "10px",
				borderRadius: "12px", border: "1px solid #cbd5e1", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)",
				display: "flex", alignItems: "center", justifyContent: "center",
			}} title="Сканируйте QR-код для запуска бота">
				<div
					// biome-ignore lint/security/noDangerouslySetInnerHtml: safe SVG
					dangerouslySetInnerHTML={{ __html: generateQrCodeSvg(patientBotLink, { size: 140, margin: 1 }) }}
					style={{ width: "100%", height: "100%" }}
				/>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 }}>
				<div>
					<div style={{ fontSize: "15px", fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
						<QrCode size={18} color="var(--teal)" />
						<span>QR-код и тейбл-тент для стойки ресепшена</span>
					</div>
					<p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: "1.5", margin: "4px 0 0 0" }}>
						Разместите распечатанный тейбл-тент на стойке администратора. Пациенты смогут
						записываться онлайн, подтверждать визиты и получать напоминания.
					</p>
				</div>

				<div style={{
					fontSize: "12px", background: "var(--paper)", padding: "8px 12px", borderRadius: "8px",
					border: "1px solid var(--line)", color: "var(--ink)", fontFamily: "monospace", wordBreak: "break-all",
				}}>
					{patientBotLink}
				</div>

				<div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
					<button
						type="button" className="tg-btn-primary"
						style={{ minHeight: "44px", padding: "8px 16px", fontSize: "13px" }}
						onClick={onOpenTableTent} title="Открыть макет тейбл-тента для печати"
						data-testid="tg-print-table-tent-btn"
					>
						<Printer size={16} />
						<span>Печать тейбл-тента (А5 / А6)</span>
					</button>
					<button
						type="button" className="tg-btn-secondary"
						style={{ minHeight: "44px", padding: "8px 14px", fontSize: "13px" }}
						onClick={onCopyPatientLink} title="Скопировать ссылку для отправки пациенту"
					>
						{copiedLink ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
						<span>{copiedLink ? "Скопировано!" : "Копировать ссылку"}</span>
					</button>
					<button
						type="button" className="tg-btn-secondary"
						style={{ minHeight: "44px", padding: "8px 14px", fontSize: "13px" }}
						onClick={onDownloadQrSvg} title="Скачать векторный QR-код в формате SVG"
					>
						<Download size={16} />
						<span>Скачать SVG</span>
					</button>
				</div>
			</div>
		</div>
	);
}
