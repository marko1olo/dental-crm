import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface WhatsappQrInstructionsAccordionProps {
	openQrStep: number | null;
	onToggleQrStep: (step: number) => void;
}

export function WhatsappQrInstructionsAccordion({
	openQrStep,
	onToggleQrStep,
}: WhatsappQrInstructionsAccordionProps) {
	return (
		<div
			className="whatsapp-instructions-box"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "6px",
				border: "1px solid var(--line)",
				borderRadius: "8px",
				overflow: "hidden",
			}}
		>
			<div style={{ borderBottom: "1px solid var(--line)" }}>
				<button
					type="button"
					className="whatsapp-instruction-header"
					onClick={() => onToggleQrStep(1)}
					style={{
						width: "100%",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "10px 14px",
						background: "var(--paper-soft)",
						border: "none",
						cursor: "pointer",
						fontWeight: 600,
						fontSize: "13px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<span
							style={{
								width: "20px",
								height: "20px",
								borderRadius: "50%",
								background: "var(--teal)",
								color: "white",
								fontSize: "11px",
								fontWeight: 700,
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							1
						</span>
						<span>Откройте WhatsApp на рабочем смартфоне клиники</span>
					</div>
					{openQrStep === 1 ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
				</button>
				{openQrStep === 1 && (
					<div
						style={{
							padding: "10px 14px 12px 42px",
							background: "var(--paper)",
							fontSize: "12px",
							color: "var(--muted)",
							lineHeight: 1.5,
						}}
					>
						Убедитесь, что смартфон подключен к интернету. Запустите официальное приложение WhatsApp или WhatsApp Business.
					</div>
				)}
			</div>

			<div style={{ borderBottom: "1px solid var(--line)" }}>
				<button
					type="button"
					className="whatsapp-instruction-header"
					onClick={() => onToggleQrStep(2)}
					style={{
						width: "100%",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "10px 14px",
						background: "var(--paper-soft)",
						border: "none",
						cursor: "pointer",
						fontWeight: 600,
						fontSize: "13px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<span
							style={{
								width: "20px",
								height: "20px",
								borderRadius: "50%",
								background: "var(--teal)",
								color: "white",
								fontSize: "11px",
								fontWeight: 700,
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							2
						</span>
						<span>Перейдите в «Связанные устройства»</span>
					</div>
					{openQrStep === 2 ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
				</button>
				{openQrStep === 2 && (
					<div
						style={{
							padding: "10px 14px 12px 42px",
							background: "var(--paper)",
							fontSize: "12px",
							color: "var(--muted)",
							lineHeight: 1.5,
						}}
					>
						• На <strong>iPhone</strong>: вкладка «Настройки» в правом нижнем углу → «Связанные устройства».<br />
						• На <strong>Android</strong>: три точки ⋮ в верхнем правом углу → «Связанные устройства».
					</div>
				)}
			</div>

			<div>
				<button
					type="button"
					className="whatsapp-instruction-header"
					onClick={() => onToggleQrStep(3)}
					style={{
						width: "100%",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "10px 14px",
						background: "var(--paper-soft)",
						border: "none",
						cursor: "pointer",
						fontWeight: 600,
						fontSize: "13px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<span
							style={{
								width: "20px",
								height: "20px",
								borderRadius: "50%",
								background: "var(--teal)",
								color: "white",
								fontSize: "11px",
								fontWeight: 700,
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							3
						</span>
						<span>Нажмите «Привязка устройства» и наведите камеру</span>
					</div>
					{openQrStep === 3 ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
				</button>
				{openQrStep === 3 && (
					<div
						style={{
							padding: "10px 14px 12px 42px",
							background: "var(--paper)",
							fontSize: "12px",
							color: "var(--muted)",
							lineHeight: 1.5,
						}}
					>
						Подтвердите Face ID / отпечаток и наведите камеру телефона на QR-код на экране. Телефон свяжется с CRM за 2 секунды.
					</div>
				)}
			</div>
		</div>
	);
}
