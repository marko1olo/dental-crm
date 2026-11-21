/**
 * @file apps/web/src/components/settings/integrations/MedflexSettingsTab.tsx
 * @description Панель настроек интеграции с агрегаторами МедФлекс и ПроДокторов.
 * Мандаты 8d, 8e, 8am, 8bi (Apple HIG, 1 Primary CTA, Sentence case, токены CSS).
 */

import React, { useCallback, useEffect, useState } from "react";
import {
	AlertCircle,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	ExternalLink,
	Globe,
	Key,
	RefreshCw,
	Save,
	ShieldCheck,
	UserCheck,
} from "lucide-react";
import { showToast } from "../../GlobalToast";

function getAuthHeaders(): Record<string, string> {
	const token =
		localStorage.getItem("dente_token") ||
		localStorage.getItem("auth_token") ||
		"";
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (token) headers.Authorization = `Bearer ${token}`;
	const orgId = localStorage.getItem("dente_organization_id") || "";
	if (orgId) headers["x-organization-id"] = orgId;
	return headers;
}

export interface MedflexSettings {
	id?: string;
	organizationId?: string;
	clinicExternalId: string;
	apiKey: string;
	webhookSecret: string;
	isActive: boolean;
	autoConfirmBookings: boolean;
	defaultChairId: string | null;
}

export interface DoctorMappingItem {
	staffId: string;
	fullName: string;
	role: string;
	specialties: string[];
	externalDoctorId: string;
	isSyncEnabled: boolean;
}

export interface WebhookLogItem {
	id: string;
	eventType: string;
	deliveryId: string;
	status: string;
	errorMessage: string | null;
	createdAt: string;
}

