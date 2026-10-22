import { useMemo, useState } from "react";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import type { Notice } from "../deliveryReportNotice.js";
import type { ChannelCode, MessageDeliveryConsoleProps } from "./types";
import { useDeliveryDataFetch } from "./useDeliveryDataFetch";
import { useDeliveryEnqueueMessage } from "./useDeliveryEnqueueMessage";
import { useDeliveryOutboxActions } from "./useDeliveryOutboxActions";
import { useDeliveryTemplateEditor } from "./useDeliveryTemplateEditor";

// Mandate 8s: Solo doctor 1-click reminder fallback default
export const DEFAULT_REMINDER_TEXT = "Здравствуйте! Напоминаем о вашей записи на приём в клинику ДЕНТЕ. Ждём вас!";

export function useMessageDeliveryConsole(props?: MessageDeliveryConsoleProps) {
	const commQueries = useOptionalAppLogicContext();
	const [busy, setBusy] = useState(false);
	const [notice, setNotice] = useState<Notice | null>(null);
	const [statusFilter, setStatusFilter] = useState<string>("");

	const dataFetch = useDeliveryDataFetch(commQueries, statusFilter, props);

	const templateEditor = useDeliveryTemplateEditor(
		commQueries,
		dataFetch.loadAll,
		setNotice,
		busy,
		setBusy,
	);

	const outboxActions = useDeliveryOutboxActions(
		commQueries,
		dataFetch.loadAll,
		setNotice,
		setBusy,
		dataFetch.setSettings,
	);

	const enqueueEngine = useDeliveryEnqueueMessage(
		commQueries,
		dataFetch.loadAll,
		setNotice,
		busy,
		dataFetch.templates,
		props,
	);

	const configuredChannels = useMemo(() => {
		if (!dataFetch.gateways) return [];
		return (
			Object.entries(dataFetch.gateways.channels || {}) as [ChannelCode, { configured: boolean }][]
		)
			.filter(([, value]) => value.configured)
			.map(([code]) => code);
	}, [dataFetch.gateways]);

	return {
		gateways: dataFetch.gateways,
		templates: dataFetch.templates,
		outbox: dataFetch.outbox,
		summary: dataFetch.summary,
		settings: dataFetch.settings,
		loadError: dataFetch.loadError,
		busy,
		notice,
		statusFilter,
		draftTitle: templateEditor.draftTitle,
		draftChannel: templateEditor.draftChannel,
		draftIntent: templateEditor.draftIntent,
		draftBody: templateEditor.draftBody,
		editingId: templateEditor.editingId,
		preview: templateEditor.preview,
		previewError: templateEditor.previewError,
		variableCatalog: dataFetch.variableCatalog,
		uisQuota: dataFetch.uisQuota,
		enqueueChannel: enqueueEngine.enqueueChannel,
		enqueueIntent: enqueueEngine.enqueueIntent,
		enqueueScope: enqueueEngine.enqueueScope,
		enqueueTemplateId: enqueueEngine.enqueueTemplateId,
		enqueueBody: enqueueEngine.enqueueBody,
		enqueueRecipient: enqueueEngine.enqueueRecipient,
		enqueueSubject: enqueueEngine.enqueueSubject,
		enqueueBusy: enqueueEngine.enqueueBusy,
		configuredChannels,
		enqueueTemplates: enqueueEngine.enqueueTemplates,
		enqueueCanSubmit: enqueueEngine.enqueueCanSubmit,
		loadAll: dataFetch.loadAll,
		setStatusFilter,
		setDraftTitle: templateEditor.setDraftTitle,
		setDraftChannel: templateEditor.setDraftChannel,
		setDraftIntent: templateEditor.setDraftIntent,
		setDraftBody: templateEditor.setDraftBody,
		setEditingId: templateEditor.setEditingId,
		setEnqueueChannel: enqueueEngine.setEnqueueChannel,
		setEnqueueIntent: enqueueEngine.setEnqueueIntent,
		setEnqueueScope: enqueueEngine.setEnqueueScope,
		setEnqueueTemplateId: enqueueEngine.setEnqueueTemplateId,
		setEnqueueBody: enqueueEngine.setEnqueueBody,
		setEnqueueRecipient: enqueueEngine.setEnqueueRecipient,
		setEnqueueSubject: enqueueEngine.setEnqueueSubject,
		resetDraft: templateEditor.resetDraft,
		insertTemplateVariable: templateEditor.insertTemplateVariable,
		saveTemplate: templateEditor.saveTemplate,
		outboxAction: outboxActions.outboxAction,
		runDispatch: outboxActions.runDispatch,
		runReminders: outboxActions.runReminders,
		saveSettings: outboxActions.saveSettings,
		enqueueMessage: enqueueEngine.enqueueMessage,
	};
}
