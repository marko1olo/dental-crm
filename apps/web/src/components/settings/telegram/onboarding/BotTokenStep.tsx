import React from "react";
import {
	CheckCircle2,
	ExternalLink,
	Eye,
	EyeOff,
	HelpCircle,
	Info,
	Radio,
} from "lucide-react";
import type { BotChannelType } from "../TelegramPhoneSimulator";
import type { BotTokenStepProps } from "./types";

export function BotTokenStep({
	activeChannel,
	onSelectChannel,
	botTokenInput,
	onBotTokenChange,
	showToken,
	onToggleShowToken,
	connectionStatus,
	statusMessage,
	onVerifyConnection,
	tokenInputId,
}: BotTokenStepProps) {
	return (
		<div className="bot-wizard-step-pane">
			<div className="bot-pane-header">
				<span className="bot-step-chip">Шаг 1 из 4</span>
				<h3 className="bot-pane-title">Выберите канал автоматизации клиники</h3>
				<p className="bot-pane-subtitle">
					Подключите бота по инструкции. Выберите мессенджер, в котором общаются ваши пациенты:
				</p>
			</div>

			{/* 4 Channel Selector Cards */}
			<div className="bot-channels-grid">
				{[
					{
						id: "telegram" as BotChannelType,
						name: "Telegram Bot",
						badge: "Самый популярный",
						color: "#0284c7",
						desc: "Быстрый старт, WebApp запись, голосовые сообщения и кнопки.",
					},
					{
						id: "vk" as BotChannelType,
						name: "ВКонтакте Сообщество",
						badge: "В личке группы",
						color: "#0077ff",
						desc: "Автоответы в сообщениях группы клиники VK, запись и напоминания.",
					},
					{
						id: "whatsapp" as BotChannelType,
						name: "WhatsApp Business",
						badge: "Высокая доходимость",
						color: "#25d366",
						desc: "Официальный Cloud API диалог, прямой контакт с базой пациентов.",
					},
					{
						id: "max" as BotChannelType,
						name: "MAX (1С:Медицина)",
						badge: "Корпоративный шлюз",
						color: "#7c3aed",
						desc: "Интеграция с медицинскими информационными системами и 1С.",
					},
				].map((ch) => {
					const isSelected = activeChannel === ch.id;
					return (
						<button
							key={ch.id}
							type="button"
							onClick={() => onSelectChannel(ch.id)}
							className={`bot-channel-card ${isSelected ? "selected" : ""}`}
							style={{
								borderColor: isSelected ? ch.color : undefined,
							}}
						>
							<div className="bot-channel-card-head">
								<span
									className="bot-channel-badge"
									style={{
										background: isSelected ? ch.color : undefined,
										color: isSelected ? "#ffffff" : undefined,
									}}
								>
									{ch.badge}
								</span>
								{isSelected && <CheckCircle2 size={16} style={{ color: ch.color }} />}
							</div>
							<h4 className="bot-channel-name">{ch.name}</h4>
							<p className="bot-channel-desc">{ch.desc}</p>
						</button>
					);
				})}
			</div>

			{/* Channel Specific 2-Step Visual Instructions */}
			<div className="bot-channel-guide-card">
				<h4 className="bot-guide-title">
					Инструкция подключения для {activeChannel.toUpperCase()}
				</h4>

				{activeChannel === "telegram" && (
					<div className="bot-guide-steps-list">
						<div className="bot-guide-step-row">
							<div className="bot-guide-num">1</div>
							<div className="bot-guide-row-content">
								<strong>Создайте бота в Telegram</strong>
								<p>
									Перейдите в официальный бот <code className="tg-code">@BotFather</code> и
									отправьте команду <code className="tg-code">/newbot</code>. Укажите название клиники.
								</p>
								<a
									href="https://t.me/BotFather"
									target="_blank"
									rel="noreferrer noopener"
									className="bot-external-link-btn"
								>
									<span>Открыть @BotFather в Telegram</span>
									<ExternalLink size={13} />
								</a>
							</div>
						</div>

						<div className="bot-guide-step-row">
							<div className="bot-guide-num">2</div>
							<div className="bot-guide-row-content">
								<strong>Скопируйте HTTP API Token и вставьте ниже</strong>
								<p>
									@BotFather выдаст токен вида <code className="tg-code">7123456789:AAH1bK_x77eM4...</code>.
									Вставьте его в поле ниже для автоматической связки.
								</p>
							</div>
						</div>
					</div>
				)}

				{activeChannel === "vk" && (
					<div className="bot-guide-steps-list">
						<div className="bot-guide-step-row">
							<div className="bot-guide-num">1</div>
							<div className="bot-guide-row-content">
								<strong>Откройте настройки сообщества ВКонтакте</strong>
								<p>
									Зайдите в управление вашей группой: <em>Управление → Настройки → Работа с API</em>.
								</p>
							</div>
						</div>
						<div className="bot-guide-step-row">
							<div className="bot-guide-num">2</div>
							<div className="bot-guide-row-content">
								<strong>Создайте ключ доступа сообщества</strong>
								<p>
									Нажмите «Создать ключ», отметьте галочку <em>«Сообщения сообщества»</em> и скопируйте полученный ключ доступа в поле ниже.
								</p>
							</div>
						</div>
					</div>
				)}

				{activeChannel === "whatsapp" && (
					<div className="bot-guide-steps-list">
						<div className="bot-guide-step-row">
							<div className="bot-guide-num">1</div>
							<div className="bot-guide-row-content">
								<strong>Авторизуйтесь в WhatsApp Business / Meta</strong>
								<p>
									Перейдите в кабинет разработчика Meta Cloud API или подключите телефонный шлюз клиники.
								</p>
							</div>
						</div>
						<div className="bot-guide-step-row">
							<div className="bot-guide-num">2</div>
							<div className="bot-guide-row-content">
								<strong>Вставьте постоянный токен доступа (System User Token)</strong>
								<p>
									Скопируйте токен доступа с правами <code className="tg-code">whatsapp_business_messaging</code>.
								</p>
							</div>
						</div>
					</div>
				)}

				{activeChannel === "max" && (
					<div className="bot-guide-steps-list">
						<div className="bot-guide-step-row">
							<div className="bot-guide-num">1</div>
							<div className="bot-guide-row-content">
								<strong>Подключите шлюз 1С:Медицина / MAX</strong>
								<p>
									Откройте раздел интеграций в вашей МИС или модуле обмена MAX by 1C.
								</p>
							</div>
						</div>
						<div className="bot-guide-step-row">
							<div className="bot-guide-num">2</div>
							<div className="bot-guide-row-content">
								<strong>Сгенерируйте сервисный ключ подключения</strong>
								<p>Скопируйте сгенерированный API-ключ шлюза и вставьте ниже.</p>
							</div>
						</div>
					</div>
				)}

				{/* Token Input Row */}
				<div className="bot-token-box">
					<label htmlFor={tokenInputId} className="bot-field-label">
						Ключ доступа / Токен бота ({activeChannel.toUpperCase()}):
					</label>
					<div className="bot-token-input-row">
						<div className="bot-token-field-group">
							<input
								id={tokenInputId}
								type={showToken ? "text" : "password"}
								placeholder={
									activeChannel === "telegram"
										? "7123456789:AAH1bK_x77eM4-pQ9..."
										: activeChannel === "vk"
											? "vk1.a.w9r08qL765..."
											: "Токен доступа шлюза..."
								}
								value={botTokenInput}
								onChange={(e) => onBotTokenChange(e.target.value)}
								className="bot-input font-mono text-xs"
								autoComplete="off"
								spellCheck="false"
							/>
							<button
								type="button"
								onClick={onToggleShowToken}
								className="bot-icon-btn"
								title={showToken ? "Скрыть" : "Показать"}
							>
								{showToken ? <EyeOff size={15} /> : <Eye size={15} />}
							</button>
						</div>
						<button
							type="button"
							onClick={onVerifyConnection}
							disabled={connectionStatus === "verifying"}
							className="bot-verify-btn primary-button"
						>
							{connectionStatus === "verifying" ? (
								<Radio size={14} className="animate-pulse" />
							) : (
								<CheckCircle2 size={14} />
							)}
							<span>{connectionStatus === "verifying" ? "Проверка..." : "Проверить токен"}</span>
						</button>
					</div>

					{/* Status Feedback */}
					<div className={`bot-status-alert status-${connectionStatus}`}>
						{connectionStatus === "connected" && <CheckCircle2 size={16} className="text-emerald-500" />}
						{connectionStatus === "verifying" && <Radio size={16} className="text-amber-500 animate-pulse" />}
						{connectionStatus === "error" && <HelpCircle size={16} className="text-rose-500" />}
						{connectionStatus === "idle" && <Info size={16} className="text-slate-400" />}
						<span>{statusMessage}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
