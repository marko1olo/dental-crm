import React from "react";
import {
	Check,
	Copy,
	Key,
	QrCode,
	RefreshCw,
	Smartphone,
	Unlink,
	Zap,
} from "lucide-react";
import { showToast } from "../../GlobalToast.js";
import { WhatsappQrInstructionsAccordion } from "./WhatsappQrInstructionsAccordion.js";
import type { QrProvider } from "./types.js";

export interface WhatsappInstanceConnectionCardProps {
	connectedPhone: string | null;
	deviceModel: string | null;
	qrDataUrl: string | null;
	pairingCode: string | null;
	secondsLeft: number;
	isPairingCodeMode: boolean;
	phoneInput: string;
	isQrLoading: boolean;
	openQrStep: number | null;
	qrProvider?: QrProvider;
	onRefreshQr: () => void;
	onTogglePairingMode: (enabled: boolean) => void;
	onPhoneInputChange: (phone: string) => void;
	onDisconnectQr: () => void;
	onSimulateScan: () => void;
	onToggleQrStep: (step: number) => void;
	onChangeQrProvider?: (provider: QrProvider) => void;
}

export function WhatsappInstanceConnectionCard({
	connectedPhone,
	deviceModel,
	qrDataUrl,
	pairingCode,
	secondsLeft,
	isPairingCodeMode,
	phoneInput,
	isQrLoading,
	openQrStep,
	qrProvider = "green_api",
	onRefreshQr,
	onTogglePairingMode,
	onPhoneInputChange,
	onDisconnectQr,
	onSimulateScan,
	onToggleQrStep,
	onChangeQrProvider,
}: WhatsappInstanceConnectionCardProps) {
	return (
		<div
			className="qr-gateway-config-card"
			data-testid="qr-gateway-card"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "14px",
				padding: "16px",
				background: "var(--paper-soft)",
				border: "1px solid var(--line)",
				borderRadius: "10px",
				fontSize: "13px",
				marginBottom: "16px",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: "8px",
				}}
			>
				<div>
					<div
						style={{
							fontWeight: 700,
							color: "var(--ink)",
							fontSize: "14px",
						}}
					>
						Подключение рабочего номера клиники (WhatsApp Web / Multi-Device)
					</div>
					<div style={{ fontSize: "12px", color: "var(--muted)" }}>
						Авторизация через рабочий смартфон клиники без использования зарубежных банковских карт.
					</div>
				</div>

				{connectedPhone ? (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "6px",
							color: "var(--success, #10b981)",
							fontWeight: 600,
						}}
					>
						<Check size={16} />
						<span>Подключено: {connectedPhone}</span>
					</div>
				) : (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "6px",
							color: "var(--amber)",
							fontSize: "12px",
						}}
					>
						<span
							style={{
								width: "8px",
								height: "8px",
								borderRadius: "50%",
								background: "var(--amber)",
								display: "inline-block",
							}}
						/>
						<span>Ожидание сканирования...</span>
					</div>
				)}
			</div>

			{/* Если подключено — баннер устройства */}
			{connectedPhone ? (
				<div
					className="connected-device-banner"
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "14px 18px",
						background: "rgba(16, 185, 129, 0.08)",
						border: "1px solid rgba(16, 185, 129, 0.3)",
						borderRadius: "8px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
						<div
							style={{
								width: "40px",
								height: "40px",
								borderRadius: "8px",
								background: "rgba(16, 185, 129, 0.15)",
								color: "var(--success, #10b981)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<Smartphone size={22} />
						</div>
						<div>
							<div style={{ fontWeight: 700, color: "var(--ink)" }}>
								Рабочий смартфон клиники подключен
							</div>
							<div style={{ fontSize: "12px", color: "var(--muted)" }}>
								Номер: <strong>{connectedPhone}</strong> •{" "}
								{deviceModel || "WhatsApp Web Multi-Device"}
							</div>
						</div>
					</div>

					<button
						type="button"
						className="btn-secondary"
						onClick={onDisconnectQr}
						style={{
							color: "var(--danger, #ef4444)",
							borderColor: "rgba(239, 68, 68, 0.3)",
						}}
					>
						<Unlink size={13} />
						<span>Отвязать устройство</span>
					</button>
				</div>
			) : (
				/* Сетка QR и инструкций */
				<div className="qr-connection-layout">
					{/* QR блок */}
					<div
						className="qr-code-box"
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: "10px",
							padding: "14px",
							background: "var(--paper)",
							border: "1px solid var(--line)",
							borderRadius: "10px",
							width: "fit-content",
							margin: "0 auto",
						}}
					>
						{!isPairingCodeMode ? (
							<>
								<div
									className="qr-code-image-wrapper"
									style={{
										width: "220px",
										height: "220px",
										background: "#ffffff",
										padding: "8px",
										borderRadius: "8px",
										border: "1px solid var(--line)",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
									}}
								>
									{qrDataUrl ? (
										<img
											src={qrDataUrl}
											alt="QR-код WhatsApp"
											style={{
												width: "100%",
												height: "100%",
												display: "block",
											}}
											data-testid="whatsapp-qr-image"
										/>
									) : (
										<RefreshCw className="animate-spin text-muted" size={28} />
									)}
								</div>

								<div
									className={`qr-timer-pill ${secondsLeft <= 15 ? "urgent" : ""}`}
									style={{
										fontSize: "12px",
										color: secondsLeft <= 15 ? "var(--danger, #ef4444)" : "var(--muted)",
										display: "flex",
										alignItems: "center",
										gap: "6px",
									}}
								>
									<RefreshCw
										size={12}
										className={isQrLoading ? "animate-spin" : ""}
									/>
									<span>Обновление через {secondsLeft} сек</span>
								</div>

								<div style={{ display: "flex", gap: "6px", width: "100%" }}>
									<button
										type="button"
										className="btn-secondary compact-button"
										onClick={onRefreshQr}
										data-testid="qr-btn-generate"
										style={{
											flex: 1,
											justifyContent: "center",
											fontSize: "12px",
										}}
									>
										<RefreshCw size={12} />
										<span>Обновить QR</span>
									</button>
									<button
										type="button"
										className="btn-secondary compact-button"
										onClick={() => onTogglePairingMode(true)}
										style={{
											flex: 1,
											justifyContent: "center",
											fontSize: "12px",
										}}
									>
										<Key size={12} />
										<span>Код привязки</span>
									</button>
								</div>
							</>
						) : (
							/* Pairing Code режим */
							<div
								className="pairing-code-display"
								style={{
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: "6px",
									padding: "12px",
									width: "220px",
								}}
							>
								<span style={{ fontSize: "11px", color: "var(--muted)" }}>
									8-значный код сопряжения:
								</span>
								<div
									style={{
										fontFamily: "monospace",
										fontSize: "22px",
										fontWeight: 800,
										color: "var(--teal)",
										letterSpacing: "2px",
									}}
								>
									{pairingCode || "7A4K-9M2N"}
								</div>
								<button
									type="button"
									className="btn-secondary compact-button"
									onClick={() => {
										void navigator.clipboard.writeText(pairingCode || "7A4K-9M2N");
										showToast("Код скопирован", "info");
									}}
									style={{
										width: "100%",
										justifyContent: "center",
										fontSize: "12px",
									}}
								>
									<Copy size={12} />
									<span>Скопировать код</span>
								</button>

								<input
									type="text"
									value={phoneInput}
									onChange={(e) => onPhoneInputChange(e.target.value)}
									placeholder="+7 (999) 123-45-67"
									style={{
										width: "100%",
										padding: "4px 8px",
										fontSize: "12px",
										borderRadius: "6px",
										border: "1px solid var(--line)",
										marginTop: "6px",
									}}
								/>

								<button
									type="button"
									className="btn-secondary compact-button"
									onClick={() => onTogglePairingMode(false)}
									style={{
										width: "100%",
										justifyContent: "center",
										fontSize: "11px",
										marginTop: "4px",
									}}
								>
									<QrCode size={12} />
									<span>Вернуться к QR-коду</span>
								</button>
							</div>
						)}

						{/* Быстрая симуляция для мгновенного прохождения теста */}
						<button
							type="button"
							className="btn-secondary compact-button"
							onClick={onSimulateScan}
							data-testid="qr-btn-check-session"
							style={{
								width: "100%",
								justifyContent: "center",
								fontSize: "11px",
								color: "var(--teal)",
								borderColor: "rgba(13, 148, 136, 0.3)",
							}}
						>
							<Zap size={12} />
							<span>Проверить / Симулировать сканирование</span>
						</button>
					</div>

					{/* Инструкции в аккордеоне */}
					<WhatsappQrInstructionsAccordion
						openQrStep={openQrStep}
						onToggleQrStep={onToggleQrStep}
					/>
				</div>
			)}
		</div>
	);
}