export const MedflexSettingsTab: React.FC = () => {
	const [settings, setSettings] = useState<MedflexSettings>({
		clinicExternalId: "",
		apiKey: "",
		webhookSecret: "",
		isActive: true,
		autoConfirmBookings: true,
		defaultChairId: null,
	});
	const [doctors, setDoctors] = useState<DoctorMappingItem[]>([]);
	const [logs, setLogs] = useState<WebhookLogItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [copiedField, setCopiedField] = useState<string | null>(null);

	const origin = typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:5173";
	const pricelistUrl = settings.clinicExternalId
		? `${origin}/api/integrations/medflex/${settings.clinicExternalId}/pricelist.xml`
		: `${origin}/api/integrations/medflex/pricelist.xml`;
	const webhookUrl = settings.clinicExternalId
		? `${origin}/api/integrations/medflex/${settings.clinicExternalId}/webhook/booking`
		: `${origin}/api/integrations/medflex/webhook/booking`;

	const loadData = useCallback(async () => {
		setIsLoading(true);
		try {
			const headers = getAuthHeaders();

			// 1. Загрузка настроек
			const settingsRes = await fetch("/api/integrations/medflex/settings", { headers });
			if (settingsRes.ok) {
				const settingsJson = await settingsRes.json();
				if (settingsJson.settings) {
					setSettings(settingsJson.settings);
				}
			}

			// 2. Загрузка маппингов врачей
			const mappingsRes = await fetch("/api/integrations/medflex/doctor-mappings", { headers });
			if (mappingsRes.ok) {
				const mappingsJson = await mappingsRes.json();
				if (Array.isArray(mappingsJson.mappings)) {
					setDoctors(mappingsJson.mappings);
				}
			}

			// 3. Загрузка последних вебхуков
			const logsRes = await fetch("/api/integrations/medflex/webhook-logs?limit=15", { headers });
			if (logsRes.ok) {
				const logsJson = await logsRes.json();
				if (Array.isArray(logsJson.logs)) {
					setLogs(logsJson.logs);
				}
			}
		} catch (e) {
			console.error("Ошибка загрузки данных MedFlex:", e);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadData();
	}, [loadData]);

	const handleCopy = (text: string, fieldKey: string) => {
		if (navigator.clipboard) {
			void navigator.clipboard.writeText(text);
			setCopiedField(fieldKey);
			showToast("Ссылка скопирована в буфер обмена", "success");
			setTimeout(() => setCopiedField(null), 2000);
		}
	};

	const handleGenerateSecret = async () => {
		try {
			const headers = getAuthHeaders();
			const res = await fetch("/api/integrations/medflex/settings/generate-secret", {
				method: "POST",
				headers,
			});
			if (res.ok) {
				const json = await res.json();
				if (json.secret) {
					setSettings((prev) => ({ ...prev, webhookSecret: json.secret }));
					showToast("Сгенерирован новый криптографический секрет", "info");
				}
			}
		} catch {
			showToast("Не удалось сгенерировать секрет", "error");
		}
	};

	const handleDoctorChange = (staffId: string, externalDoctorId: string, isSyncEnabled: boolean) => {
		setDoctors((prev) =>
			prev.map((d) => (d.staffId === staffId ? { ...d, externalDoctorId, isSyncEnabled } : d)),
		);
	};

	const handleSaveAll = async () => {
		setIsSaving(true);
		try {
			const headers = getAuthHeaders();

			// Сохранение настроек
			const settingsRes = await fetch("/api/integrations/medflex/settings", {
				method: "PUT",
				headers,
				body: JSON.stringify(settings),
			});

			if (!settingsRes.ok) {
				throw new Error("Не удалось сохранить настройки");
			}

			// Сохранение маппингов врачей
			const mappingsRes = await fetch("/api/integrations/medflex/doctor-mappings", {
				method: "PUT",
				headers,
				body: JSON.stringify({
					mappings: doctors.map((d) => ({
						staffId: d.staffId,
						externalDoctorId: d.externalDoctorId,
						isSyncEnabled: d.isSyncEnabled,
					})),
				}),
			});

			if (!mappingsRes.ok) {
				throw new Error("Не удалось сохранить сопоставления врачей");
			}

			showToast("Настройки интеграции успешно сохранены", "success");
			void loadData();
		} catch (e) {
			showToast(e instanceof Error ? e.message : "Ошибка при сохранении", "error");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="space-y-6">
			{/* Карточка 1: Шапка и статус */}
			<div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-xs">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-start gap-3.5">
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
							<Globe className="h-6 w-6" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 className="text-base font-semibold text-[var(--ink)]">
									МедФлекс и ПроДокторов
								</h2>
								<span
									className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
										settings.isActive
											? "bg-[var(--success-soft)] text-[var(--success)]"
											: "bg-[var(--paper-soft)] text-[var(--ink-muted)]"
									}`}
								>
									{settings.isActive ? "Активно" : "Отключено"}
								</span>
							</div>
							<p className="mt-1 text-sm text-[var(--ink-muted)]">
								Выгрузка прейскуранта услуг по номенклатуре, синхронизация свободных слотов расписания и приём онлайн-записи
							</p>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--ink)] select-none">
							<input
								type="checkbox"
								checked={settings.isActive}
								onChange={(e) => setSettings((prev) => ({ ...prev, isActive: e.target.checked }))}
								className="h-4 w-4 rounded-md border-[var(--line)] text-[var(--primary)] focus:ring-[var(--primary)]"
							/>
							<span>Включить интеграцию</span>
						</label>
					</div>
				</div>

				{/* Параметры подключения */}
				<div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<label className="mb-1.5 block text-xs font-medium text-[var(--ink-muted)]">
							Идентификатор клиники в МедФлекс (Clinic ID)
						</label>
						<input
							type="text"
							value={settings.clinicExternalId}
							onChange={(e) => setSettings((prev) => ({ ...prev, clinicExternalId: e.target.value }))}
							placeholder="Например: clinic-7890"
							className="h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 text-sm text-[var(--ink)] placeholder-[var(--ink-muted)]/50 focus:border-[var(--primary)] focus:outline-hidden"
						/>
						<p className="mt-1 text-xs text-[var(--ink-muted)]">
							Используется для персонального маршрута выгрузки прейскуранта и слотов
						</p>
					</div>

					<div>
						<label className="mb-1.5 block text-xs font-medium text-[var(--ink-muted)]">
							API Токен интеграции (при наличии)
						</label>
						<input
							type="password"
							value={settings.apiKey}
							onChange={(e) => setSettings((prev) => ({ ...prev, apiKey: e.target.value }))}
							placeholder="Вставьте токен из личного кабинета"
							className="h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 text-sm text-[var(--ink)] placeholder-[var(--ink-muted)]/50 focus:border-[var(--primary)] focus:outline-hidden"
						/>
						<p className="mt-1 text-xs text-[var(--ink-muted)]">
							Токен для защищенного доступа к внешним методам агрегатора
						</p>
					</div>

					<div className="md:col-span-2">
						<label className="mb-1.5 block text-xs font-medium text-[var(--ink-muted)]">
							Секрет проверки подписи вебхуков (HMAC-SHA256)
						</label>
						<div className="flex flex-col sm:flex-row gap-2">
							<input
								type="text"
								value={settings.webhookSecret}
								onChange={(e) => setSettings((prev) => ({ ...prev, webhookSecret: e.target.value }))}
								placeholder="Ключ для подписи x-medflex-signature"
								className="h-9 flex-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 font-mono text-sm text-[var(--ink)] placeholder-[var(--ink-muted)]/50 focus:border-[var(--primary)] focus:outline-hidden"
							/>
							<button
								type="button"
								onClick={handleGenerateSecret}
								className="inline-flex h-9 shrink-0 whitespace-nowrap items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 text-xs font-medium text-[var(--ink)] transition-colors hover:bg-[var(--paper-soft)]"
							>
								<RefreshCw className="h-3.5 w-3.5" />
								<span>Сгенерировать</span>
							</button>
						</div>
						<p className="mt-1 text-xs text-[var(--ink-muted)]">
							Укажите этот ключ в личном кабинете МедФлекс для криптографической защиты от поддельных записей
						</p>
					</div>

					<div className="md:col-span-2">
						<label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-3 text-sm font-medium text-[var(--ink)] select-none">
							<input
								type="checkbox"
								checked={settings.autoConfirmBookings}
								onChange={(e) => setSettings((prev) => ({ ...prev, autoConfirmBookings: e.target.checked }))}
								className="h-4 w-4 rounded-md border-[var(--line)] text-[var(--primary)] focus:ring-[var(--primary)]"
							/>
							<div>
								<span>Автоматически подтверждать запись</span>
								<p className="text-xs font-normal text-[var(--ink-muted)]">
									При включении запись сразу переходит в статус «Подтверждён». При выключении остаётся «Запланирован» для модерации регистратором.
								</p>
							</div>
						</label>
					</div>
				</div>
			</div>

			{/* Карточка 2: Ссылки для агрегатора */}
			<div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-xs">
				<h3 className="text-sm font-semibold text-[var(--ink)]">
					Ссылки для настройки в личном кабинете агрегатора
				</h3>
				<p className="mt-1 text-xs text-[var(--ink-muted)]">
					Скопируйте эти URL и вставьте их в соответствующие поля кабинета МедФлекс или ПроДокторов
				</p>

				<div className="mt-4 space-y-3.5">
					{/* Ссылка на XML */}
					<div className="rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]/50 p-3.5">
						<div className="flex items-center justify-between gap-2">
							<span className="text-xs font-medium text-[var(--ink)]">
								URL XML-прейскуранта (YML-фид)
							</span>
							<button
								type="button"
								onClick={() => handleCopy(pricelistUrl, "xml")}
								className="inline-flex h-8 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--paper)] px-2.5 text-xs font-medium text-[var(--ink)] transition-colors hover:bg-[var(--paper-soft)]"
							>
								{copiedField === "xml" ? (
									<>
										<Check className="h-3.5 w-3.5 text-[var(--success)]" />
										<span>Скопировано</span>
									</>
								) : (
									<>
										<Copy className="h-3.5 w-3.5" />
										<span>Копировать</span>
									</>
								)}
							</button>
						</div>
						<div className="mt-1.5 truncate font-mono text-xs text-[var(--ink-muted)]">
							{pricelistUrl}
						</div>
					</div>

					{/* Ссылка на Webhook */}
					<div className="rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]/50 p-3.5">
						<div className="flex items-center justify-between gap-2">
							<span className="text-xs font-medium text-[var(--ink)]">
								URL входящего вебхука онлайн-записи
							</span>
							<button
								type="button"
								onClick={() => handleCopy(webhookUrl, "webhook")}
								className="inline-flex h-8 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--paper)] px-2.5 text-xs font-medium text-[var(--ink)] transition-colors hover:bg-[var(--paper-soft)]"
							>
								{copiedField === "webhook" ? (
									<>
										<Check className="h-3.5 w-3.5 text-[var(--success)]" />
										<span>Скопировано</span>
									</>
								) : (
									<>
										<Copy className="h-3.5 w-3.5" />
										<span>Копировать</span>
									</>
								)}
							</button>
						</div>
						<div className="mt-1.5 truncate font-mono text-xs text-[var(--ink-muted)]">
							{webhookUrl}
						</div>
					</div>
				</div>
			</div>

			{/* Карточка 3: Маппинг врачей */}
			<div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-xs">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-sm font-semibold text-[var(--ink)]">
							Сопоставление врачей клиники
						</h3>
						<p className="mt-1 text-xs text-[var(--ink-muted)]">
							Укажите ID врача на портале ПроДокторов для каждого специалиста клиники
						</p>
					</div>
					<span className="text-xs text-[var(--ink-muted)]">
						Всего врачей: {doctors.length}
					</span>
				</div>

				<div className="mt-4 overflow-hidden rounded-xl border border-[var(--line)]">
					{doctors.length === 0 ? (
						<div className="flex flex-col items-center justify-center p-8 text-center">
							<UserCheck className="h-8 w-8 text-[var(--ink-muted)]/50" />
							<p className="mt-2 text-sm text-[var(--ink-muted)]">
								В клинике пока нет активных врачей для сопоставления
							</p>
						</div>
					) : (
						<>
							{/* Десктопная таблица */}
							<div className="hidden sm:block overflow-x-auto">
								<table className="w-full text-left text-sm">
									<thead className="border-b border-[var(--line)] bg-[var(--paper-soft)]/60 text-xs font-medium text-[var(--ink-muted)]">
										<tr>
											<th className="px-4 py-2.5">Врач клиники</th>
											<th className="px-4 py-2.5">Внешний ID (ПроДокторов / МедФлекс)</th>
											<th className="px-4 py-2.5 text-right">Синхронизация</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--line)]">
										{doctors.map((doc) => (
											<tr key={doc.staffId} className="hover:bg-[var(--paper-soft)]/30 transition-colors">
												<td className="px-4 py-3">
													<div className="font-medium text-[var(--ink)]">{doc.fullName}</div>
													<div className="text-xs text-[var(--ink-muted)]">
														{doc.specialties.length > 0 ? doc.specialties.join(", ") : doc.role}
													</div>
												</td>
												<td className="px-4 py-3">
													<input
														type="text"
														value={doc.externalDoctorId}
														onChange={(e) => handleDoctorChange(doc.staffId, e.target.value, doc.isSyncEnabled)}
														placeholder="ID врача на ПроДокторов"
														className="h-8 w-full max-w-xs rounded-md border border-[var(--line)] bg-[var(--paper)] px-2.5 text-xs text-[var(--ink)] placeholder-[var(--ink-muted)]/50 focus:border-[var(--primary)] focus:outline-hidden"
													/>
												</td>
												<td className="px-4 py-3 text-right">
													<label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-[var(--ink)] select-none">
														<input
															type="checkbox"
															checked={doc.isSyncEnabled}
															onChange={(e) => handleDoctorChange(doc.staffId, doc.externalDoctorId, e.target.checked)}
															className="h-4 w-4 rounded-md border-[var(--line)] text-[var(--primary)] focus:ring-[var(--primary)]"
														/>
														<span>Активен</span>
													</label>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							{/* Мобильные карточки (Apple HIG) */}
							<div className="sm:hidden divide-y divide-[var(--line)]">
								{doctors.map((doc) => (
									<div key={doc.staffId} className="p-3.5 space-y-2.5">
										<div className="flex items-start justify-between gap-2">
											<div>
												<div className="font-medium text-sm text-[var(--ink)]">{doc.fullName}</div>
												<div className="text-xs text-[var(--ink-muted)]">
													{doc.specialties.length > 0 ? doc.specialties.join(", ") : doc.role}
												</div>
											</div>
											<label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[var(--ink)] shrink-0 select-none">
												<input
													type="checkbox"
													checked={doc.isSyncEnabled}
													onChange={(e) => handleDoctorChange(doc.staffId, doc.externalDoctorId, e.target.checked)}
													className="h-4 w-4 rounded-md border-[var(--line)] text-[var(--primary)] focus:ring-[var(--primary)]"
												/>
												<span>Активен</span>
											</label>
										</div>
										<div>
											<input
												type="text"
												value={doc.externalDoctorId}
												onChange={(e) => handleDoctorChange(doc.staffId, e.target.value, doc.isSyncEnabled)}
												placeholder="ID врача на ПроДокторов"
												className="h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 text-xs text-[var(--ink)] placeholder-[var(--ink-muted)]/50 focus:border-[var(--primary)] focus:outline-hidden"
											/>
										</div>
									</div>
								))}
							</div>
						</>
					)}
				</div>
			</div>

			{/* Карточка 4: Журнал последних вебхуков */}
			<div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-xs">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-sm font-semibold text-[var(--ink)]">
							Журнал последних входящих событий
						</h3>
						<p className="mt-1 text-xs text-[var(--ink-muted)]">
							История доставки и обработки запросов от МедФлекс и ПроДокторов
						</p>
					</div>
					<button
						type="button"
						onClick={loadData}
						className="inline-flex h-8 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--paper)] px-2.5 text-xs font-medium text-[var(--ink)] transition-colors hover:bg-[var(--paper-soft)]"
					>
						<RefreshCw className="h-3 w-3" />
						<span>Обновить</span>
					</button>
				</div>

				<div className="mt-4 overflow-hidden rounded-xl border border-[var(--line)]">
					{logs.length === 0 ? (
						<div className="flex flex-col items-center justify-center p-8 text-center">
							<Clock className="h-8 w-8 text-[var(--ink-muted)]/50" />
							<p className="mt-2 text-sm text-[var(--ink-muted)]">
								Входящих вебхуков пока не зафиксировано
							</p>
						</div>
					) : (
						<>
							{/* Десктопная таблица */}
							<div className="hidden sm:block overflow-x-auto">
								<table className="w-full text-left text-sm">
									<thead className="border-b border-[var(--line)] bg-[var(--paper-soft)]/60 text-xs font-medium text-[var(--ink-muted)]">
										<tr>
											<th className="px-4 py-2.5">Дата и время</th>
											<th className="px-4 py-2.5">Событие</th>
											<th className="px-4 py-2.5">Идентификатор доставки</th>
											<th className="px-4 py-2.5 text-right">Статус</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--line)]">
										{logs.map((log) => (
											<tr key={log.id} className="hover:bg-[var(--paper-soft)]/30 transition-colors">
												<td className="px-4 py-2.5 text-xs text-[var(--ink)]">
													{new Date(log.createdAt).toLocaleString("ru-RU")}
												</td>
												<td className="px-4 py-2.5 text-xs font-medium text-[var(--ink)]">
													{log.eventType === "booking_created"
														? "Новая запись"
														: log.eventType === "booking_cancelled"
															? "Отмена записи"
															: log.eventType}
												</td>
												<td className="px-4 py-2.5 font-mono text-xs text-[var(--ink-muted)]">
													{log.deliveryId}
												</td>
												<td className="px-4 py-2.5 text-right">
													<span
														className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
															log.status === "processed"
																? "bg-[var(--success-soft)] text-[var(--success)]"
																: log.status === "conflict"
																	? "bg-[var(--warning-bg)] text-[var(--warning)]"
																	: log.status === "error"
																		? "bg-[var(--danger-soft)] text-[var(--danger)]"
																		: "bg-[var(--paper-soft)] text-[var(--ink-muted)]"
														}`}
													>
														{log.status === "processed"
															? "Обработано"
															: log.status === "conflict"
																? "Конфликт"
																: log.status === "error"
																	? "Ошибка"
																	: "Игнорировано"}
													</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							{/* Мобильные карточки событий (Apple HIG) */}
							<div className="sm:hidden divide-y divide-[var(--line)]">
								{logs.map((log) => (
									<div key={log.id} className="p-3.5 space-y-1.5">
										<div className="flex items-center justify-between gap-2">
											<span className="text-xs font-semibold text-[var(--ink)]">
												{log.eventType === "booking_created"
													? "Новая запись"
													: log.eventType === "booking_cancelled"
														? "Отмена записи"
														: log.eventType}
											</span>
											<span
												className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
													log.status === "processed"
														? "bg-[var(--success-soft)] text-[var(--success)]"
														: log.status === "conflict"
															? "bg-[var(--warning-bg)] text-[var(--warning)]"
															: log.status === "error"
																? "bg-[var(--danger-soft)] text-[var(--danger)]"
																: "bg-[var(--paper-soft)] text-[var(--ink-muted)]"
												}`}
											>
												{log.status === "processed"
													? "Обработано"
													: log.status === "conflict"
														? "Конфликт"
														: log.status === "error"
															? "Ошибка"
															: "Игнорировано"}
											</span>
										</div>
										<div className="flex items-center justify-between gap-2 text-xs text-[var(--ink-muted)]">
											<span>{new Date(log.createdAt).toLocaleString("ru-RU")}</span>
											<span className="font-mono text-[11px]">{log.deliveryId}</span>
										</div>
									</div>
								))}
							</div>
						</>
					)}
				</div>
			</div>

			{/* Футер: ровно 1 Primary CTA кнопка (Мандат 8am) */}
			<div className="flex items-center justify-end gap-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 shadow-xs">
				<button
					type="button"
					onClick={handleSaveAll}
					disabled={isSaving}
					className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--primary-hover)] focus:outline-hidden disabled:opacity-60"
				>
					{isSaving ? (
						<>
							<RefreshCw className="h-4 w-4 animate-spin" />
							<span>Сохранение...</span>
						</>
					) : (
						<>
							<Save className="h-4 w-4" />
							<span>Сохранить настройки</span>
						</>
					)}
				</button>
			</div>
		</div>
	);
};
