import React, { useState } from "react";
import {
	AlertCircle,
	Check,
	ChevronDown,
	ChevronUp,
	Copy,
	Eye,
	EyeOff,
	Globe,
	HelpCircle,
	Key,
	MessageCircle,
	Power,
	RefreshCw,
	Send,
	ShieldCheck,
	Unlink,
	User,
	Users,
} from "lucide-react";
import "./VkIntegrationHub.css";
import { useVkSettings } from "../../hooks/useVkSettings.js";
import { showToast } from "../GlobalToast.js";

interface VkIntegrationHubProps {
	serverBaseUrl?: string | undefined;
}

export function VkIntegrationHub({ serverBaseUrl }: VkIntegrationHubProps) {
	const {
		community,
		personalAccount,
		loading,
		saving,
		verifying,
		verifyResult,
		error,
		refresh,
		connectCommunity,
		verifyCommunity,
		disconnectCommunity,
		connectPersonalAccount,
		disconnectPersonalAccount,
	} = useVkSettings(serverBaseUrl);

	const [activeSubTab, setActiveSubTab] = useState<"community" | "account">("community");
	const [guideOpen, setGuideOpen] = useState<boolean>(true);
	const [copiedField, setCopiedField] = useState<string | null>(null);

	// Форма сообщества
	const [groupIdInput, setGroupIdInput] = useState<string>("");
	const [groupTokenInput, setGroupTokenInput] = useState<string>("");
	const [secretKeyInput, setSecretKeyInput] = useState<string>("");
	const [confirmationCodeInput, setConfirmationCodeInput] = useState<string>("");
	const [showGroupToken, setShowGroupToken] = useState<boolean>(false);

	// Форма личного аккаунта
	const [userTokenInput, setUserTokenInput] = useState<string>("");
	const [showUserToken, setShowUserToken] = useState<boolean>(false);

	// Тестовая отправка сообщения
	const [testRecipientId, setTestRecipientId] = useState<string>("");
	const [testMessageText, setTestMessageText] = useState<string>("Тестовое сообщение из DENTE CRM");
	const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
	const [testSendResult, setTestSendResult] = useState<{ ok: boolean; message: string } | null>(null);

	// Синхронизация формы сообщества при загрузке данных
	React.useEffect(() => {
		if (community) {
			if (community.groupId) setGroupIdInput(community.groupId);
			if (community.secretKey) setSecretKeyInput(community.secretKey);
			if (community.confirmationCode) setConfirmationCodeInput(community.confirmationCode);
		}
	}, [community]);

	const copyToClipboard = (text: string, fieldName: string) => {
		if (!text) return;
		navigator.clipboard.writeText(text);
		setCopiedField(fieldName);
		showToast("Скопировано в буфер обмена", "info");
		setTimeout(() => setCopiedField(null), 2000);
	};

	const handleCommunitySubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!groupIdInput.trim()) {
			showToast("Укажите ID или короткое имя сообщества ВКонтакте", "warning");
			return;
		}
		if (!groupTokenInput.trim() && !community?.tokenMasked) {
			showToast("Укажите ключ доступа (токен) сообщества", "warning");
			return;
		}

		await connectCommunity({
			groupId: groupIdInput.trim(),
			groupToken: groupTokenInput.trim() || (community?.tokenMasked ? "KEEP_EXISTING" : ""),
			...(secretKeyInput.trim() ? { secretKey: secretKeyInput.trim() } : {}),
			...(confirmationCodeInput.trim() ? { confirmationCode: confirmationCodeInput.trim() } : {}),
			isEnabled: true,
		});
	};

	const handleAccountSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!userTokenInput.trim()) {
			showToast("Укажите Access Token пользователя ВКонтакте", "warning");
			return;
		}

		const res = await connectPersonalAccount({
			accessToken: userTokenInput.trim(),
		});
		if (res.ok) {
			setUserTokenInput("");
		}
	};

	const handleSendTestMessage = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!testRecipientId.trim()) {
			showToast("Укажите VK ID получателя (пользователя)", "warning");
			return;
		}
		if (!isCommunityConnected) {
			showToast("Сообщество не подключено. Сначала сохраните ключ доступа.", "warning");
			return;
		}
		try {
			setIsSendingTest(true);
			setTestSendResult(null);
			const base = serverBaseUrl || "";
			const res = await fetch(`${base}/api/vk/bot/test-message`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					recipientId: testRecipientId.trim(),
					message: testMessageText.trim(),
				}),
			});
			const data = await res.json().catch(() => ({}));
			if (res.ok && data.ok) {
				setTestSendResult({ ok: true, message: "Тестовое сообщение успешно отправлено!" });
				showToast("Тестовое сообщение отправлено в VK", "success");
			} else {
				setTestSendResult({
					ok: false,
					message: data.message || "Ошибка отправки: проверьте права сообщества или диалог с пользователем",
				});
				showToast(data.message || "Ошибка отправки в VK", "error");
			}
		} catch (err) {
			setTestSendResult({ ok: false, message: `Ошибка сети: ${String(err)}` });
			showToast("Ошибка сети при отправке", "error");
		} finally {
			setIsSendingTest(false);
		}
	};

	const isCommunityConnected = Boolean(community?.configured && community?.isEnabled);
	const isAccountConnected = Boolean(personalAccount?.isActive && personalAccount?.status === "connected");

	if (loading && !community) {
		return (
			<div className="vk-hub-container">
				<div className="vk-card flex items-center justify-center p-8">
					<RefreshCw className="animate-spin text-blue-500" size={24} />
					<span className="ml-2 text-sm text-slate-500">Загрузка настроек ВКонтакте...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="vk-hub-container" aria-label="Центр интеграции ВКонтакте">
			{/* Переключатель подвкладок */}
			<div className="vk-subtabs-nav" role="tablist">
				<button
					type="button"
					role="tab"
					aria-selected={activeSubTab === "community"}
					className={`vk-subtab-btn ${activeSubTab === "community" ? "active" : ""}`}
					onClick={() => setActiveSubTab("community")}
				>
					<Users size={16} className="shrink-0" />
					<span className="truncate">Сообщество<span className="hidden sm:inline"> / Бот ВК</span></span>
					{isCommunityConnected && <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1 shrink-0" />}
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={activeSubTab === "account"}
					className={`vk-subtab-btn ${activeSubTab === "account" ? "active" : ""}`}
					onClick={() => setActiveSubTab("account")}
				>
					<User size={16} className="shrink-0" />
					<span className="truncate">Личная страница<span className="hidden sm:inline"> ВК</span></span>
					{isAccountConnected && <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1 shrink-0" />}
				</button>
			</div>

			{/* =========================================================================
			    ВКЛАДКА 1: СООБЩЕСТВО / БОТ ВКОНТАКТЕ
			    ========================================================================= */}
			{activeSubTab === "community" && (
				<div className="vk-card">
					{/* Заголовок карточки */}
					<div className="vk-card-header">
						<div className="vk-card-title-group">
							<div className="vk-channel-icon-badge">
								<MessageCircle size={22} />
							</div>
							<div>
								<h3 className="vk-card-title">Сообщество ВКонтакте (Бот и Callback API)</h3>
								<p className="vk-card-subtitle">
									Приём входящих заявок и переписка с пациентами от имени официальной группы клиники
								</p>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<span className={`vk-status-pill ${isCommunityConnected ? "connected" : "unconfigured"}`}>
								{isCommunityConnected ? "● Подключено" : "○ Не настроено"}
							</span>
							<button
								type="button"
								onClick={refresh}
								className="vk-copy-btn"
								title="Обновить настройки"
							>
								<RefreshCw size={15} className={loading ? "animate-spin" : ""} />
							</button>
						</div>
					</div>

					{/* Пошаговая инструкция */}
					<div className="vk-guide-accordion">
						<button
							type="button"
							className="vk-guide-trigger"
							onClick={() => setGuideOpen(!guideOpen)}
						>
							<div className="flex items-center gap-2">
								<HelpCircle size={16} className="text-blue-500" />
								<span>Как подключить сообщество ВКонтакте за 3 шага</span>
							</div>
							{guideOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
						</button>

						{guideOpen && (
							<div className="vk-guide-content">
								<div className="vk-step-item">
									<div className="vk-step-number">1</div>
									<div className="vk-step-text">
										<strong>Создайте ключ доступа:</strong> В вашей группе ВК перейдите в{" "}
										<em>«Управление» → «Работа с API» → «Создать ключ»</em>. Отметьте галочками:{" "}
										<strong>«Управление сообществом»</strong> и <strong>«Сообщения сообщества»</strong>.
									</div>
								</div>

								<div className="vk-step-item">
									<div className="vk-step-number">2</div>
									<div className="vk-step-text">
										<strong>Включите Callback API:</strong> В том же разделе откройте вкладку{" "}
										<em>«Callback API»</em> и скопируйте туда сгенерированные данные сервера ниже.
									</div>
								</div>

								{/* Копируемые параметры Callback API */}
								<div className="vk-copy-grid">
									<div className="vk-copy-item full-width">
										<span className="vk-copy-label">Адрес сервера (Webhook URL для ВК):</span>
										<div className="vk-copy-row">
											<span className="vk-copy-value">{community?.webhookUrl || "Генерируется..."}</span>
											<button
												type="button"
												className="vk-copy-btn"
												onClick={() => copyToClipboard(community?.webhookUrl || "", "webhookUrl")}
												title="Скопировать URL"
											>
												{copiedField === "webhookUrl" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
											</button>
										</div>
									</div>

									<div className="vk-copy-item">
										<span className="vk-copy-label">Код подтверждения (Confirmation Code):</span>
										<div className="vk-copy-row">
											<span className="vk-copy-value">{confirmationCodeInput || community?.confirmationCode || "—"}</span>
											<button
												type="button"
												className="vk-copy-btn"
												onClick={() => copyToClipboard(confirmationCodeInput || community?.confirmationCode || "", "confirmationCode")}
												title="Скопировать код"
											>
												{copiedField === "confirmationCode" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
											</button>
										</div>
									</div>

									<div className="vk-copy-item">
										<span className="vk-copy-label">Секретный ключ (Secret Key):</span>
										<div className="vk-copy-row">
											<span className="vk-copy-value">{secretKeyInput || community?.secretKey || "—"}</span>
											<button
												type="button"
												className="vk-copy-btn"
												onClick={() => copyToClipboard(secretKeyInput || community?.secretKey || "", "secretKey")}
												title="Скопировать секретный ключ"
											>
												{copiedField === "secretKey" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
											</button>
										</div>
									</div>
								</div>

								<div className="vk-step-item">
									<div className="vk-step-number">3</div>
									<div className="vk-step-text">
										<strong>Включите события сообщений:</strong> Во вкладке <em>«Типы событий»</em> Callback API
										отметьте галочкой <strong>«Входящие сообщения»</strong> (<code>message_new</code>).
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Форма подключения */}
					<form onSubmit={handleCommunitySubmit} className="flex flex-col gap-4">
						<div className="vk-form-group">
							<label className="vk-form-label" htmlFor="vk-group-id">
								ID сообщества или короткий адрес
							</label>
							<input
								id="vk-group-id"
								type="text"
								className="vk-form-input"
								placeholder="Например: 220000123 или dente_clinic"
								value={groupIdInput}
								onChange={(e) => setGroupIdInput(e.target.value)}
							/>
							<p className="vk-form-hint">
								Числовой ID группы или буквенное короткое имя из ссылки <code>vk.com/...</code>
							</p>
						</div>

						<div className="vk-form-group">
							<label className="vk-form-label" htmlFor="vk-group-token">
								Ключ доступа сообщества (Access Token)
							</label>
							<div className="vk-input-with-action">
								<input
									id="vk-group-token"
									type={showGroupToken ? "text" : "password"}
									className="vk-form-input pr-10"
									placeholder={community?.tokenMasked || "vk1.a.xxxx..."}
									value={groupTokenInput}
									onChange={(e) => setGroupTokenInput(e.target.value)}
								/>
								<button
									type="button"
									className="vk-input-action-btn"
									onClick={() => setShowGroupToken(!showGroupToken)}
									title={showGroupToken ? "Скрыть токен" : "Показать токен"}
								>
									{showGroupToken ? <EyeOff size={16} /> : <Eye size={16} />}
								</button>
							</div>
							<p className="vk-form-hint">
								{community?.tokenMasked ? `Сохранён токен: ${community.tokenMasked}` : "Токен шифруется по стандарту AES-256-GCM и не хранится в открытом виде"}
							</p>
						</div>

						{/* Кнопки действий */}
						<div className="vk-actions-row">
							<button
								type="submit"
								className="vk-btn-primary"
								disabled={saving}
							>
								{saving ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
								<span>Сохранить и подключить</span>
							</button>

							{isCommunityConnected && (
								<button
									type="button"
									className="vk-btn-secondary"
									onClick={() => verifyCommunity()}
									disabled={verifying}
								>
									<RefreshCw size={16} className={verifying ? "animate-spin" : ""} />
									<span>Проверить связь</span>
								</button>
							)}

							{isCommunityConnected && (
								<button
									type="button"
									className="vk-btn-danger"
									onClick={disconnectCommunity}
									disabled={saving}
								>
									<Unlink size={16} />
									<span>Отключить сообщество</span>
								</button>
							)}
						</div>
					</form>

					{/* Результат проверки связи */}
					{verifyResult && (
						<div className={`p-4 rounded-xl text-sm ${verifyResult.ok ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"}`}>
							{verifyResult.ok && verifyResult.group ? (
								<div className="flex items-center gap-3">
									{verifyResult.group.photo_200 && (
										<img
											src={verifyResult.group.photo_200}
											alt=""
											className="w-10 h-10 rounded-full object-cover border border-emerald-500/30"
										/>
									)}
									<div>
										<p className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
											<Check size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
											<span>Связь установлена: {verifyResult.group.name}</span>
										</p>
										<p className="text-xs text-emerald-600 dark:text-emerald-500">
											ID: {verifyResult.group.id} • @{verifyResult.group.screen_name}
										</p>
									</div>
								</div>
							) : (
								<p className="flex items-center gap-1.5">
									<AlertCircle size={16} className="text-red-500 shrink-0" />
									<span>{verifyResult.error || "Не удалось установить соединение с сервером ВКонтакте"}</span>
								</p>
							)}
						</div>
					)}

					{/* Блок тестовой отправки сообщения в VK */}
					<div className="mt-4 pt-4 border-t border-[var(--line,#e2e8f0)]" data-testid="vk-test-message-section">
						<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
							Тестовая отправка сообщения клиенту
						</h4>
						<form onSubmit={handleSendTestMessage} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
							<input
								type="text"
								placeholder="VK ID (например 12345678)"
								value={testRecipientId}
								onChange={(e) => setTestRecipientId(e.target.value)}
								className="vk-form-input text-xs sm:w-48"
								aria-label="VK ID получателя"
							/>
							<input
								type="text"
								placeholder="Текст тестового сообщения"
								value={testMessageText}
								onChange={(e) => setTestMessageText(e.target.value)}
								className="vk-form-input text-xs flex-1"
								aria-label="Текст тестового сообщения"
							/>
							<button
								type="submit"
								disabled={isSendingTest || !isCommunityConnected}
								className="vk-btn-primary min-h-[44px] px-4 text-xs font-semibold shrink-0 cursor-pointer"
								title={!isCommunityConnected ? "Сначала сохраните токен сообщества" : "Отправить тестовое сообщение"}
							>
								{isSendingTest ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
								<span>Отправить тест</span>
							</button>
						</form>
						{testSendResult && (
							<p className={`text-xs mt-2 flex items-center gap-1.5 font-medium ${testSendResult.ok ? "text-emerald-600" : "text-red-600"}`}>
								{testSendResult.ok ? <Check size={14} /> : <AlertCircle size={14} />}
								<span>{testSendResult.message}</span>
							</p>
						)}
					</div>
				</div>
			)}

			{/* =========================================================================
			    ВКЛАДКА 2: ЛИЧНАЯ СТРАНИЦА ВРАЧА / АДМИНИСТРАТОРА
			    ========================================================================= */}
			{activeSubTab === "account" && (
				<div className="vk-card">
					{/* Заголовок карточки */}
					<div className="vk-card-header">
						<div className="vk-card-title-group">
							<div className="vk-channel-icon-badge">
								<User size={22} />
							</div>
							<div>
								<h3 className="vk-card-title">Личная страница доктора / администратора ВКонтакте</h3>
								<p className="vk-card-subtitle">
									Персональная переписка с пациентами от имени конкретного врача прямо из рабочего места CRM
								</p>
							</div>
						</div>

						<span className={`vk-status-pill ${isAccountConnected ? "connected" : "unconfigured"}`}>
							{isAccountConnected ? "● Страница активна" : "○ Не подключена"}
						</span>
					</div>

					{/* Карточка подключенного профиля */}
					{isAccountConnected && personalAccount && (
						<div className="vk-profile-card">
							{personalAccount.photoUrl ? (
								<img
									src={personalAccount.photoUrl}
									alt=""
									className="vk-avatar-img"
								/>
							) : (
								<div className="vk-avatar-placeholder">
									{personalAccount.firstName?.charAt(0) || "В"}
								</div>
							)}

							<div className="vk-profile-info">
								<h4 className="vk-profile-name">
									{personalAccount.firstName} {personalAccount.lastName}
								</h4>
								{personalAccount.screenName && (
									<p className="vk-profile-handle">@{personalAccount.screenName}</p>
								)}
								<p className="vk-profile-meta">
									VK ID: {personalAccount.vkUserId}
									{personalAccount.lastSyncAt && ` • Синхронизировано: ${new Date(personalAccount.lastSyncAt).toLocaleDateString("ru-RU")}`}
								</p>
							</div>

							<button
								type="button"
								className="vk-btn-danger"
								onClick={disconnectPersonalAccount}
								disabled={saving}
							>
								<Unlink size={16} />
								<span>Отвязать страницу</span>
							</button>
						</div>
					)}

					{/* Форма подключения личной страницы */}
					{!isAccountConnected && (
						<form onSubmit={handleAccountSubmit} className="flex flex-col gap-4">
							<div className="vk-guide-accordion">
								<div className="p-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
									<p className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
										Как получить персональный токен доступа:
									</p>
									<ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
										<li>
											Используйте авторизацию через standalone-приложение ВКонтакте с разрешениями{" "}
											<code>messages,offline</code>.
										</li>
										<li>
											Скопируйте полученный <code>access_token</code> из адресной строки и вставьте в поле ниже.
										</li>
										<li>
											Система автоматически определит имя, аватар и привяжет сообщения к карте пациента.
										</li>
									</ol>
								</div>
							</div>

							<div className="vk-form-group">
								<label className="vk-form-label" htmlFor="vk-user-token">
									Пользовательский Access Token (User Token)
								</label>
								<div className="vk-input-with-action">
									<input
										id="vk-user-token"
										type={showUserToken ? "text" : "password"}
										className="vk-form-input pr-10"
										placeholder="vk1.a.xxxx..."
										value={userTokenInput}
										onChange={(e) => setUserTokenInput(e.target.value)}
									/>
									<button
										type="button"
										className="vk-input-action-btn"
										onClick={() => setShowUserToken(!showUserToken)}
										title={showUserToken ? "Скрыть" : "Показать"}
									>
										{showUserToken ? <EyeOff size={16} /> : <Eye size={16} />}
									</button>
								</div>
								<p className="vk-form-hint">
									Токен сохраняется в крипто-хранилище AES-256-GCM с изоляцией по клинике
								</p>
							</div>

							<div className="vk-actions-row">
								<button
									type="submit"
									className="vk-btn-primary"
									disabled={saving}
								>
									{saving ? <RefreshCw size={16} className="animate-spin" /> : <Key size={16} />}
									<span>Подключить личную страницу</span>
								</button>
							</div>
						</form>
					)}
				</div>
			)}
		</div>
	);
}
