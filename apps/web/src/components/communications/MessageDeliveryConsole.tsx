import { actionFailureToast } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";
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
 *   • редактор шаблонов с предпросмотром, справочником {переменных} и счётчиком сегментов SMS;
 *   • правила: тихие часы, суточный предел, автоматические напоминания.
 *
 * Ничего не подставляется «на всякий случай»: если данных нет, так и написано.
 *
 * ОФОРМЛЕНИЕ. Всё на переменных темы через styles/dente-operations.css: первая
 * версия рисовалась голыми <table> и <ul> с оформлением в атрибуте style, и в
 * тёмной теме это выглядело как необработанная разметка. Состояние сообщения
 * передаётся текстом и значком, а не только цветом.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useCommunicationsQueries } from "../../hooks/domains/useCommunicationsQueries";

import {
	type DispatchReport,
	describeDispatchReport,
	describeReminderReport,
	failNotice,
	formatMoment,
	type Notice,
	type ReminderScheduleReport,
} from "./deliveryReportNotice.js";

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
		email: {
			configured: boolean;
			host: string | null;
			from: string | null;
			requireTls: boolean;
		};
		whatsapp: { configured: boolean };
		telegram: { configured: boolean };
		vk: { configured: boolean; detail: string };
		max: { configured: boolean; detail: string };
	};
	/** Разбирает ли кто-нибудь очередь и сколько в ней просроченных сообщений. */
	automaticSending: {
		enabled: boolean;
		intervalSeconds: number | null;
		batchSize: number | null;
		detail: string;
		enableWith: string;
		waiting: number;
		oldestWaitingAt: string | null;
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

/** Справочник подстановок из GET /api/communications/variables */
type TemplateVariable = {
	key: string;
	label: string;
	example: string;
	phi: boolean;
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
	sms: {
		encoding: string;
		characters: number;
		segments: number;
		charactersLeftInSegment: number;
	} | null;
};

const channelLabels: Record<string, string> = {
	sms: "SMS",
	email: "Почта",
	whatsapp: "WhatsApp",
	telegram: "Телеграм",
	vk: "ВКонтакте",
	max: "MAX",
	phone: "Звонок",
	in_person: "В кабинете",
};

const intentLabels: Record<string, string> = {
	appointment_confirmation: "Подтверждение приёма",
	payment_reminder: "Напоминание об оплате",
	post_visit_instruction: "Памятка после приёма",
	recall: "Повторный визит",
	document_ready: "Документ готов",
	imaging_review: "Снимок",
	general: "Произвольное",
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
	suppressed: "Не отправлено",
};

/** Вид состояния. Цвет дублируется значком: он читается и без цветовосприятия. */
const statusTone: Record<string, "ok" | "warn" | "bad" | "info" | "muted"> = {
	queued: "info",
	sending: "info",
	sent: "info",
	delivered: "ok",
	failed: "bad",
	cancelled: "muted",
	suppressed: "warn",
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
	if (
		!Number.isFinite(hours) ||
		!Number.isFinite(minutes) ||
		hours > 23 ||
		minutes > 59
	)
		return null;
	return hours * 60 + minutes;
}

async function readJson<T>(response: Response): Promise<T> {
	const payload = (await response.json().catch((err) => {
		showToast(actionFailureToast("Ошибка ответа сервера", (err as { status?: number })?.status ?? null), "error");
		return null;
	})) as unknown;
	if (!response.ok) {
		const message =
			payload &&
			typeof payload === "object" &&
			"message" in payload &&
			typeof payload.message === "string"
				? payload.message
				: `Сервер ответил ${response.status}`;
		throw new Error(message);
	}
	return payload as T;
}

/*
 * `Notice`, `failNotice`, `formatMoment` и — главное — весь разбор отчётов сервера
 * живут в ./deliveryReportNotice.ts. Здесь их больше нет намеренно: текст итога
 * собирался прямо в обработчиках кнопок, и собирался неполно (сервер возвращал семь
 * счётчиков, обработчик читал четыре), а проверить это можно было только глазами в
 * браузере. Вынесенные чистые функции проверяются обычным тестом.
 */
export function MessageDeliveryConsole() {
	const commQueries = useCommunicationsQueries();
	const appLogic = useAppLogicContext();
	const _auth = appLogic?.auth;

	const [gateways, setGateways] = useState<GatewayStatus | null>(null);
	const [templates, setTemplates] = useState<TemplateItem[]>([]);
	const [outbox, setOutbox] = useState<OutboxItem[]>([]);
	const [summary, setSummary] = useState<Record<string, number>>({});
	const [settings, setSettings] = useState<CommunicationSettings | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [notice, setNotice] = useState<Notice | null>(null);
	const [statusFilter, setStatusFilter] = useState<string>("");

	const [draftTitle, setDraftTitle] = useState("");
	const [draftChannel, setDraftChannel] = useState<ChannelCode>("sms");
	const [draftIntent, setDraftIntent] = useState("appointment_confirmation");
	const [draftBody, setDraftBody] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [preview, setPreview] = useState<PreviewResult | null>(null);
	const [previewError, setPreviewError] = useState<string | null>(null);
	/** Каталог {key} для редактора шаблона — GET /api/communications/variables */
	const [variableCatalog, setVariableCatalog] = useState<TemplateVariable[]>(
		[],
	);
	const [uisQuota, setUisQuota] = useState<{
		remaining: number;
		smsQuotaLimit: number;
	} | null>(null);

	/*
	 * Разовая постановка в очередь (POST /api/communications/outbox).
	 * БЫЛО: пульт умел отменять/повторять/разбирать очередь и править шаблоны,
	 * но поставить одно сообщение вручную было нельзя — только кампании или
	 * авто-напоминания. Администратор не мог отправить SMS «приходите завтра»
	 * без конструктора рассылки.
	 */
	const [enqueueChannel, setEnqueueChannel] = useState<
		"sms" | "email" | "whatsapp" | "telegram"
	>("sms");
	const [enqueueIntent, setEnqueueIntent] = useState("general");
	const [enqueueScope, setEnqueueScope] = useState<"service" | "marketing">(
		"service",
	);
	const [enqueueTemplateId, setEnqueueTemplateId] = useState("");
	const [enqueueBody, setEnqueueBody] = useState("");
	const [enqueueRecipient, setEnqueueRecipient] = useState("");
	const [enqueueSubject, setEnqueueSubject] = useState("");
	const [enqueueBusy, setEnqueueBusy] = useState(false);

	const loadAll = useCallback(async () => {
		setLoadError(null);
		try {
			const query = statusFilter
				? `?status=${encodeURIComponent(statusFilter)}`
				: "";

			const [
				gatewayResponse,
				templateResponse,
				outboxResponse,
				settingsResponse,
				variablesResponse,
				quotaResponse,
			] = await Promise.all([
				commQueries.getGatewayStatus(),
				commQueries.getTemplates(),
				commQueries.getOutbox(query),
				commQueries.getSettings(),
				commQueries.getVariables(),
				commQueries.getChatQuota(),
			]);

			const gatewayData = await readJson<GatewayStatus>(gatewayResponse);
			const templateData = await readJson<{ templates: TemplateItem[] }>(
				templateResponse,
			);
			const outboxData = await readJson<{
				items: OutboxItem[];
				summary: Record<string, number>;
			}>(outboxResponse);
			const settingsData = await readJson<{ settings: CommunicationSettings }>(
				settingsResponse,
			);
			const variablesData = await readJson<{ variables: TemplateVariable[] }>(
				variablesResponse,
			);
			const quotaData = await readJson<{
				remaining: number;
				smsQuotaLimit: number;
			}>(quotaResponse);

			setGateways(gatewayData);
			setTemplates(templateData.templates);
			setOutbox(outboxData.items);
			setSummary(outboxData.summary);
			setSettings(settingsData.settings);
			setVariableCatalog(
				Array.isArray(variablesData.variables)
					? variablesData.variables.filter(
							(v) =>
								v &&
								typeof v.key === "string" &&
								v.key.trim().length > 0 &&
								typeof v.label === "string",
						)
					: [],
			);
			setUisQuota(quotaData);
		} catch (error) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			// Пустой экран без объяснения — это то, от чего здесь уходим.
			setLoadError(error instanceof Error ? error.message : String(error));
		}
	}, [statusFilter, commQueries]);

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
					const response = await commQueries.previewTemplate(null, {
						body: draftBody,
						channel: draftChannel,
						allowPhi: true,
					});
					setPreview(await readJson<PreviewResult>(response));
					setPreviewError(null);
				} catch (error) {
					showToast(
						actionFailureToast(
							"Ошибка выполнения операции",
							(error as { status?: number })?.status ?? null,
						),
						"error",
					);
					setPreview(null);
					setPreviewError(
						error instanceof Error ? error.message : String(error),
					);
				}
			})();
		}, 350);
		return () => clearTimeout(timer);
	}, [draftBody, draftChannel, commQueries]);

	const configuredChannels = useMemo(() => {
		if (!gateways) return [];
		return (
			Object.entries(gateways.channels) as [
				ChannelCode,
				{ configured: boolean },
			][]
		)
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

	/** Вставить {key} в текст шаблона в позицию курсора textarea (или в конец). */
	function insertTemplateVariable(key: string) {
		const token = `{${key}}`;
		const el = document.getElementById(
			"template-body",
		) as HTMLTextAreaElement | null;
		if (el && typeof el.selectionStart === "number") {
			const start = el.selectionStart;
			const end = el.selectionEnd;
			const next = draftBody.slice(0, start) + token + draftBody.slice(end);
			setDraftBody(next);
			// Восстановить курсор после токена на следующем тике.
			requestAnimationFrame(() => {
				const pos = start + token.length;
				el.focus();
				el.setSelectionRange(pos, pos);
			});
			return;
		}
		setDraftBody((prev) => (prev ? `${prev}${token}` : token));
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
				allowPhi: true,
			};
			const response = editingId
				? await commQueries.updateTemplate(editingId, payload)
				: await commQueries.createTemplate(payload);
			await readJson(response);
			setNotice({
				kind: "done",
				text: editingId ? "Шаблон обновлён." : "Шаблон создан.",
			});
			resetDraft();
			await loadAll();
		} catch (error) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			// Черновик специально НЕ очищается: набранный текст должен остаться на
			// экране, чтобы человек исправил его и отправил снова, а не набирал заново.
			setNotice(
				failNotice(
					error,
					editingId
						? "Шаблон не сохранён, остались прежние правки. Текст ниже не пропал — исправьте и нажмите сохранить ещё раз."
						: "Шаблон не создан. Текст ниже не пропал — исправьте и нажмите сохранить ещё раз.",
				),
			);
		} finally {
			setBusy(false);
		}
	}

	async function outboxAction(outboxId: string, action: "cancel" | "retry") {
		setBusy(true);
		setNotice(null);
		try {
			const response = await commQueries.outboxAction(outboxId, action);
			await readJson(response);
			setNotice({
				kind: "done",
				text:
					action === "cancel"
						? "Сообщение отменено."
						: "Сообщение возвращено в очередь.",
			});
			await loadAll();
		} catch (error) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setNotice(
				failNotice(
					error,
					action === "cancel"
						? "Сообщение не отменено — оно осталось в очереди и может уйти пациенту. Обновите журнал и попробуйте ещё раз."
						: "Сообщение не возвращено в очередь — оно осталось неотправленным. Попробуйте ещё раз.",
				),
			);
		} finally {
			setBusy(false);
		}
	}

	async function runDispatch() {
		setBusy(true);
		setNotice(null);
		try {
			const response = await commQueries.dispatchOutbox();
			const data = await readJson<{ report: DispatchReport }>(response);
			setNotice(describeDispatchReport(data.report));
			await loadAll();
		} catch (error) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setNotice(
				failNotice(
					error,
					"Из очереди ничего не отправлено, сообщения остались на месте. Попробуйте ещё раз; если повторяется — проверьте настройку каналов выше.",
				),
			);
		} finally {
			setBusy(false);
		}
	}

	async function runReminders() {
		setBusy(true);
		setNotice(null);
		try {
			const response = await commQueries.runReminders();
			const data = await readJson<{ report: ReminderScheduleReport }>(response);
			setNotice(describeReminderReport(data.report));
			await loadAll();
		} catch (error) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setNotice(
				failNotice(
					error,
					"Напоминания не поставлены — пациенты о завтрашних приёмах не узнают. Попробуйте ещё раз.",
				),
			);
		} finally {
			setBusy(false);
		}
	}

	async function saveSettings(patch: Partial<CommunicationSettings>) {
		setBusy(true);
		setNotice(null);
		try {
			const response = await commQueries.saveSettings(patch);
			const data = await readJson<{ settings: CommunicationSettings }>(
				response,
			);
			setSettings(data.settings);
			setNotice({ kind: "done", text: "Правила рассылки сохранены." });
		} catch (error) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			// Отдельно сказано, что на экране осталось прежнее правило: иначе человек
			// уходит с экрана в уверенности, что тихие часы или предел уже изменены.
			setNotice(
				failNotice(
					error,
					"Правила не сохранены, на сервере осталось прежнее. Попробуйте ещё раз — переключатели ниже показывают то, что действует сейчас.",
				),
			);
		} finally {
			setBusy(false);
		}
	}

	/** Активные шаблоны выбранного канала — для разовой постановки. */
	const enqueueTemplates = useMemo(
		() => templates.filter((t) => t.isActive && t.channel === enqueueChannel),
		[templates, enqueueChannel],
	);

	const enqueueCanSubmit =
		enqueueRecipient.trim().length > 0 &&
		(Boolean(enqueueTemplateId) || enqueueBody.trim().length > 0) &&
		!enqueueBusy &&
		!busy;

	async function enqueueMessage() {
		if (!enqueueCanSubmit) return;
		setEnqueueBusy(true);
		setNotice(null);
		try {
			const payload: Record<string, unknown> = {
				channel: enqueueChannel,
				intent: enqueueIntent,
				scope: enqueueScope,
				recipientAddress: enqueueRecipient.trim(),
			};
			if (enqueueTemplateId) {
				payload.templateId = enqueueTemplateId;
			} else {
				payload.body = enqueueBody.trim();
			}
			if (enqueueChannel === "email" && enqueueSubject.trim()) {
				payload.subject = enqueueSubject.trim();
			}
			const response = await commQueries.addOutboxMessage(payload);
			const data = await readJson<{
				outboxId: string;
				duplicate: boolean;
				message: string;
			}>(response);
			setNotice({
				kind: "done",
				text:
					data.message ||
					(data.duplicate
						? "Такое сообщение уже стоит в очереди."
						: "Сообщение поставлено в очередь."),
			});
			// После успешной постановки очищаем текст/шаблон, адрес оставляем —
			// часто шлют несколько сообщений одному человеку подряд.
			setEnqueueBody("");
			setEnqueueTemplateId("");
			setEnqueueSubject("");
			await loadAll();
		} catch (error) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setNotice(
				failNotice(
					error,
					"Сообщение не поставлено в очередь. Текст и адрес не пропали — исправьте и нажмите ещё раз.",
				),
			);
		} finally {
			setEnqueueBusy(false);
		}
	}

	if (loadError) {
		return (
			<section
				className="panel ops-panel"
				data-testid="message-delivery-console"
			>
				<div className="panel-heading">
					<h2>Отправка сообщений</h2>
				</div>
				<p className="ops-notice ops-notice--error" role="alert">
					Не удалось получить данные: {loadError}
				</p>
				<button
					className="secondary-button"
					type="button"
					onClick={() => void loadAll()}
				>
					Повторить
				</button>
			</section>
		);
	}

	return (
		<section className="panel ops-panel" data-testid="message-delivery-console">
			<div className="panel-heading">
				<h2>Отправка сообщений</h2>
				<div className="quick-chips-row">
					{/*
						Было «Разобрать очередь» — из чего понять, что произойдёт, нельзя.
						Кнопка берёт до 25 сообщений из очереди и пытается их отправить.
					*/}
					<button
						className="secondary-button"
						type="button"
						title="Взять сообщения из очереди и попробовать отправить их сейчас"
						onClick={() => void runDispatch()}
						disabled={busy}
					>
						Отправить из очереди
					</button>
					<button
						className="secondary-button"
						type="button"
						title="Поставить в очередь напоминания о завтрашних приёмах — тем, кому их ещё не ставили"
						onClick={() => void runReminders()}
						disabled={busy}
					>
						Поставить напоминания
					</button>
				</div>
			</div>

			{notice ? (
				notice.kind === "fail" ? (
					<p className="ops-notice ops-notice--error" role="alert">
						{notice.text}
					</p>
				) : (
					<p className="ops-notice" role="status" aria-live="polite">
						{notice.text}
					</p>
				)
			) : null}

			{/*
				── Кто разбирает очередь ──────────────────────────────────────────
				Самый дорогой сбой в этом разделе — молчаливый. Обработчик очереди
				выключен по умолчанию (рассылка не должна включаться сама), но узнать
				об этом из интерфейса было нельзя: экран показывал наполняющуюся
				очередь и ни одного признака, что её никто не отправляет.
				Предупреждение появляется только когда сообщения реально ждут: пустая
				очередь при выключенном обработчике никому не мешает.

				И только когда подключён хотя бы один канал. Иначе на экране
				оказывались две красные плашки подряд, обе со словами «сообщения не
				отправляются», хотя причина одна и она ниже: без ключей шлюза
				включённый обработчик тоже ничего не отправит. Две тревоги за раз
				читаются как шум и перестают читаться вовсе.
			*/}
			{gateways &&
			configuredChannels.length > 0 &&
			!gateways.automaticSending.enabled &&
			gateways.automaticSending.waiting > 0 ? (
				<div className="ops-notice ops-notice--error" role="alert">
					<strong>
						Сообщения не отправляются: ждут в очереди{" "}
						{gateways.automaticSending.waiting}
						{gateways.automaticSending.oldestWaitingAt
							? `, самое раннее с ${new Date(gateways.automaticSending.oldestWaitingAt).toLocaleString("ru-RU")}`
							: ""}
						.
					</strong>
					<p>
						Автоматическая отправка выключена на сервере. Разослать накопившееся
						прямо сейчас можно кнопкой «Отправить из очереди» выше; чтобы
						сообщения уходили сами, тот, кто устанавливал программу, включает
						переменную {gateways.automaticSending.enableWith}.
					</p>
				</div>
			) : null}

			{/* ── Шлюзы ─────────────────────────────────────────────────────── */}
			<h3 className="ops-section-title">Каналы</h3>
			{gateways === null ? (
				<p>Загружаю состояние каналов…</p>
			) : (
				<>
					{configuredChannels.length === 0 ? (
						/*
						 * БЫЛО: «Ни один канал не настроен: сообщения не отправятся. Ключи
						 * шлюзов задаются в окружении сервера (SMS, SMTP, WhatsApp,
						 * Telegram)». Администратор клиники не знает, что такое окружение
						 * сервера, и — главное — идти ему было некуда: сказали, что не
						 * работает, и не сказали, что делать.
						 *
						 * Разделяем по ответственности, потому что она разная:
						 * WhatsApp хранится в denteWhatsappBotConfigs, Telegram — в
						 * denteTelegramBotConfigs, то есть эти два канала клиника
						 * подключает сама через настройки. SMS и почта читаются только из
						 * окружения сервера (readSmsCredentialsFromEnv,
						 * readSmtpCredentialsFromEnv) — их подключает тот, кто ставил
						 * программу.
						 */
						<div
							className="ops-notice ops-notice--error ops-channels-empty"
							role="alert"
						>
							{/*
								«НОВЫЕ», а не «сообщения» вообще. Прежняя формулировка
								утверждала, что сообщения не отправляются, — и тут же под ней в
								журнале стояли строки «Доставлено» и «Отправлено». Администратор
								не мог ответить на простой вопрос «письма уходят или нет?»:
								экран говорил одновременно да и нет. Записи в журнале остаются
								от периода, когда канал был настроен, и это нормально; неверно
								было обобщение в баннере.
							*/}
							<strong>
								Новые сообщения сейчас не уйдут: ни один канал связи не
								подключён.
							</strong>
							<p>
								Телеграм и WhatsApp клиника подключает сама — в настройках. SMS
								и электронную почту подключает тот, кто устанавливал программу:
								для них нужны ключи доступа на сервере клиники.
							</p>
							<button
								type="button"
								className="secondary-button"
								onClick={() => {
									window.location.hash = "settings/telegram";
								}}
							>
								Подключить Телеграм или WhatsApp
							</button>
						</div>
					) : null}
					{/*
						Список каналов показывается, только когда есть что различать.
						Когда не подключён НИ ОДИН, шесть одинаковых плашек «не настроен»
						подряд повторяли красный баннер выше шесть раз. Стена одинаковых
						предупреждений приучает не читать предупреждения вообще — а
						следующее может оказаться важным.
					*/}
					{configuredChannels.length > 0 ? (
						<ul className="quick-chips-row ops-channel-list">
							{(Object.keys(gateways.channels) as ChannelCode[]).map((code) => {
								const channel = gateways.channels[code];
								return (
									<li key={code}>
										<span
											className={`ops-state ops-state--${channel.configured ? "ok" : "muted"}`}
										>
											{channelLabels[code] ?? code}:{" "}
											{channel.configured ? "настроен" : "не настроен"}
										</span>
									</li>
								);
							})}
						</ul>
					) : null}
					{gateways.channels.sms.configured ? (
						<p className="ops-hint">
							SMS-шлюз: {gateways.channels.sms.provider ?? "—"}
							{gateways.channels.sms.sender
								? `, отправитель ${gateways.channels.sms.sender}`
								: ""}
							.{" "}
							{gateways.channels.sms.balance
								? `Остаток ${gateways.channels.sms.balance.amount.toFixed(2)} ${gateways.channels.sms.balance.currency}.`
								: gateways.channels.sms.balanceError
									? `Остаток не получен: ${gateways.channels.sms.balanceError}`
									: ""}
							{uisQuota && (
								<span
									className={
										uisQuota.remaining <= 0
											? "text-[var(--bad-fg,#b42318)] font-bold ml-2"
											: "ml-2"
									}
								>
									Лимит UIS SMS: {uisQuota.smsQuotaLimit - uisQuota.remaining}/
									{uisQuota.smsQuotaLimit}
								</span>
							)}
						</p>
					) : null}
				</>
			)}

			{/* ── Журнал ────────────────────────────────────────────────────── */}
			<h3 className="ops-section-title">Журнал отправки</h3>
			<fieldset
				className="quick-chips-row"
				style={{ border: 0, padding: 0, margin: 0 }}
			>
				<legend className="sr-only">Фильтр по состоянию</legend>
				<button
					type="button"
					className={`quick-chip ${statusFilter === "" ? "selected" : ""}`}
					aria-pressed={statusFilter === ""}
					onClick={() => setStatusFilter("")}
				>
					Все
				</button>
				{Object.entries(statusLabels).map(([code, label]) => (
					<button
						key={code}
						type="button"
						className={`quick-chip ${statusFilter === code ? "selected" : ""}`}
						aria-pressed={statusFilter === code}
						onClick={() => setStatusFilter(code)}
					>
						{label}
						{summary[code] ? ` · ${summary[code]}` : ""}
					</button>
				))}
			</fieldset>

			{outbox.length === 0 ? (
				<p className="ops-empty">Сообщений с такими условиями нет.</p>
			) : (
				<div className="ops-table-wrap">
					<table className="ops-table">
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
									<td className="ops-time" data-label="Создано">
										{formatMoment(item.createdAt)}
									</td>
									<td data-label="Канал">
										{channelLabels[item.channel] ?? item.channel}
									</td>
									<td data-label="Получатель">{item.recipientAddress}</td>
									<td data-label="Текст" title={item.body}>
										{item.body.length > 80
											? `${item.body.slice(0, 80)}…`
											: item.body}
									</td>
									<td data-label="Состояние">
										<span
											className={`ops-state ops-state--${statusTone[item.status] ?? "muted"}`}
										>
											{statusLabels[item.status] ?? item.status}
										</span>
										{/* Причина отказа показывается прямо в строке: раньше её негде было узнать. */}
										{item.lastErrorMessage ? (
											<span className="ops-note">{item.lastErrorMessage}</span>
										) : null}
										{item.attempts > 0 ? (
											<span className="ops-note">
												попыток {item.attempts} из {item.maxAttempts}
											</span>
										) : null}
									</td>
									<td data-label="Действие">
										{item.status === "queued" || item.status === "sending" ? (
											<button
												className="secondary-button"
												type="button"
												disabled={busy}
												onClick={() => void outboxAction(item.id, "cancel")}
											>
												Отменить
											</button>
										) : item.status === "failed" ||
											item.status === "cancelled" ||
											item.status === "suppressed" ? (
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
				</div>
			)}

			{/*
			  ── Поставить в очередь ───────────────────────────────────────────
			  POST /api/communications/outbox. БЫЛО: API принимал разовую
			  постановку (шаблон или готовый текст + адрес), а пульт умел только
			  смотреть журнал, отменять и повторять. Администратор не мог
			  отправить одно SMS/письмо без кампании или авто-напоминаний.
			*/}
			<h3 className="ops-section-title">Поставить в очередь</h3>
			<div className="ops-editor" data-testid="outbox-enqueue-form">
				<p className="ops-hint">
					Одно сообщение одному получателю — без рассылки. Уйдёт через
					«Отправить из очереди» или автоматический обработчик, если он включён.
				</p>
				<div className="ops-toolbar">
					<span className="ops-field">
						<label htmlFor="enqueue-channel">Канал</label>
						<select
							id="enqueue-channel"
							data-testid="outbox-enqueue-channel"
							value={enqueueChannel}
							onChange={(event) => {
								setEnqueueChannel(
									event.target.value as
										| "sms"
										| "email"
										| "whatsapp"
										| "telegram",
								);
								setEnqueueTemplateId("");
							}}
						>
							{(["sms", "email", "whatsapp", "telegram"] as const).map(
								(code) => (
									<option key={code} value={code}>
										{channelLabels[code]}
									</option>
								),
							)}
						</select>
					</span>
					<span className="ops-field">
						<label htmlFor="enqueue-intent">Назначение</label>
						<select
							id="enqueue-intent"
							data-testid="outbox-enqueue-intent"
							value={enqueueIntent}
							onChange={(event) => setEnqueueIntent(event.target.value)}
						>
							{Object.entries(intentLabels).map(([code, label]) => (
								<option key={code} value={code}>
									{label}
								</option>
							))}
						</select>
					</span>
					<span className="ops-field">
						<label htmlFor="enqueue-scope">Тип</label>
						<select
							id="enqueue-scope"
							data-testid="outbox-enqueue-scope"
							value={enqueueScope}
							onChange={(event) =>
								setEnqueueScope(event.target.value as "service" | "marketing")
							}
						>
							<option value="service">Сервисное</option>
							<option value="marketing">Рекламное</option>
						</select>
					</span>
				</div>

				<span className="ops-field ops-field--grow">
					<label htmlFor="enqueue-recipient">
						{enqueueChannel === "email"
							? "Адрес почты"
							: "Телефон или идентификатор"}
					</label>
					<input
						id="enqueue-recipient"
						data-testid="outbox-enqueue-recipient"
						type={enqueueChannel === "email" ? "email" : "text"}
						value={enqueueRecipient}
						onChange={(event) => setEnqueueRecipient(event.target.value)}
						placeholder={
							enqueueChannel === "email"
								? "patient@example.com"
								: enqueueChannel === "telegram"
									? "chat_id или @username"
									: "+79001234567"
						}
						autoComplete="off"
					/>
				</span>

				{enqueueChannel === "email" ? (
					<span className="ops-field ops-field--grow">
						<label htmlFor="enqueue-subject">Тема письма</label>
						<input
							id="enqueue-subject"
							data-testid="outbox-enqueue-subject"
							type="text"
							value={enqueueSubject}
							onChange={(event) => setEnqueueSubject(event.target.value)}
							placeholder="Сообщение из клиники"
						/>
					</span>
				) : null}

				<span className="ops-field ops-field--grow">
					<label htmlFor="enqueue-template">Шаблон (необязательно)</label>
					<select
						id="enqueue-template"
						data-testid="outbox-enqueue-template"
						value={enqueueTemplateId}
						onChange={(event) => {
							const next = event.target.value;
							setEnqueueTemplateId(next);
							if (next) setEnqueueBody("");
						}}
					>
						<option value="">Без шаблона — свой текст</option>
						{enqueueTemplates.map((t) => (
							<option key={t.id} value={t.id}>
								{t.title}
								{intentLabels[t.intent] ? ` · ${intentLabels[t.intent]}` : ""}
							</option>
						))}
					</select>
				</span>

				{enqueueTemplateId ? (
					<p className="ops-hint">
						Текст возьмётся из шаблона. Переменные без значений сервер не
						подставит пустотой — для разовой отправки с подстановками удобнее
						готовый текст ниже.
					</p>
				) : (
					<span className="ops-field">
						<label htmlFor="enqueue-body">Текст сообщения</label>
						<textarea
							id="enqueue-body"
							data-testid="outbox-enqueue-body"
							value={enqueueBody}
							onChange={(event) => setEnqueueBody(event.target.value)}
							placeholder="Текст сообщения..."
							rows={4}
							disabled={
								enqueueChannel === "sms" &&
								uisQuota !== null &&
								uisQuota.remaining <= 0
							}
						/>
					</span>
				)}

				<button
					className="primary-button"
					type="button"
					data-testid="outbox-enqueue-submit"
					disabled={!enqueueCanSubmit}
					onClick={() => void enqueueMessage()}
				>
					{enqueueBusy ? "Ставлю в очередь…" : "Поставить в очередь"}
				</button>
			</div>

			{/* ── Шаблоны ───────────────────────────────────────────────────── */}
			<h3 className="ops-section-title">Шаблоны сообщений</h3>
			{templates.length === 0 ? (
				<p className="ops-empty">
					Шаблонов пока нет. Без шаблона «Подтверждение приёма» автоматические
					напоминания не включаются.
				</p>
			) : (
				<ul className="ops-template-list">
					{templates.map((template) => (
						<li className="ops-template" key={template.id}>
							<span className="ops-template__head">
								<strong>{template.title}</strong>
								<span className="ops-state ops-state--info">
									{channelLabels[template.channel] ?? template.channel}
								</span>
								<span className="ops-state">
									{intentLabels[template.intent] ?? template.intent}
								</span>
								{template.isActive ? null : (
									<span className="ops-state ops-state--warn">выключен</span>
								)}
							</span>
							<span className="ops-note">{template.body}</span>
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

			<div className="ops-editor">
				<div className="ops-toolbar">
					<span className="ops-field ops-field--grow">
						<label htmlFor="template-title">Название</label>
						<input
							id="template-title"
							type="text"
							value={draftTitle}
							onChange={(event) => setDraftTitle(event.target.value)}
							placeholder="Напоминание о приёме"
						/>
					</span>

					<span className="ops-field">
						<label htmlFor="template-channel">Канал</label>
						<select
							id="template-channel"
							value={draftChannel}
							onChange={(event) =>
								setDraftChannel(event.target.value as ChannelCode)
							}
						>
							{["sms", "email", "whatsapp", "telegram"].map((code) => (
								<option key={code} value={code}>
									{channelLabels[code]}
								</option>
							))}
						</select>
					</span>

					<span className="ops-field">
						<label htmlFor="template-intent">Назначение</label>
						<select
							id="template-intent"
							value={draftIntent}
							onChange={(event) => setDraftIntent(event.target.value)}
						>
							{Object.entries(intentLabels).map(([code, label]) => (
								<option key={code} value={code}>
									{label}
								</option>
							))}
						</select>
					</span>
				</div>

				<span className="ops-field">
					<label htmlFor="template-body">Текст</label>
					<textarea
						id="template-body"
						rows={4}
						value={draftBody}
						onChange={(event) => setDraftBody(event.target.value)}
						placeholder="{patient}, напоминаем: приём {date} в {time}."
					/>
				</span>

				{/*
				  Справочник подстановок GET /api/communications/variables.
				  БЫЛО: маршрут отдавал полный каталог (key/label/example/phi), но web
				  его не вызывал — администратор набирал {patient} по памяти и не видел
				  мед. переменные (phi) до отказа предпросмотра/отправки.
				  ТЕПЕРЬ: чипы вставляют {key} в текст; phi помечены «мед.» — для каналов
				  без согласия на медданные сервер всё равно отклонит при allowPhi=false.
				*/}
				{variableCatalog.length > 0 ? (
					<div
						role="toolbar"
						className="ops-variable-catalog"
						data-testid="comm-template-variables"
						aria-label="Подстановки для шаблона"
					>
						<span className="ops-note ops-variable-catalog__title">
							Подстановки — нажмите, чтобы вставить в текст:
						</span>
						{variableCatalog.map((v) => (
							<button
								key={v.key}
								type="button"
								data-testid={`comm-template-var-${v.key}`}
								title={
									v.phi
										? `${v.label} · пример: ${v.example} · медицинские данные`
										: `${v.label} · пример: ${v.example}`
								}
								onClick={() => insertTemplateVariable(v.key)}
								className={v.phi ? "quick-chip quick-chip--phi" : "quick-chip"}
							>
								{`{${v.key}}`}
								<span className="quick-chip__label">
									{v.label}
									{v.phi ? " · мед." : ""}
								</span>
							</button>
						))}
					</div>
				) : null}

				{previewError ? (
					<p className="ops-notice ops-notice--error" role="alert">
						{previewError}
					</p>
				) : null}
				{preview ? (
					<div className="ops-preview">
						<span className="ops-preview__title">Как увидит пациент</span>
						<p className="ops-preview__text">{preview.text}</p>
						<span className="ops-note">
							{preview.length} симв. из {preview.limit}
							{preview.sms
								? ` · ${preview.sms.encoding === "ucs2" ? "кириллица" : "латиница"}, сегментов ${preview.sms.segments}, ` +
									`свободно ${preview.sms.charactersLeftInSegment}`
								: ""}
						</span>
						{preview.problems.length > 0 ? (
							<p className="ops-notice ops-notice--error" role="alert">
								{preview.problems.join(" ")}
							</p>
						) : null}
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
					<button
						className="secondary-button"
						type="button"
						onClick={resetDraft}
					>
						Отменить правку
					</button>
				) : null}
			</div>

			{/* ── Правила ───────────────────────────────────────────────────── */}
			<h3 className="ops-section-title">Правила рассылки</h3>
			{settings === null ? (
				<p className="ops-empty">Загружаю правила…</p>
			) : (
				<div>
					<p className="ops-hint">
						Часовой пояс: {settings.timezone}. Тихие часы:{" "}
						{minutesToTime(settings.quietHoursStartMinute)} —{" "}
						{minutesToTime(settings.quietHoursEndMinute)}. Сервисные сообщения в
						это время откладываются до утра, рекламные не отправляются. Не более{" "}
						{settings.dailyLimitPerPatient} сообщений одному пациенту в сутки.
					</p>

					<div className="ops-toolbar">
						<span className="ops-field">
							<label htmlFor="quiet-start">Тихие часы с</label>
							<input
								id="quiet-start"
								type="time"
								defaultValue={minutesToTime(settings.quietHoursStartMinute)}
								onBlur={(event) => {
									const minutes = timeToMinutes(event.target.value);
									if (
										minutes !== null &&
										minutes !== settings.quietHoursStartMinute
									) {
										void saveSettings({ quietHoursStartMinute: minutes });
									}
								}}
							/>
						</span>
						<span className="ops-field">
							<label htmlFor="quiet-end">до</label>
							<input
								id="quiet-end"
								type="time"
								defaultValue={minutesToTime(settings.quietHoursEndMinute)}
								onBlur={(event) => {
									const minutes = timeToMinutes(event.target.value);
									if (
										minutes !== null &&
										minutes !== settings.quietHoursEndMinute
									) {
										void saveSettings({ quietHoursEndMinute: minutes });
									}
								}}
							/>
						</span>
					</div>

					<label className="ops-checkbox" htmlFor="reminders-enabled">
						<input
							id="reminders-enabled"
							type="checkbox"
							checked={settings.appointmentReminderEnabled}
							disabled={busy}
							onChange={(event) =>
								void saveSettings({
									appointmentReminderEnabled: event.target.checked,
								})
							}
						/>{" "}
						Напоминать о приёме автоматически за{" "}
						{settings.appointmentReminderLeadHours.join(", ")} ч
					</label>
					{settings.appointmentReminderEnabled ? null : (
						<p className="ops-hint">
							Пока выключено. Для включения нужен активный шаблон с назначением
							«Подтверждение приёма» — иначе автоматика не отправит ничего и
							промолчит об этом.
						</p>
					)}
				</div>
			)}
		</section>
	);
}

export default MessageDeliveryConsole;
