import type React from "react";
import { Gift, Printer, Sparkles } from "lucide-react";
import { GIFT_CERTIFICATE_CATALOG } from "../../loyaltyPresets";

export interface LoyaltyCertificateNominalSelectorProps {
	readonly certificateNominalRub: number;
	readonly onNominalChange: (nominal: number) => void;
	readonly recipientName: string;
	readonly onRecipientNameChange: (name: string) => void;
	readonly onGenerateNewCertificate: () => void;
}

export const LoyaltyCertificateNominalSelector: React.FC<LoyaltyCertificateNominalSelectorProps> = ({
	certificateNominalRub,
	onNominalChange,
	recipientName,
	onRecipientNameChange,
	onGenerateNewCertificate,
}) => {
	return (
		<div>
			<h4 className="loyalty-section-title">
				<Gift size={20} color="var(--teal)" />
				Выпуск подарочного сертификата
			</h4>

			<div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
				{GIFT_CERTIFICATE_CATALOG.filter((c) => !c.isCustomNominal).map((preset) => {
					const isSelected = certificateNominalRub === preset.nominalRub;
					return (
						<button
							key={preset.id}
							type="button"
							onClick={() => onNominalChange(preset.nominalRub)}
							style={{
								padding: "0.5rem 0.875rem",
								minHeight: "44px",
								borderRadius: "0.5rem",
								border: isSelected ? "2px solid var(--teal)" : "1px solid var(--line)",
								background: isSelected ? "rgba(13, 148, 136, 0.1)" : "var(--paper)",
								color: "var(--ink)",
								fontWeight: 700,
								fontSize: "0.875rem",
								cursor: "pointer",
							}}
						>
							{preset.nominalRub.toLocaleString("ru-RU")} ₽
						</button>
					);
				})}
			</div>

			<div style={{ marginBottom: "1rem" }}>
				<label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.25rem" }}>
					ФИО Получателя сертификата:
				</label>
				<input
					type="text"
					value={recipientName}
					onChange={(e) => onRecipientNameChange(e.target.value)}
					style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--line)", fontSize: "0.875rem" }}
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
		</div>
	);
};
