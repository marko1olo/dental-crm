/**
 * Пульт отправки сообщений: шлюзы, журнал, шаблоны, правила рассылки.
 *
 * ЗАЧЕМ ЭТОТ КОМПОНЕНТ ПОЯВИЛСЯ
 * Раздел «Коммуникации» состоял из списков, которые ничего не отправляли:
 * виджеты вроде MessageTemplateCatalogsWidget читали адреса, возвращавшие
 * выдуманные записи, редактировать шаблон было нельзя, а узнать, почему
 * сообщение не ушло, — негде. Отправки в проекте не существовало вовсе.
 *
 * Здесь всё опирается на настоящие данные:
 *   • состояние шлюзов — что действительно настроено и сколько денег на счету;
 *   • журнал очереди с причиной отказа по каждому сообщению;
 *   • редактор шаблонов с предпросмотром и счётчиком сегментов SMS;
 *   • правила: тихие часы, суточный предел, автоматические напоминания.
 *
 * Ничего не подставляется «на всякий случай»: если данных нет, так и написано.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

type ChannelCode = "sms" | "email" | "whatsapp" | "telegram" | "vk" | "max";

type GatewayStatus = {
	channels: {
		sms: {
			configured: boolean;
			provider: string | null;
			sender: string | null;
			balance: { amount: number; currency: string } | null;
			balanceError: string | null;
		};
		email: { configured: boolean; host: string | null; from: string | null; requireTls: boolean };
		whatsapp: { configured: boolean };
		telegram: { configured: boolean };
		vk: { configured: boolean; detail: string };
		max: { configured: boolean; detail: string };
	};
	deliverableChannels: string[];
};

type TemplateItem = {
	id: string;
	title: string;
	channel: string;
	intent: string;
	body: string;
	variables: string[];
	isActive: boolean;
};

type OutboxItem = {
	id: string;
	channel: string;
	intent: string;
	status: string;
	recipientAddress: string;
	body: string;
	attempts: number;
	maxAttempts: number;
	sentAt: string | null;
	createdAt: string;
	nextAttemptAt: string;
	lastErrorClass: string | null;
	lastErrorMessage: string | null;
};

type CommunicationSettings = {
	timezone: string;
	quietHoursStartMinute: number;
	quietHoursEndMinute: number;
	deferServiceInQuietHours: boolean;
	blockMarketingInQuietHours: boolean;
	dailyLimitPerPatient: number;
	channelFallback: string[];
	appointmentReminderEnabled: boolean;
	appointmentReminderLeadHours: number[];
	appointmentReminderWindowMinutes: number;
};

type PreviewResult = {
	text: string;
	fits: boolean;
	problems: string[];
	length: number;
	limit: number;
	sms: { encoding: string; characters: number; segments: number; charactersLeftInSegment: number } | null;
};

const channelLabels: Record<string, string> = {
	sms: "SMS",
	email: "Почта",
	whatsapp: "WhatsApp",
	telegram: "Телеграм",
	vk: "ВКонтакте",
	max: "MAX",
	phone: "Звонок",
	in_person: "В кабинете"
};

const intentLabels: Record<string, string> = {
	appointment_confirmation: "Подтверждение приёма",
	payment_reminder: "Напоминание об оплате",
	post_visit_instruction: "Памятка после приёма",
	recall: "Повторный визит",
	document_ready: "Документ готов",
	imaging_review: "Снимок",
	general: "Произвольное"
};

/**
 * Подписи статусов очереди. `suppressed` намеренно отделён от `failed`: это не
 * «шлюз отклонил», а «отправлять было нечем или некому», и действие
 * администратора здесь другое.
 */
const statusLabels: Record<string, string> = {
	queued: "В очереди",
	sending: "Отправляется",
	sent: "Отправлено",
	delivered: "Доставлено",
	failed: "Ошибка",
	cancelled: "Отменено",
	suppressed: "Не отправлено"
};

function minutesToTime(minutes: number): string {
	const hours = Math.floor(minutes / 60) % 24;
	const rest = minutes % 60;
	return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function timeToMinutes(value: string): number | null {
	const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
	if (!match) return null;
	const hours = Number.parseInt(match[1] ?? "", 10);
	const minutes = Number.parseInt(match[2] ?? "", 10);
	if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 23 || minutes > 59) return null;
	return hours * 60 + minutes;
}

