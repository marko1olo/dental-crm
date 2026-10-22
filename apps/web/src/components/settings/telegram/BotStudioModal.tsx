import React, { useState, useEffect } from "react";
import {
	X,
	Bot,
	Sparkles,
	ShieldCheck,
	Activity,
	QrCode,
	Copy,
	Check,
	ExternalLink,
} from "lucide-react";
import { generateQrCodeSvg } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { BotOnboardingWizard } from "./BotOnboardingWizard";
import {
	TelegramPhoneSimulator,
	type BotChannelType,
} from "./TelegramPhoneSimulator";
import {
	CLINICAL_BOT_PRESETS,
	type BotPreset,
} from "./telegramBotPresets";
import "./TelegramBotStudio.css";

export interface BotStudioModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialChannel?: BotChannelType;
	// biome-ignore lint/suspicious/noExplicitAny: integration with settings bag
	parentProps?: any;
}

export function BotStudioModal({
	isOpen,
	onClose,
	initialChannel = "telegram",
	parentProps,
}: BotStudioModalProps) {
	// Sync states between wizard and phone simulator
	const [activeChannel, setActiveChannel] = useState<BotChannelType>(initialChannel);
	const [selectedPresetId, setSelectedPresetId] = useState<BotPreset["id"]>("premium");
	const [previewScreenId, setPreviewScreenId] = useState<string>("root");
	const [customClinicName, setCustomClinicName] = useState<string>(
		CLINICAL_BOT_PRESETS.premium.headerTitle,
	);
	const [customWelcomeText, setCustomWelcomeText] = useState<string>(
		CLINICAL_BOT_PRESETS.premium.defaultWelcomeText,
	);
	const [customPrimaryActionLabel, setCustomPrimaryActionLabel] = useState<string>(
		CLINICAL_BOT_PRESETS.premium.primaryActionLabel,
	);
	const [simTheme, setSimTheme] = useState<"light" | "dark">("light");
	const [copiedLink, setCopiedLink] = useState<boolean>(false);

	const activePreset = CLINICAL_BOT_PRESETS[selectedPresetId] || CLINICAL_BOT_PRESETS.premium;
	const clinicId = parentProps?.clinicId || "dente";
	const botUsername = parentProps?.telegramStatus?.bot?.username || "dente_clinic_bot";
	const botLink = `https://t.me/${botUsername}?start=clinic_${clinicId}`;

	// Close on Escape
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

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
			className="bot-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="bot-modal-title"
		>
			<div className="bot-modal-backdrop" onClick={onClose} aria-hidden="true" />

			<div className="bot-modal-container">
				{/* Modal Top Bar */}
				<div className="bot-modal-header">
					<div className="flex items-center gap-3 min-w-0">
						<div className="bot-modal-icon-badge">
							<Bot size={22} className="text-teal-600 dark:text-teal-400" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h2 id="bot-modal-title" className="bot-modal-title">
									Студия ботов DENTE: Быстрый запуск
								</h2>
								<span className="bot-pill-mini text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/50">
									<ShieldCheck size={12} className="inline mr-1" />
									Конфиденциально и защищено
								</span>
							</div>
							<p className="bot-modal-subtitle">
								Пошаговый мастер подключения Telegram, VK, WhatsApp и MAX без программистов
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="bot-modal-close-btn"
						aria-label="Закрыть окно мастера"
					>
						<X size={20} />
					</button>
				</div>

				{/* Modal Scrollable Body: 2 Columns */}
				<div className="bot-modal-body">
					{/* Left: 4-Step Wizard */}
					<div className="bot-modal-wizard-col">
						<BotOnboardingWizard
							channel={activeChannel}
							onChannelChange={setActiveChannel}
							selectedPresetId={selectedPresetId}
							onPresetChange={setSelectedPresetId}
							onPreviewScreen={setPreviewScreenId}
							customClinicName={customClinicName}
							onClinicNameChange={setCustomClinicName}
							customWelcomeText={customWelcomeText}
							onWelcomeTextChange={setCustomWelcomeText}
							customPrimaryActionLabel={customPrimaryActionLabel}
							onPrimaryActionLabelChange={setCustomPrimaryActionLabel}
							parentProps={parentProps}
						/>
					</div>

					{/* Right: Live Diagnostics & Message Bubble Card */}
					<div className="bot-modal-simulator-col">
						<div className="bot-modal-sim-sticky">
							{/* Live Diagnostics Card */}
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
										<strong
											style={{
												fontSize: "13px",
												color: "var(--ink)",
											}}
										>
											Диагностика бота
										</strong>
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
										<span
											style={{
												width: "6px",
												height: "6px",
												borderRadius: "50%",
												background: "#10b981",
											}}
										/>
										<span>Online</span>
									</span>
								</div>

								<div
									style={{
										display: "grid",
										gridTemplateColumns: "1fr auto",
										gap: "12px",
										alignItems: "center",
									}}
								>
									<div style={{ fontSize: "12px", color: "var(--muted)" }}>
										<div>
											Имя:{" "}
											<strong style={{ color: "var(--ink)" }}>
												@{botUsername}
											</strong>
										</div>
										<div style={{ marginTop: "2px" }}>
											Шифрование:{" "}
											<span style={{ color: "var(--ink)" }}>
												AES-256-GCM
											</span>
										</div>
									</div>

									{/* QR Thumbnail */}
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
											dangerouslySetInnerHTML={{
												__html: generateQrCodeSvg(botLink, {
													size: 44,
													margin: 1,
												}),
											}}
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
									{copiedLink ? (
										<Check size={13} color="#10b981" />
									) : (
										<Copy size={13} />
									)}
									<span>
										{copiedLink
											? "Ссылка скопирована!"
											: "Скопировать ссылку для пациентов"}
									</span>
								</button>
							</div>

							{/* Live Message Bubble Card */}
							<TelegramPhoneSimulator
								preset={activePreset}
								channel={activeChannel}
								customClinicName={customClinicName}
								customWelcomeText={customWelcomeText}
								customPrimaryActionLabel={customPrimaryActionLabel}
								previewScreenId={previewScreenId}
								onScreenChange={setPreviewScreenId}
								themeMode={simTheme}
								onThemeModeChange={setSimTheme}
							/>

							<div className="bot-sim-footnote">
								<span>
									Канал: <strong>{activeChannel.toUpperCase()}</strong>
								</span>
								<span>•</span>
								<span>
									Пресет: <strong>{activePreset.name}</strong>
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
