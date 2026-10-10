/**
 * @file WhatsappQrAuthCard.tsx
 * @description Card component for WhatsApp QR Multi-Device pairing and status management.
 */

import React from "react";
import {
	Check,
	ChevronDown,
	ChevronUp,
	Copy,
	Key,
	QrCode,
	RefreshCw,
	Sparkles,
	Unlink,
	Zap,
} from "lucide-react";
import type { QrSessionStatus } from "./types.js";

export interface WhatsappQrAuthCardProps {
	qrStatus: QrSessionStatus;
	connectedPhone: string | null;
	deviceModel: string | null;
	onDisconnectQr: () => void | Promise<void>;
	isPairingCodeMode: boolean;
	setIsPairingCodeMode: (mode: boolean) => void;
	qrDataUrl: string | null;
	secondsLeft: number;
	isQrLoading: boolean;
	onRefreshQr: (force?: boolean) => void | Promise<void>;
	pairingCode: string | null;
	phoneInput: string;
	setPhoneInput: (phone: string) => void;
	copyText: (text: string, label: string) => void;
	onSimulateScan: () => void | Promise<void>;
	openQrStep: number | null;
	setOpenQrStep: (step: number | null) => void;
}

export function WhatsappQrAuthCard({
	qrStatus,
	connectedPhone,
	deviceModel,
	onDisconnectQr,
	isPairingCodeMode,
	setIsPairingCodeMode,
	qrDataUrl,
	secondsLeft,
	isQrLoading,
	onRefreshQr,
	pairingCode,
	phoneInput,
	setPhoneInput,
	copyText,
	onSimulateScan,
	openQrStep,
	setOpenQrStep,
}: WhatsappQrAuthCardProps) {
	return (
		<div className="whatsapp-mode-card" data-testid="whatsapp-qr-panel">
			{/* Если телефон уже подключен */}
			{qrStatus === "authenticated" ? (
				<div className="connected-device-banner" data-testid="qr-authenticated-card">
					<div className="connected-device-info">
						<div className="connected-device-icon">
							<Check size={24} />
						</div>
						<div className="connected-device-details">
							<h4>Рабочий телефон клиники подключен</h4>
							<p>
								Номер: <strong>{connectedPhone}</strong> • {deviceModel}
							</p>
						</div>
					</div>
					<div style={{ display: "flex", gap: "8px" }}>
						<button
							type="button"
							className="btn-secondary"
							onClick={() => void onDisconnectQr()}
							data-testid="btn-disconnect-qr"
							style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.3)" }}
						>
							<Unlink size={14} />
							<span>Отвязать устройство</span>
						</button>
					</div>
				</div>
			) : (
				/* Блок сопряжения (QR или Pairing Code) */
				<div className="qr-connection-layout">
					{/* Левая колонка: QR-код или Pairing Code */}
					<div className="qr-code-box">
						{!isPairingCodeMode ? (
							<>
								<div className="qr-code-image-wrapper">
									{qrDataUrl ? (
										<img
											src={qrDataUrl}
											alt="QR-код привязки WhatsApp"
											data-testid="whatsapp-qr-image"
										/>
									) : (
										<div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
											<RefreshCw className="animate-spin text-muted" size={32} />
										</div>
									)}
								</div>

								<div className={`qr-timer-pill ${secondsLeft <= 15 ? "urgent" : ""}`}>
									<RefreshCw size={12} className={isQrLoading ? "animate-spin" : ""} />
									<span>Обновление QR-кода через {secondsLeft} сек</span>
								</div>

								<div style={{ display: "flex", gap: "8px", width: "100%" }}>
									<button
										type="button"
										className="btn-secondary compact-button"
										onClick={() => void onRefreshQr(true)}
										data-testid="btn-refresh-qr"
										style={{ flex: 1, justifyContent: "center" }}
									>
										<RefreshCw size={13} />
										<span>Обновить QR</span>
									</button>
									<button
										type="button"
										className="btn-secondary compact-button"
										onClick={() => setIsPairingCodeMode(true)}
										data-testid="btn-switch-pairing"
										style={{ flex: 1, justifyContent: "center" }}
									>
										<Key size={13} />
										<span>Код сопряжения</span>
									</button>
								</div>
							</>
						) : (
							/* Режим Pairing Code */
							<div className="pairing-code-display" data-testid="pairing-code-box">
								<span style={{ fontSize: "11px", color: "var(--muted)" }}>
									8-значный код сопряжения
								</span>
								<div className="pairing-code-value" data-testid="pairing-code-text">
									{pairingCode || "7A4K-9M2N"}
								</div>
								<button
									type="button"
									className="btn-secondary compact-button"
									onClick={() => copyText(pairingCode || "7A4K-9M2N", "Код")}
									style={{ width: "100%", justifyContent: "center" }}
								>
									<Copy size={13} />
									<span>Скопировать код</span>
								</button>

								<div style={{ width: "100%", marginTop: "8px" }}>
									<label style={{ fontSize: "11px", color: "var(--muted)" }}>Номер телефона клиники</label>
									<input
										type="text"
										value={phoneInput}
										onChange={(e) => setPhoneInput(e.target.value)}
										placeholder="+7 (999) 123-45-67"
										style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--line)" }}
									/>
								</div>

								<button
									type="button"
									className="btn-secondary compact-button"
									onClick={() => setIsPairingCodeMode(false)}
									style={{ marginTop: "6px" }}
								>
									<QrCode size={13} />
									<span>Вернуться к QR-коду</span>
								</button>
							</div>
						)}

						{/* Демо-кнопка симуляции для мгновенного прохождения теста без смартфона */}
						<button
							type="button"
							className="btn-secondary compact-button"
							onClick={() => void onSimulateScan()}
							data-testid="btn-simulate-scan"
							style={{
								width: "100%",
								justifyContent: "center",
								background: "rgba(13, 148, 136, 0.08)",
								color: "var(--teal)",
								borderColor: "rgba(13, 148, 136, 0.3)",
							}}
						>
							<Zap size={13} />
							<span>Симулировать сканирование</span>
						</button>
					</div>

					{/* Правая колонка: Инструкция по шагам */}
					<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
						<div>
							<h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}>
								Подключение рабочего смартфона клиники
							</h3>
							<p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--muted)" }}>
								Без регистрации юрлица в Meta и без привязки зарубежных банковских карт. Все сообщения пациентам будут приходить с номера клиники.
							</p>
						</div>

						{/* Пошаговый аккордеон */}
						<div className="whatsapp-instructions-box" data-testid="qr-instructions-accordion">
							{/* Шаг 1 */}
							<div className="whatsapp-instruction-step">
								<button
									type="button"
									className="whatsapp-instruction-header"
									onClick={() => setOpenQrStep(openQrStep === 1 ? null : 1)}
								>
									<div style={{ display: "flex", alignItems: "center" }}>
										<span className="step-number-badge">1</span>
										<span>Откройте WhatsApp на рабочем смартфоне клиники</span>
									</div>
									{openQrStep === 1 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
								</button>
								{openQrStep === 1 && (
									<div className="whatsapp-instruction-body">
										Убедитесь, что смартфон подключен к интернету (Wi-Fi или мобильная сеть). Запустите официальное приложение <strong>WhatsApp</strong> или <strong>WhatsApp Business</strong>.
									</div>
								)}
							</div>

							{/* Шаг 2 */}
							<div className="whatsapp-instruction-step">
								<button
									type="button"
									className="whatsapp-instruction-header"
									onClick={() => setOpenQrStep(openQrStep === 2 ? null : 2)}
								>
									<div style={{ display: "flex", alignItems: "center" }}>
										<span className="step-number-badge">2</span>
										<span>Перейдите в «Связанные устройства»</span>
									</div>
									{openQrStep === 2 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
								</button>
								{openQrStep === 2 && (
									<div className="whatsapp-instruction-body">
										• На <strong>iPhone</strong>: нажмите вкладку <strong>Настройки</strong> в правом нижнем углу → <strong>Связанные устройства</strong>.<br />
										• На <strong>Android</strong>: нажмите три точки ⋮ в верхнем правом углу → <strong>Связанные устройства</strong>.
									</div>
								)}
							</div>

							{/* Шаг 3 */}
							<div className="whatsapp-instruction-step">
								<button
									type="button"
									className="whatsapp-instruction-header"
									onClick={() => setOpenQrStep(openQrStep === 3 ? null : 3)}
								>
									<div style={{ display: "flex", alignItems: "center" }}>
										<span className="step-number-badge">3</span>
										<span>Нажмите «Привязка устройства» и наведите камеру</span>
									</div>
									{openQrStep === 3 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
								</button>
								{openQrStep === 3 && (
									<div className="whatsapp-instruction-body">
										Нажмите кнопку <strong>«Привязка устройства»</strong> (подтвердите Face ID / отпечаток). Наведите камеру телефона на QR-код на экране компьютера. Авторизация произойдет моментально.
									</div>
								)}
							</div>
						</div>

						{/* Преимущества Multi-Device */}
						<div style={{ padding: "10px 14px", background: "var(--paper-soft)", borderRadius: "8px", fontSize: "12px", color: "var(--muted)", border: "1px solid var(--line)", display: "flex", alignItems: "flex-start", gap: "8px" }}>
							<Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
							<span><strong>Технология Multi-Device:</strong> после привязки телефон клиники может быть даже выключен или находиться вне зоны сети — DENTE продолжит отправлять напоминания и подтверждения записей автономно!</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
