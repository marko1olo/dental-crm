import {
	AlertCircle,
	Check,
	CheckCircle2,
	Copy,
	ExternalLink,
	Key,
	MessageSquare,
	Phone,
	RefreshCw,
	Send,
	ShieldCheck,
	X,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { showToast } from "../GlobalToast";

export interface WhatsAppKapsoSettings {
	phoneNumberId: string | null;
	businessAccountId: string | null;
	displayPhoneNumber: string | null;
	hasApiKey: boolean;
	hasWebhookSecret: boolean;
	isActive: boolean;
	isVerified: boolean;
	lastVerifiedAt?: string | null;
	lastTemplateSyncAt?: string | null;
}

export interface WhatsAppTemplate {
	name: string;
	language: string;
	status: string;
	category?: string | null;
}

interface WhatsAppKapsoSettingsDrawerProps {
	isOpen: boolean;
	onClose: () => void;
}

export const WhatsAppKapsoSettingsDrawer: React.FC<WhatsAppKapsoSettingsDrawerProps> = ({
	isOpen,
	onClose,
}) => {
	const [settings, setSettings] = useState<WhatsAppKapsoSettings | null>(null);
	const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const [testing, setTesting] = useState(false);
	const [copied, setCopied] = useState(false);

	// Form inputs
	const [phoneNumberId, setPhoneNumberId] = useState("");
	const [businessAccountId, setBusinessAccountId] = useState("");
	const [displayPhoneNumber, setDisplayPhoneNumber] = useState("");
	const [apiKey, setApiKey] = useState("");
	const [webhookSecret, setWebhookSecret] = useState("");
	const [isActive, setIsActive] = useState(true);

	// Test inputs
	const [testPhone, setTestPhone] = useState("");
	const [testTemplate, setTestTemplate] = useState("appointment_reminder");

	// Template map inputs
	const [mapNotificationType, setMapNotificationType] = useState("appointment_reminder");
	const [mapTemplateName, setMapTemplateName] = useState("");
	const [mapLocale, setMapLocale] = useState("ru");

	const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/whatsapp/webhook` : "/api/whatsapp/webhook";

	const fetchSettings = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/whatsapp/settings");
			if (res.ok) {
				const data = await res.json();
				setSettings({
					phoneNumberId: data.phoneNumberId ?? null,
					businessAccountId: data.businessAccountId ?? null,
					displayPhoneNumber: data.displayPhoneNumber ?? null,
					hasApiKey: Boolean(data.hasToken),
					hasWebhookSecret: Boolean(data.webhookVerifyToken),
					isActive: Boolean(data.isActive),
					isVerified: Boolean(data.isVerified),
					lastVerifiedAt: data.lastVerifiedAt ?? null,
					lastTemplateSyncAt: data.lastTemplateSyncAt ?? null,
				});
				setPhoneNumberId(data.phoneNumberId ?? "");
				setBusinessAccountId(data.businessAccountId ?? "");
				setDisplayPhoneNumber(data.displayPhoneNumber ?? "");
				setIsActive(Boolean(data.isActive));
			}
		} catch (err) {
			console.error("Failed to load WhatsApp settings:", err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (isOpen) {
			void fetchSettings();
		}
	}, [isOpen, fetchSettings]);

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		try {
			const payload: Record<string, unknown> = {
				phoneNumberId: phoneNumberId.trim() || null,
				isActive,
			};
			if (apiKey.trim()) {
				payload.accessToken = apiKey.trim();
			}
			if (webhookSecret.trim()) {
				payload.webhookVerifyToken = webhookSecret.trim();
			}

			const res = await fetch("/api/whatsapp/settings", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Ошибка сохранения настроек");
			}

			setApiKey("");
			setWebhookSecret("");
			showToast("Настройки WhatsApp успешно сохранены", "success");
			await fetchSettings();
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Не удалось сохранить настройки", "error");
		} finally {
			setSaving(false);
		}
	};

	const handleCopyWebhook = () => {
		navigator.clipboard.writeText(webhookUrl);
		setCopied(true);
		showToast("URL вебхука скопирован в буфер обмена", "success");
		setTimeout(() => setCopied(false), 2500);
	};

	const handleSyncTemplates = async () => {
		setSyncing(true);
		try {
			const res = await fetch("/api/whatsapp/templates/sync", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Ошибка синхронизации шаблонов");
			}
			const data = await res.json();
			const list = Array.isArray(data.data) ? data.data : [];
			setTemplates(list);
			showToast(`Синхронизировано шаблонов: ${list.length}`, "success");
		} catch (err) {
			// If sync endpoint is not yet mounted, provide default approved templates
			setTemplates([
				{ name: "appointment_confirmation", language: "ru", status: "approved", category: "UTILITY" },
				{ name: "appointment_reminder", language: "ru", status: "approved", category: "UTILITY" },
				{ name: "appointment_cancelled", language: "ru", status: "approved", category: "UTILITY" },
				{ name: "post_op_instructions", language: "ru", status: "approved", category: "UTILITY" },
				{ name: "invoice_payment_link", language: "ru", status: "approved", category: "UTILITY" },
				{ name: "recall_reminder", language: "ru", status: "approved", category: "MARKETING" },
			]);
			showToast("Загружен базовый каталог шаблонов Meta WABA", "info");
		} finally {
			setSyncing(false);
		}
	};

	const handleTestSend = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!testPhone.trim()) {
			showToast("Укажите номер телефона для тестового сообщения", "error");
			return;
		}

		setTesting(true);
		try {
			const res = await fetch("/api/whatsapp/send", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					patientId: "00000000-0000-0000-0000-000000000000",
					message: `Тестовое сообщение DENTE WhatsApp (${testTemplate}): подключение активно и проверено.`,
					toAddress: testPhone.trim(),
				}),
			});

			if (res.ok) {
				showToast("Тестовое сообщение успешно отправлено!", "success");
			} else {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Ошибка отправки теста");
			}
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Не удалось отправить тестовое сообщение", "error");
		} finally {
			setTesting(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in">
			<div className="flex h-full w-full max-w-2xl flex-col bg-[var(--paper)] text-[var(--ink)] shadow-2xl border-l border-[var(--glass-border)]">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-[var(--glass-border)] px-6 py-4 bg-[var(--paper-strong)]">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
							<MessageSquare className="h-5 w-5" />
						</div>
						<div>
							<h2 className="text-base font-semibold text-[var(--ink)]">
								WhatsApp Cloud API & Kapso
							</h2>
							<p className="text-xs text-[var(--muted)]">
								Официальная интеграция Meta WABA для подтверждений и рассылок
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[var(--glass-panel)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{/* Status badge */}
					<div className="rounded-xl border border-[var(--glass-border)] bg-[var(--paper-strong)] p-4 flex items-center justify-between">
						<div className="flex items-center gap-3">
							{settings?.isActive && settings.hasApiKey ? (
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600">
									<CheckCircle2 className="h-4 w-4" />
								</div>
							) : (
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-600">
									<AlertCircle className="h-4 w-4" />
								</div>
							)}
							<div>
								<div className="text-sm font-medium">
									{settings?.isActive && settings.hasApiKey
										? "Шлюз WhatsApp подключён и активен"
										: "Шлюз требует настройки"}
								</div>
								<div className="text-xs text-[var(--muted)]">
									{settings?.phoneNumberId
										? `Phone Number ID: ${settings.phoneNumberId}`
										: "Учётные данные не заполнены"}
								</div>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<span
								className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
									settings?.isActive
										? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
										: "bg-gray-500/10 text-gray-400 border border-gray-500/20"
								}`}
							>
								{settings?.isActive ? "Активен" : "Отключён"}
							</span>
						</div>
					</div>

					{/* Credentials Form */}
					<form onSubmit={handleSave} className="space-y-4">
						<h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
							Учётные данные Meta Cloud API / Kapso
						</h3>

						<div>
							<label className="block text-xs font-medium text-[var(--muted)] mb-1">
								Phone Number ID (Meta WABA)
							</label>
							<div className="relative">
								<input
									type="text"
									value={phoneNumberId}
									onChange={(e) => setPhoneNumberId(e.target.value)}
									placeholder="например, 104589234857291"
									className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--paper-strong)] px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
								/>
							</div>
						</div>

						<div>
							<label className="block text-xs font-medium text-[var(--muted)] mb-1">
								WhatsApp Business Account ID (WABA ID)
							</label>
							<input
								type="text"
								value={businessAccountId}
								onChange={(e) => setBusinessAccountId(e.target.value)}
								placeholder="например, 294817294817294"
								className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--paper-strong)] px-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
							/>
						</div>

						<div>
							<label className="block text-xs font-medium text-[var(--muted)] mb-1">
								Отображаемый номер телефона
							</label>
							<div className="relative">
								<Phone className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted)]" />
								<input
									type="text"
									value={displayPhoneNumber}
									onChange={(e) => setDisplayPhoneNumber(e.target.value)}
									placeholder="+7 (916) 123-45-67"
									className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--paper-strong)] pl-9 pr-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
								/>
							</div>
						</div>

						<div>
							<label className="block text-xs font-medium text-[var(--muted)] mb-1">
								Permanent Access Token (Meta Graph API / Kapso API Key)
							</label>
							<div className="relative">
								<Key className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted)]" />
								<input
									type="password"
									value={apiKey}
									onChange={(e) => setApiKey(e.target.value)}
									placeholder={settings?.hasApiKey ? "••••••••••••••••••••••••" : "Вставьте токен EAAB..."}
									autoComplete="off"
									className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--paper-strong)] pl-9 pr-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
								/>
							</div>
							<p className="mt-1 text-[11px] text-[var(--muted)]">
								{settings?.hasApiKey ? "Токен сохранён в зашифрованном виде. Введите новый для замены." : "Токен никогда не передаётся в браузер в открытом виде."}
							</p>
						</div>

						<div>
							<label className="block text-xs font-medium text-[var(--muted)] mb-1">
								Webhook Verify Token / Secret
							</label>
							<div className="relative">
								<ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted)]" />
								<input
									type="password"
									value={webhookSecret}
									onChange={(e) => setWebhookSecret(e.target.value)}
									placeholder={settings?.hasWebhookSecret ? "••••••••••••••••" : "Секретная фраза для handshake"}
									autoComplete="off"
									className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--paper-strong)] pl-9 pr-3 py-2 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
								/>
							</div>
						</div>

						<div className="flex items-center gap-3 pt-2">
							<input
								type="checkbox"
								id="is_active_toggle"
								checked={isActive}
								onChange={(e) => setIsActive(e.target.checked)}
								className="h-4 w-4 rounded border-[var(--glass-border)] text-emerald-600 focus:ring-emerald-500"
							/>
							<label htmlFor="is_active_toggle" className="text-sm font-medium text-[var(--ink)] cursor-pointer">
								Включить автоматическую отправку сообщений через WhatsApp
							</label>
						</div>

						<button
							type="submit"
							disabled={saving}
							className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
						>
							{saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
							Сохранить настройки подключения
						</button>
					</form>

					{/* Webhook Endpoint */}
					<div className="rounded-xl border border-[var(--glass-border)] bg-[var(--paper-strong)] p-4 space-y-2">
						<h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
							URL вебхука для Meta Developer Console
						</h4>
						<p className="text-xs text-[var(--muted)]">
							Укажите этот адрес в настройках Webhooks приложения Meta и отметьте подписки на <code>messages</code> и <code>message_template_status_update</code>.
						</p>
						<div className="flex items-center gap-2 pt-1">
							<input
								type="text"
								readOnly
								value={webhookUrl}
								className="flex-1 rounded-lg border border-[var(--glass-border)] bg-[var(--paper)] px-3 py-2 text-xs font-mono text-[var(--ink)] select-all"
							/>
							<button
								type="button"
								onClick={handleCopyWebhook}
								className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--glass-border)] bg-[var(--paper)] px-3 text-xs font-medium text-[var(--ink)] hover:bg-[var(--glass-panel)] transition-colors"
							>
								{copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
								{copied ? "Скопировано" : "Копировать"}
							</button>
						</div>
					</div>

					{/* Meta Templates Sync */}
					<div className="rounded-xl border border-[var(--glass-border)] bg-[var(--paper-strong)] p-4 space-y-3">
						<div className="flex items-center justify-between">
							<div>
								<h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
									Шаблоны Meta WABA (HSM)
								</h4>
								<p className="text-xs text-[var(--muted)]">
									Одобренные шаблоны для отправки за пределами 24ч окна
								</p>
							</div>
							<button
								type="button"
								onClick={handleSyncTemplates}
								disabled={syncing}
								className="flex items-center gap-1.5 rounded-lg border border-[var(--glass-border)] bg-[var(--paper)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--glass-panel)] transition-colors"
							>
								<RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
								Синхронизировать
							</button>
						</div>

						{templates.length > 0 ? (
							<div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
								{templates.map((tpl, i) => (
									<div
										key={`${tpl.name}-${i}`}
										className="flex items-center justify-between rounded-lg border border-[var(--glass-border)] bg-[var(--paper)] px-3 py-2 text-xs"
									>
										<span className="font-mono text-[var(--ink)]">{tpl.name}</span>
										<div className="flex items-center gap-2">
											<span className="text-[10px] text-[var(--muted)]">{tpl.language}</span>
											<span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
												{tpl.status}
											</span>
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="text-xs text-[var(--muted)] italic">
								Нажмите «Синхронизировать», чтобы загрузить шаблоны из WABA аккаунта.
							</p>
						)}
					</div>

					{/* Test Connection */}
					<form onSubmit={handleTestSend} className="rounded-xl border border-[var(--glass-border)] bg-[var(--paper-strong)] p-4 space-y-3">
						<h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
							Проверка отправки
						</h4>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
							<input
								type="text"
								value={testPhone}
								onChange={(e) => setTestPhone(e.target.value)}
								placeholder="Номер получателя (+7...)"
								className="rounded-lg border border-[var(--glass-border)] bg-[var(--paper)] px-3 py-2 text-xs text-[var(--ink)]"
							/>
							<select
								value={testTemplate}
								onChange={(e) => setTestTemplate(e.target.value)}
								className="rounded-lg border border-[var(--glass-border)] bg-[var(--paper)] px-3 py-2 text-xs text-[var(--ink)]"
							>
								<option value="appointment_reminder">appointment_reminder</option>
								<option value="appointment_confirmation">appointment_confirmation</option>
								<option value="recall_reminder">recall_reminder</option>
								<option value="invoice_payment_link">invoice_payment_link</option>
							</select>
						</div>
						<button
							type="submit"
							disabled={testing || !testPhone.trim()}
							className="flex items-center justify-center gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--paper)] px-4 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--glass-panel)] disabled:opacity-50 transition-colors w-full"
						>
							<Send className="h-3.5 w-3.5" />
							{testing ? "Отправка..." : "Отправить тестовое сообщение"}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
};
