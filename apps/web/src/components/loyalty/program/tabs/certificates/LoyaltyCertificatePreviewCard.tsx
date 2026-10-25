import type React from "react";
import { Gift } from "lucide-react";
import { generateCode128Svg } from "@dental/shared";
import type { GiftCertificate } from "../../loyaltyEngine";

export interface LoyaltyCertificatePreviewCardProps {
	readonly activeCertificate: GiftCertificate | null;
	readonly recipientName: string;
	readonly clinicName: string;
}

export const LoyaltyCertificatePreviewCard: React.FC<LoyaltyCertificatePreviewCardProps> = ({
	activeCertificate,
	recipientName,
	clinicName,
}) => {
	if (!activeCertificate) {
		return (
			<div
				style={{
					border: "2px dashed var(--line)",
					borderRadius: "1rem",
					padding: "3rem 1.5rem",
					textAlign: "center",
					color: "var(--muted)",
					background: "var(--paper-soft)",
				}}
			>
				<Gift size={44} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
				<div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--ink)" }}>
					Сертификат не выбран
				</div>
				<p
					style={{
						fontSize: "0.8125rem",
						marginTop: "6px",
						maxWidth: "260px",
						marginInline: "auto",
					}}
				>
					Укажите номинал и нажмите «Сгенерировать сертификат» слева
				</p>
			</div>
		);
	}

	return (
		<div className="loyalty-certificate-card-preview">
			<div className="loyalty-cert-gold-foil" />
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
				<div>
					<div
						style={{
							fontSize: "0.75rem",
							textTransform: "uppercase",
							letterSpacing: "0.1em",
							color: "var(--warn-fg)",
						}}
					>
						{clinicName}
					</div>
					<div style={{ fontSize: "1.25rem", fontWeight: 800, marginTop: "0.25rem" }}>
						ПОДАРОЧНЫЙ СЕРТИФИКАТ
					</div>
				</div>
				<div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--warn-fg)" }}>
					{((activeCertificate.nominalKop ?? 0) / 100).toLocaleString("ru-RU")} ₽
				</div>
			</div>

			<div className="loyalty-cert-serial-code">{activeCertificate.serialNumber}</div>

			<div style={{ fontSize: "0.8125rem", lineHeight: 1.5, opacity: 0.9 }}>
				Получатель: <strong>{activeCertificate.recipientName ?? recipientName}</strong>
				<br />
				Действителен до: <strong>{activeCertificate.expiresAtIso}</strong>
				<br />
				Остаток средств:{" "}
				<strong style={{ color: "var(--ok-fg)" }}>
					{(activeCertificate.currentBalanceKop / 100).toLocaleString("ru-RU")} ₽
				</strong>
			</div>

			<div
				className="loyalty-barcode-svg-container"
				dangerouslySetInnerHTML={{
					__html: generateCode128Svg(activeCertificate.serialNumber, {
						height: 38,
						showText: false,
						barColor: "var(--paper)",
					}),
				}}
			/>
		</div>
	);
};
