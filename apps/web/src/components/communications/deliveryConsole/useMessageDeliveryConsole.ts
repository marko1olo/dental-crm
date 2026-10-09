import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { actionFailureToast } from "../../../lib/panelStateText";
import { showToast } from "../../GlobalToast";
import {
	type DispatchReport,
	describeDispatchReport,
	describeReminderReport,
	failNotice,
	type Notice,
	type ReminderScheduleReport,
} from "../deliveryReportNotice.js";
import { channelLabels, intentLabels, readJson } from "./constants";
import type {
	ChannelCode,
	CommunicationSettings,
	GatewayStatus,
	MessageDeliveryConsoleProps,
	OutboxItem,
	PreviewResult,
	TemplateItem,
	TemplateVariable,
} from "./types";

export function useMessageDeliveryConsole(props?: MessageDeliveryConsoleProps) {
	const commQueries = useAppLogicContext();
	const appLogic = useAppLogicContext();
	const _auth = appLogic?.auth;

	const [gateways, setGateways] = useState<GatewayStatus | null>(
		props?.initialGateways ?? null,
	);
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
	} | null>(props?.initialUisQuota ?? null);

	/*
	 * Разовая постановка в очередь (POST /api/communications/outbox).
	 * БЫЛО: пульт умел отменять/повторять/разбирать очередь и править шаблоны,
	 * но поставить одно сообщение вручную было нельзя — только кампании или
	 * авто-напоминания. Администратор не мог отправить SMS «приходите завтра»
	 * без конструктора рассылки.
	 */
	const [enqueueChannel, setEnqueueChannel] = useState<
		"sms" | "email" | "whatsapp" | "telegram"
	>(props?.initialEnqueueChannel ?? "sms");
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
			Object.entries(gateways.channels || {}) as [
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
		if (busy) return;
		let title = draftTitle.trim();
		const body = draftBody.trim();
		if (!title) {
			title = `Шаблон ${channelLabels[draftChannel] ?? draftChannel} (${intentLabels[draftIntent] ?? draftIntent})`;
			setDraftTitle(title);
		}
		if (!body) {
			showToast("Укажите текст шаблона сообщения", "warning");
			setNotice({
				kind: "fail",
				text: "Укажите текст шаблона сообщения перед сохранением.",
			});
			return;
		}

		setBusy(true);
		setNotice(null);
		try {
			const payload = {
				title,
				channel: draftChannel,
				intent: draftIntent,
				body,
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
		() =>
			(templates || []).filter(
				(t) => t.isActive && t.channel === enqueueChannel,
			),
		[templates, enqueueChannel],
	);

	const enqueueCanSubmit = !enqueueBusy;

	async function enqueueMessage() {
		if (enqueueBusy) return;
		if (busy) {
			showToast(
				"Выполняется фоновая синхронизация, подождите завершения...",
				"info",
			);
			return;
		}
		const recipient = enqueueRecipient.trim();
		if (!recipient) {
			showToast("Укажите номер телефона или адрес получателя", "warning");
			setNotice({
				kind: "fail",
				text: "Укажите номер телефона или адрес получателя сообщения.",
			});
			return;
		}

		let bodyToSend = enqueueBody.trim();
		if (!enqueueTemplateId && !bodyToSend) {
			bodyToSend = "Здравствуйте! Напоминаем о вашей записи на приём в клинику ДЕНТЕ. Ждём вас!";
			setEnqueueBody(bodyToSend);
		}

		setEnqueueBusy(true);
		setNotice(null);
		try {
			const payload: Record<string, unknown> = {
				channel: enqueueChannel,
				intent: enqueueIntent,
				scope: enqueueScope,
				recipientAddress: recipient,
			};
			if (enqueueTemplateId) {
				payload.templateId = enqueueTemplateId;
			} else {
				payload.body = bodyToSend;
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

	return {
		gateways,
		templates,
		outbox,
		summary,
		settings,
		loadError,
		busy,
		notice,
		statusFilter,
		draftTitle,
		draftChannel,
		draftIntent,
		draftBody,
		editingId,
		preview,
		previewError,
		variableCatalog,
		uisQuota,
		enqueueChannel,
		enqueueIntent,
		enqueueScope,
		enqueueTemplateId,
		enqueueBody,
		enqueueRecipient,
		enqueueSubject,
		enqueueBusy,
		configuredChannels,
		enqueueTemplates,
		enqueueCanSubmit,
		loadAll,
		setStatusFilter,
		setDraftTitle,
		setDraftChannel,
		setDraftIntent,
		setDraftBody,
		setEditingId,
		setEnqueueChannel,
		setEnqueueIntent,
		setEnqueueScope,
		setEnqueueTemplateId,
		setEnqueueBody,
		setEnqueueRecipient,
		setEnqueueSubject,
		resetDraft,
		insertTemplateVariable,
		saveTemplate,
		outboxAction,
		runDispatch,
		runReminders,
		saveSettings,
		enqueueMessage,
	};
}
