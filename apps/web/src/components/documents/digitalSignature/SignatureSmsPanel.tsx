import React from "react";
import { Lock, Smartphone } from "lucide-react";

interface SignatureSmsPanelProps {
	readonly patientPhone?: string | undefined;
	readonly smsCode: string;
	readonly setSmsCode: (code: string) => void;
	readonly smsCountdown: number;
	readonly handleSendSmsCode: () => void;
}

export const SignatureSmsPanel: React.FC<SignatureSmsPanelProps> = ({
	patientPhone,
	smsCode,
	setSmsCode,
	smsCountdown,
	handleSendSmsCode,
}) => (
	<div
		style={{
			display: "flex",
			flexDirection: "column",
			gap: "12px",
			maxWidth: "460px",
			margin: "0 auto",
			padding: "8px 0",
			textAlign: "center",
		}}
		data-testid="panel-signature-sms"
	>
		<div
			style={{
				width: "40px",
				height: "40px",
				borderRadius: "10px",
				background: "rgba(13, 148, 136, 0.12)",
				color: "var(--teal, #0d9488)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				margin: "0 auto",
			}}
		>
			<Smartphone size={20} />
		</div>
		<div>
			<h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink, #0f172a)", margin: 0 }}>
				Код подтверждения по СМС / Telegram
			</h3>
			<p style={{ fontSize: "12px", color: "var(--muted, #64748b)", margin: "4px 0 0 0" }}>
				Номер телефона: <strong>{patientPhone || "+7 (___) ___-__-__"}</strong>
			</p>
		</div>

		<div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
			<input
				type="text"
				maxLength={6}
				value={smsCode}
				onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ""))}
				placeholder="4 9 2 1"
				style={{
					width: "140px",
					height: "40px",
					textAlign: "center",
					fontSize: "17px",
					letterSpacing: "0.2em",
					fontWeight: 700,
					borderRadius: "8px",
					border: "1px solid var(--line, #cbd5e1)",
					background: "var(--paper, #ffffff)",
					color: "var(--ink, #0f172a)",
				}}
				data-testid="input-pep-sms-code"
			/>
			<button
				type="button"
				disabled={smsCountdown > 0}
				onClick={handleSendSmsCode}
				className="secondary-button"
				style={{
					height: "40px",
					padding: "0 14px",
					borderRadius: "8px",
					fontSize: "12.5px",
					fontWeight: 600,
					cursor: "pointer",
				}}
				data-testid="btn-send-sms-code"
			>
				{smsCountdown > 0 ? `Повтор через ${smsCountdown} с` : "Выслать код"}
			</button>
		</div>

		<div
			style={{
				padding: "8px 12px",
				borderRadius: "8px",
				background: "var(--paper-soft, #f8fafc)",
				border: "1px solid var(--line, #e2e8f0)",
				textAlign: "left",
				fontSize: "11px",
				color: "var(--muted, #64748b)",
				display: "flex",
				alignItems: "flex-start",
				gap: "8px",
			}}
		>
			<Lock size={13} color="var(--teal, #0d9488)" style={{ flexShrink: 0, marginTop: "2px" }} />
			<span>
				В соответствии со ст. 9 ФЗ № 63-ФЗ ввод кода является аналогом собственноручной подписи.
			</span>
		</div>
	</div>
);
