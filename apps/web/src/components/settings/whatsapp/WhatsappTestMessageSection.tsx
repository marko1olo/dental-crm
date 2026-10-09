import React, { useState } from "react";
import { AlertCircle, Check, RefreshCw, Send } from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import { showToast } from "../../GlobalToast.js";

export interface WhatsappTestMessageSectionProps {
	serverBaseUrl?: string | undefined;
}

export function WhatsappTestMessageSection({
	serverBaseUrl,
}: WhatsappTestMessageSectionProps) {
	const [testPhone, setTestPhone] = useState("");
	const [testMessage, setTestMessage] = useState(
		"Тестовое сообщение из DENTE CRM",
	);
	const [isSending, setIsSending] = useState(false);
	const [sendResult, setSendResult] = useState<{
		ok: boolean;
		message: string;
	} | null>(null);

	const handleSendTest = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!testPhone.trim()) {
			showToast("Укажите номер телефона получателя (+7...)", "warning");
			return;
		}

		try {
			setIsSending(true);
			setSendResult(null);
			const base = serverBaseUrl || "";
			const res = await fetch(`${base}/api/whatsapp/test-message`, {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					phone: testPhone.trim(),
					message: testMessage.trim(),
				}),
			});

			const data = await res.json().catch(() => ({}));
			if (res.ok && data.ok) {
				setSendResult({
					ok: true,
					message: "Тестовое сообщение WhatsApp отправлено!",
				});
				showToast("Сообщение WhatsApp отправлено", "success");
			} else {
				setSendResult({
					ok: false,
					message: data.message || "Ошибка отправки WhatsApp",
				});
				showToast(data.message || "Ошибка отправки WhatsApp", "error");
			}
		} catch (err) {
			setSendResult({
				ok: false,
				message: `Ошибка сети: ${String(err)}`,
			});
			showToast("Ошибка сети при отправке", "error");
		} finally {
			setIsSending(false);
		}
	};

	return (
		<div
			className="whatsapp-test-message-section"
			data-testid="whatsapp-test-message-section"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "10px",
				padding: "16px",
				background: "var(--paper-soft)",
				border: "1px solid var(--line)",
				borderRadius: "10px",
				fontSize: "13px",
				marginBottom: "16px",
			}}
		>
			<div>
				<div
					style={{
						fontWeight: 700,
						color: "var(--ink)",
						fontSize: "14px",
						display: "flex",
						alignItems: "center",
						gap: "8px",
					}}
				>
					<Send size={15} className="text-teal-600" />
					<span>Тестовая отправка сообщения WhatsApp</span>
				</div>
				<div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
					Проверка отправки сообщений пациентам через рабочий номер или Meta Cloud API
				</div>
			</div>

			<form
				onSubmit={handleSendTest}
				style={{
					display: "flex",
					flexWrap: "wrap",
					gap: "8px",
					alignItems: "center",
					marginTop: "4px",
				}}
			>
				<input
					type="tel"
					placeholder="+7 (999) 000-00-00"
					value={testPhone}
					onChange={(e) => setTestPhone(e.target.value)}
					style={{
						padding: "8px 12px",
						borderRadius: "8px",
						border: "1px solid var(--line)",
						background: "var(--paper)",
						fontSize: "13px",
						minWidth: "180px",
						minHeight: "38px",
					}}
					aria-label="Номер телефона получателя"
				/>

				<input
					type="text"
					placeholder="Текст тестового сообщения"
					value={testMessage}
					onChange={(e) => setTestMessage(e.target.value)}
					style={{
						padding: "8px 12px",
						borderRadius: "8px",
						border: "1px solid var(--line)",
						background: "var(--paper)",
						fontSize: "13px",
						flex: 1,
						minWidth: "220px",
						minHeight: "38px",
					}}
					aria-label="Текст тестового сообщения"
				/>

				<button
					type="submit"
					disabled={isSending}
					className="btn-primary"
					style={{
						minHeight: "38px",
						padding: "0 16px",
						fontSize: "13px",
						display: "flex",
						alignItems: "center",
						gap: "6px",
					}}
				>
					{isSending ? (
						<RefreshCw size={14} className="animate-spin" />
					) : (
						<Send size={14} />
					)}
					<span>Отправить тест</span>
				</button>
			</form>

			{sendResult && (
				<p
					style={{
						margin: 0,
						fontSize: "12px",
						display: "flex",
						alignItems: "center",
						gap: "6px",
						color: sendResult.ok ? "var(--teal)" : "var(--danger, #ef4444)",
					}}
				>
					{sendResult.ok ? <Check size={14} /> : <AlertCircle size={14} />}
					<span>{sendResult.message}</span>
				</p>
			)}
		</div>
	);
}