function formatMoment(value: string | null): string {
	if (!value) return "—";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "—";
	return parsed.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

async function readJson<T>(response: Response): Promise<T> {
	const payload = (await response.json().catch(() => null)) as unknown;
	if (!response.ok) {
		const message =
			payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
				? payload.message
				: `Сервер ответил ${response.status}`;
		throw new Error(message);
	}
	return payload as T;
}

export function MessageDeliveryConsole() {
	const [gateways, setGateways] = useState<GatewayStatus | null>(null);
	const [templates, setTemplates] = useState<TemplateItem[]>([]);
	const [outbox, setOutbox] = useState<OutboxItem[]>([]);
	const [summary, setSummary] = useState<Record<string, number>>({});
	const [settings, setSettings] = useState<CommunicationSettings | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<string>("");

	const [draftTitle, setDraftTitle] = useState("");
	const [draftChannel, setDraftChannel] = useState<ChannelCode>("sms");
	const [draftIntent, setDraftIntent] = useState("appointment_confirmation");
	const [draftBody, setDraftBody] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [preview, setPreview] = useState<PreviewResult | null>(null);
	const [previewError, setPreviewError] = useState<string | null>(null);

	const loadAll = useCallback(async () => {
		setLoadError(null);
		try {
			const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
			const [gatewayResponse, templateResponse, outboxResponse, settingsResponse] = await Promise.all([
				fetch("/api/communications/gateway-status"),
				fetch("/api/communications/templates"),
				fetch(`/api/communications/outbox${query}`),
				fetch("/api/communications/settings")
			]);

			const gatewayData = await readJson<GatewayStatus>(gatewayResponse);
			const templateData = await readJson<{ templates: TemplateItem[] }>(templateResponse);
			const outboxData = await readJson<{ items: OutboxItem[]; summary: Record<string, number> }>(outboxResponse);
			const settingsData = await readJson<{ settings: CommunicationSettings }>(settingsResponse);

			setGateways(gatewayData);
			setTemplates(templateData.templates);
			setOutbox(outboxData.items);
			setSummary(outboxData.summary);
			setSettings(settingsData.settings);
		} catch (error) {
			// Пустой экран без объяснения — это то, от чего здесь уходим.
			setLoadError(error instanceof Error ? error.message : String(error));
		}
	}, [statusFilter]);

	useEffect(() => {
		void loadAll();
	}, [loadAll]);

	// Предпросмотр считает сегменты SMS на сервере — теми же правилами, по
	// которым потом проверяется отправка. Расхождение здесь означало бы, что
	// администратор видит «влезает», а шлюз берёт деньги за три сегмента.
	useEffect(() => {
		if (!draftBody.trim()) {
			setPreview(null);
			setPreviewError(null);
			return;
		}
		const timer = setTimeout(() => {
			void (async () => {
				try {
					const response = await fetch("/api/communications/templates/preview", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ body: draftBody, channel: draftChannel, allowPhi: true })
					});
					setPreview(await readJson<PreviewResult>(response));
					setPreviewError(null);
				} catch (error) {
					setPreview(null);
					setPreviewError(error instanceof Error ? error.message : String(error));
				}
			})();
		}, 350);
		return () => clearTimeout(timer);
	}, [draftBody, draftChannel]);

	const configuredChannels = useMemo(() => {
		if (!gateways) return [];
		return (Object.entries(gateways.channels) as [ChannelCode, { configured: boolean }][])
			.filter(([, value]) => value.configured)
			.map(([code]) => code);
	}, [gateways]);

	function resetDraft() {
		setEditingId(null);
		setDraftTitle("");
		setDraftBody("");
		setDraftChannel("sms");
		setDraftIntent("appointment_confirmation");
		setPreview(null);
		setPreviewError(null);
	}

	async function saveTemplate() {
		setBusy(true);
		setNotice(null);
		try {
			const payload = {
				title: draftTitle,
				channel: draftChannel,
				intent: draftIntent,
				body: draftBody,
				allowPhi: true
			};
			const response = editingId
				? await fetch(`/api/communications/templates/${editingId}`, {
						method: "PATCH",
						headers: { "content-type": "application/json" },
						body: JSON.stringify(payload)
					})
				: await fetch("/api/communications/templates", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify(payload)
					});
			await readJson(response);
			setNotice(editingId ? "Шаблон обновлён." : "Шаблон создан.");
			resetDraft();
			await loadAll();
		} catch (error) {
			setNotice(error instanceof Error ? error.message : String(error));
		} finally {
			setBusy(false);
		}
	}

	async function outboxAction(outboxId: string, action: "cancel" | "retry") {
		setBusy(true);
		setNotice(null);
		try {
			const response = await fetch(`/api/communications/outbox/${outboxId}/${action}`, { method: "POST" });
			await readJson(response);
			setNotice(action === "cancel" ? "Сообщение отменено." : "Сообщение возвращено в очередь.");
			await loadAll();
		} catch (error) {
			setNotice(error instanceof Error ? error.message : String(error));
		} finally {
			setBusy(false);
		}
	}

	async function runDispatch() {
		setBusy(true);
		setNotice(null);
		try {
			const response = await fetch("/api/communications/outbox/dispatch", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ batchSize: 25 })
			});
			const data = await readJson<{ report: { claimed: number; sent: number; failed: number; suppressed: number } }>(
				response
			);
			setNotice(
				`Разобрано ${data.report.claimed}: отправлено ${data.report.sent}, ошибок ${data.report.failed}, ` +
					`не отправлено ${data.report.suppressed}.`
			);
			await loadAll();
		} catch (error) {
			setNotice(error instanceof Error ? error.message : String(error));
		} finally {
			setBusy(false);
		}
	}

	async function runReminders() {
		setBusy(true);
		setNotice(null);
		try {
			const response = await fetch("/api/communications/reminders/run", { method: "POST" });
			const data = await readJson<{ report: { queued: number; alreadyQueued: number; problems: string[] } }>(response);
			setNotice(
				data.report.problems.length > 0
					? data.report.problems.join(" ")
					: `Поставлено напоминаний: ${data.report.queued}. Уже стояли: ${data.report.alreadyQueued}.`
			);
			await loadAll();
		} catch (error) {
			setNotice(error instanceof Error ? error.message : String(error));
		} finally {
			setBusy(false);
		}
	}

	async function saveSettings(patch: Partial<CommunicationSettings>) {
		setBusy(true);
		setNotice(null);
		try {
			const response = await fetch("/api/communications/settings", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(patch)
			});
			const data = await readJson<{ settings: CommunicationSettings }>(response);
			setSettings(data.settings);
			setNotice("Правила рассылки сохранены.");
		} catch (error) {
			setNotice(error instanceof Error ? error.message : String(error));
		} finally {
			setBusy(false);
		}
	}

	if (loadError) {
		return (
			<section className="panel" data-testid="message-delivery-console">
				<div className="panel-heading">
					<h2>Отправка сообщений</h2>
				</div>
				<p role="alert">Не удалось получить данные: {loadError}</p>
				<button className="secondary-button" type="button" onClick={() => void loadAll()}>
					Повторить
				</button>
			</section>
		);
	}

	return (
		<section className="panel" data-testid="message-delivery-console">
			<div className="panel-heading">
				<h2>Отправка сообщений</h2>
				<div className="quick-chips-row">
					<button className="secondary-button" type="button" onClick={() => void runDispatch()} disabled={busy}>
						Разобрать очередь
					</button>
					<button className="secondary-button" type="button" onClick={() => void runReminders()} disabled={busy}>
						Поставить напоминания
					</button>
				</div>
			</div>

			{notice ? (
				<p role="status" aria-live="polite">
					{notice}
				</p>
			) : null}

			{/* ── Шлюзы ─────────────────────────────────────────────────────── */}
			<h3>Каналы</h3>
			{gateways === null ? (
				<p>Загружаю состояние каналов…</p>
			) : (
				<>
					{configuredChannels.length === 0 ? (
						<p role="alert">
							Ни один канал не настроен: сообщения не отправятся. Ключи шлюзов задаются в окружении сервера
							(SMS, SMTP, WhatsApp, Telegram).
						</p>
					) : null}
					<ul className="quick-chips-row" style={{ listStyle: "none", padding: 0, flexWrap: "wrap" }}>
						{(Object.keys(gateways.channels) as ChannelCode[]).map((code) => {
							const channel = gateways.channels[code];
							return (
								<li key={code}>
									<span className={`status-pill ${channel.configured ? "status-completed" : "status-cancelled"}`}>
										{channelLabels[code] ?? code}: {channel.configured ? "настроен" : "не настроен"}
									</span>
								</li>
							);
						})}
					</ul>
					{gateways.channels.sms.configured ? (
						<p>
							SMS-шлюз: {gateways.channels.sms.provider ?? "—"}
							{gateways.channels.sms.sender ? `, отправитель ${gateways.channels.sms.sender}` : ""}.{" "}
							{gateways.channels.sms.balance
								? `Остаток ${gateways.channels.sms.balance.amount.toFixed(2)} ${gateways.channels.sms.balance.currency}.`
								: gateways.channels.sms.balanceError
									? `Остаток не получен: ${gateways.channels.sms.balanceError}`
									: ""}
						</p>
					) : null}
				</>
			)}

			{/* ── Журнал ────────────────────────────────────────────────────── */}
			<h3>Журнал отправки</h3>
			<div className="quick-chips-row" style={{ flexWrap: "wrap" }}>
				<button
					type="button"
					className={`quick-chip ${statusFilter === "" ? "selected" : ""}`}
					onClick={() => setStatusFilter("")}
				>
					Все
				</button>
				{Object.entries(statusLabels).map(([code, label]) => (
					<button
						key={code}
						type="button"
						className={`quick-chip ${statusFilter === code ? "selected" : ""}`}
						onClick={() => setStatusFilter(code)}
					>
						{label}
						{summary[code] ? ` · ${summary[code]}` : ""}
					</button>
				))}
			</div>

			{outbox.length === 0 ? (
				<p>Сообщений с такими условиями нет.</p>
			) : (
				<table>
					<thead>
						<tr>
							<th scope="col">Создано</th>
							<th scope="col">Канал</th>
							<th scope="col">Получатель</th>
							<th scope="col">Текст</th>
							<th scope="col">Состояние</th>
							<th scope="col">Действие</th>
						</tr>
					</thead>
					<tbody>
						{outbox.map((item) => (
							<tr key={item.id}>
								<td>{formatMoment(item.createdAt)}</td>
								<td>{channelLabels[item.channel] ?? item.channel}</td>
								<td>{item.recipientAddress}</td>
								<td title={item.body}>{item.body.length > 80 ? `${item.body.slice(0, 80)}…` : item.body}</td>
								<td>
									<span className="status-pill">{statusLabels[item.status] ?? item.status}</span>
									{/* Причина отказа показывается прямо в строке: раньше её негде было узнать. */}
									{item.lastErrorMessage ? (
										<>
											<br />
											<small>{item.lastErrorMessage}</small>
										</>
									) : null}
									{item.attempts > 0 ? (
										<>
											<br />
											<small>
												попыток {item.attempts} из {item.maxAttempts}
											</small>
										</>
									) : null}
								</td>
								<td>
									{item.status === "queued" || item.status === "sending" ? (
										<button
											className="secondary-button"
											type="button"
											disabled={busy}
											onClick={() => void outboxAction(item.id, "cancel")}
										>
											Отменить
										</button>
									) : item.status === "failed" || item.status === "cancelled" || item.status === "suppressed" ? (
										<button
											className="secondary-button"
											type="button"
											disabled={busy}
											onClick={() => void outboxAction(item.id, "retry")}
										>
											Повторить
										</button>
									) : (
										"—"
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}

			{/* ── Шаблоны ───────────────────────────────────────────────────── */}
			<h3>Шаблоны сообщений</h3>
			{templates.length === 0 ? (
				<p>Шаблонов пока нет. Без шаблона «Подтверждение приёма» автоматические напоминания не включаются.</p>
			) : (
				<ul style={{ listStyle: "none", padding: 0 }}>
					{templates.map((template) => (
						<li key={template.id}>
							<strong>{template.title}</strong> · {channelLabels[template.channel] ?? template.channel} ·{" "}
							{intentLabels[template.intent] ?? template.intent}
							{template.isActive ? "" : " · выключен"}
							<br />
							<small>{template.body}</small>{" "}
							<button
								className="secondary-button"
								type="button"
								onClick={() => {
									setEditingId(template.id);
									setDraftTitle(template.title);
									setDraftChannel(template.channel as ChannelCode);
									setDraftIntent(template.intent);
									setDraftBody(template.body);
								}}
							>
								Изменить
							</button>
						</li>
					))}
				</ul>
			)}

			<div>
				<label htmlFor="template-title">Название</label>
				<input
					id="template-title"
					type="text"
					value={draftTitle}
					onChange={(event) => setDraftTitle(event.target.value)}
					placeholder="Напоминание о приёме"
				/>

				<label htmlFor="template-channel">Канал</label>
				<select
					id="template-channel"
					value={draftChannel}
					onChange={(event) => setDraftChannel(event.target.value as ChannelCode)}
				>
					{["sms", "email", "whatsapp", "telegram"].map((code) => (
						<option key={code} value={code}>
							{channelLabels[code]}
						</option>
					))}
				</select>

				<label htmlFor="template-intent">Назначение</label>
				<select id="template-intent" value={draftIntent} onChange={(event) => setDraftIntent(event.target.value)}>
					{Object.entries(intentLabels).map(([code, label]) => (
						<option key={code} value={code}>
							{label}
						</option>
					))}
				</select>

				<label htmlFor="template-body">Текст</label>
				<textarea
					id="template-body"
					rows={4}
					value={draftBody}
					onChange={(event) => setDraftBody(event.target.value)}
					placeholder="{patient}, напоминаем: приём {date} в {time}."
				/>

				{previewError ? <p role="alert">{previewError}</p> : null}
				{preview ? (
					<div>
						<strong>Как увидит пациент:</strong>
						<p>{preview.text}</p>
						<small>
							{preview.length} симв. из {preview.limit}
							{preview.sms
								? ` · ${preview.sms.encoding === "ucs2" ? "кириллица" : "латиница"}, сегментов ${preview.sms.segments}, ` +
									`свободно ${preview.sms.charactersLeftInSegment}`
								: ""}
						</small>
						{preview.problems.length > 0 ? <p role="alert">{preview.problems.join(" ")}</p> : null}
					</div>
				) : null}

				<button
					className="primary-button"
					type="button"
					disabled={busy || !draftTitle.trim() || !draftBody.trim()}
					onClick={() => void saveTemplate()}
				>
					{editingId ? "Сохранить изменения" : "Создать шаблон"}
				</button>
				{editingId ? (
					<button className="secondary-button" type="button" onClick={resetDraft}>
						Отменить правку
					</button>
				) : null}
			</div>

			{/* ── Правила ───────────────────────────────────────────────────── */}
			<h3>Правила рассылки</h3>
			{settings === null ? (
				<p>Загружаю правила…</p>
			) : (
				<div>
					<p>
						Часовой пояс: {settings.timezone}. Тихие часы: {minutesToTime(settings.quietHoursStartMinute)} —{" "}
						{minutesToTime(settings.quietHoursEndMinute)}. Сервисные сообщения в это время откладываются до утра,
						рекламные не отправляются. Не более {settings.dailyLimitPerPatient} сообщений одному пациенту в сутки.
					</p>

					<label htmlFor="quiet-start">Тихие часы с</label>
					<input
						id="quiet-start"
						type="time"
						defaultValue={minutesToTime(settings.quietHoursStartMinute)}
						onBlur={(event) => {
							const minutes = timeToMinutes(event.target.value);
							if (minutes !== null && minutes !== settings.quietHoursStartMinute) {
								void saveSettings({ quietHoursStartMinute: minutes });
							}
						}}
					/>
					<label htmlFor="quiet-end">до</label>
					<input
						id="quiet-end"
						type="time"
						defaultValue={minutesToTime(settings.quietHoursEndMinute)}
						onBlur={(event) => {
							const minutes = timeToMinutes(event.target.value);
							if (minutes !== null && minutes !== settings.quietHoursEndMinute) {
								void saveSettings({ quietHoursEndMinute: minutes });
							}
						}}
					/>

					<label htmlFor="reminders-enabled">
						<input
							id="reminders-enabled"
							type="checkbox"
							checked={settings.appointmentReminderEnabled}
							disabled={busy}
							onChange={(event) => void saveSettings({ appointmentReminderEnabled: event.target.checked })}
						/>{" "}
						Напоминать о приёме автоматически за {settings.appointmentReminderLeadHours.join(", ")} ч
					</label>
					{settings.appointmentReminderEnabled ? null : (
						<p>
							<small>
								Пока выключено. Для включения нужен активный шаблон с назначением «Подтверждение приёма» —
								иначе автоматика не отправит ничего и промолчит об этом.
							</small>
						</p>
					)}
				</div>
			)}
		</section>
	);
}

export default MessageDeliveryConsole;
