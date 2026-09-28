import type React from "react";
import { Gift, Printer, Sparkles } from "lucide-react";
import { generateCode128Svg } from "@dental/shared";
import type { GiftCertificate } from "./loyaltyEngine";
import { GIFT_CERTIFICATE_CATALOG } from "./loyaltyPresets";

export interface LoyaltyCertificatesTabProps {
	readonly certificateNominalRub: number;
	readonly onNominalChange: (nominal: number) => void;
	readonly recipientName: string;
	readonly onRecipientNameChange: (name: string) => void;
	readonly activeCertificate: GiftCertificate | null;
	readonly certVerifyInput: string;
	readonly onCertVerifyInputChange: (input: string) => void;
	readonly certRedeemFeedback: { readonly isSuccess: boolean; readonly message: string } | null;
	readonly onGenerateNewCertificate: () => void;
	readonly onVerifyAndRedeemCert: () => void;
	readonly clinicName: string;
}

export const LoyaltyCertificatesTab: React.FC<LoyaltyCertificatesTabProps> = ({
	certificateNominalRub,
	onNominalChange,
	recipientName,
	onRecipientNameChange,
	activeCertificate,
	certVerifyInput,
	onCertVerifyInputChange,
	certRedeemFeedback,
	onGenerateNewCertificate,
	onVerifyAndRedeemCert,
	clinicName,
}) => {
	return (
		<div>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
					gap: "1.5rem",
				}}
			>
				{/* Left: Issue / Catalog */}
				<div>
					<h4 className="loyalty-section-title">
						<Gift size={20} color="var(--teal)" />
						Выпуск подарочного сертификата
					</h4>

					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							gap: "0.5rem",
							marginBottom: "1rem",
						}}
					>
						{GIFT_CERTIFICATE_CATALOG.filter((c) => !c.isCustomNominal).map((preset) => (
							<button
								key={preset.id}
								type="button"
								onClick={() => onNominalChange(preset.nominalRub)}
								style={{
									padding: "0.5rem 0.875rem",
									minHeight: "44px",
									borderRadius: "0.5rem",
									border:
										certificateNominalRub === preset.nominalRub
											? "2px solid var(--teal)"
											: "1px solid var(--line)",
									background:
										certificateNominalRub === preset.nominalRub
											? "rgba(13, 148, 136, 0.1)"
											: "var(--paper)",
									color: "var(--ink)",
									fontWeight: 700,
									fontSize: "0.875rem",
									cursor: "pointer",
								}}
							>
								{preset.nominalRub.toLocaleString("ru-RU")} ₽
							</button>
						))}
					</div>

					<div style={{ marginBottom: "1rem" }}>
						<label
							style={{
								display: "block",
								fontSize: "0.8125rem",
								fontWeight: 600,
								color: "var(--muted)",
								marginBottom: "0.25rem",
							}}
						>
							ФИО Получателя сертификата:
						</label>
						<input
							type="text"
							value={recipientName}
							onChange={(e) => onRecipientNameChange(e.target.value)}
							style={{
								width: "100%",
								padding: "0.625rem 0.875rem",
								borderRadius: "0.5rem",
								border: "1px solid var(--line)",
								fontSize: "0.875rem",
							}}
						/>
					</div>

					<div style={{ display: "flex", gap: "0.75rem" }}>
						<button
							type="button"
							onClick={onGenerateNewCertificate}
							style={{
								flex: 1,
								padding: "0.625rem 1rem",
								minHeight: "44px",
								borderRadius: "0.5rem",
								border: "none",
								background: "var(--teal)",
								color: "var(--on-teal, var(--paper))",
								fontWeight: 700,
								fontSize: "0.875rem",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "0.375rem",
							}}
						>
							<Sparkles size={16} />
							Сгенерировать сертификат
						</button>

						<button
							type="button"
							onClick={() => window.print()}
							style={{
								padding: "0.625rem 1rem",
								minHeight: "44px",
								borderRadius: "0.5rem",
								border: "1px solid var(--line)",
								background: "var(--paper)",
								color: "var(--ink)",
								fontWeight: 700,
								fontSize: "0.875rem",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								gap: "0.375rem",
							}}
						>
							<Printer size={16} />
							Печать A5/A6
						</button>
					</div>

					{/* Verification Box */}
					<div
						style={{
							background: "var(--paper-soft)",
							border: "1px solid var(--line)",
							borderRadius: "0.5rem",
							padding: "0.75rem 1rem",
							marginTop: "1rem",
						}}
					>
						<h5 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.5rem" }}>
							Проверка и погашение сертификата
						</h5>
						<div style={{ display: "flex", gap: "0.5rem" }}>
							<input
								type="text"
								placeholder="7701-XXXX-XXXX-XXXX"
								value={certVerifyInput}
								onChange={(e) => onCertVerifyInputChange(e.target.value)}
								style={{
									flex: 1,
									padding: "0.5rem 0.75rem",
									borderRadius: "0.5rem",
									border: "1px solid var(--line)",
									fontSize: "0.875rem",
									fontFamily: "monospace",
								}}
							/>
							<button
								type="button"
								onClick={onVerifyAndRedeemCert}
								style={{
									padding: "0.5rem 1rem",
									minHeight: "44px",
									borderRadius: "0.5rem",
									border: "none",
									background: "var(--teal)",
									color: "var(--on-teal, var(--paper))",
									fontWeight: 700,
									fontSize: "0.8125rem",
									cursor: "pointer",
								}}
							>
								Списать
							</button>
						</div>
						{certRedeemFeedback && (
							<div
								style={{
									fontSize: "0.8125rem",
									marginTop: "0.5rem",
									fontWeight: 600,
									color: certRedeemFeedback.isSuccess ? "var(--ok-fg)" : "var(--bad-fg)",
								}}
							>
								{certRedeemFeedback.message}
							</div>
						)}
					</div>
				</div>

				{/* Right: Live Visual Certificate Card */}
				<div className="loyalty-certificate-printable">
					{activeCertificate ? (
						<div className="loyalty-certificate-card-preview">
							<div className="loyalty-cert-gold-foil" />
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "flex-start",
								}}
							>
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

							<div className="loyalty-cert-serial-code">
								{activeCertificate.serialNumber}
							</div>

							<div style={{ fontSize: "0.8125rem", lineHeight: 1.5, opacity: 0.9 }}>
								Получатель:{" "}
								<strong>{activeCertificate.recipientName ?? recipientName}</strong>
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
					) : (
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
					)}
				</div>
			</div>
		</div>
	);
};
