import { useEffect, useState } from "react";
import { actionFailureToast } from "../../../lib/panelStateText";
import { showToast } from "../../GlobalToast";
import { failNotice, type Notice } from "../deliveryReportNotice.js";
import { channelLabels, intentLabels, readJson } from "./constants";
import type { ChannelCode, PreviewResult } from "./types";

export function useDeliveryTemplateEditor(
	commQueries: any,
	loadAll: () => Promise<void>,
	setNotice: (n: Notice | null) => void,
	busy: boolean,
	setBusy: (b: boolean) => void,
) {
	const [draftTitle, setDraftTitle] = useState("");
	const [draftChannel, setDraftChannel] = useState<ChannelCode>("sms");
	const [draftIntent, setDraftIntent] = useState("appointment_confirmation");
	const [draftBody, setDraftBody] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [preview, setPreview] = useState<PreviewResult | null>(null);
	const [previewError, setPreviewError] = useState<string | null>(null);

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
					showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
					setPreview(null);
					setPreviewError(error instanceof Error ? error.message : String(error));
				}
			})();
		}, 350);
		return () => clearTimeout(timer);
	}, [draftBody, draftChannel, commQueries]);

	function resetDraft() {
		setEditingId(null);
		setDraftTitle("");
		setDraftBody("");
		setDraftChannel("sms");
		setDraftIntent("appointment_confirmation");
		setPreview(null);
		setPreviewError(null);
	}

	function insertTemplateVariable(key: string) {
		const token = `{${key}}`;
		const el = document.getElementById("template-body") as HTMLTextAreaElement | null;
		if (el && typeof el.selectionStart === "number") {
			const { selectionStart: start, selectionEnd: end } = el;
			setDraftBody(draftBody.slice(0, start) + token + draftBody.slice(end));
			requestAnimationFrame(() => {
				el.focus();
				el.setSelectionRange(start + token.length, start + token.length);
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
			setNotice({ kind: "fail", text: "Укажите текст шаблона сообщения перед сохранением." });
			return;
		}

		setBusy(true);
		setNotice(null);
		try {
			const payload = { title, channel: draftChannel, intent: draftIntent, body, allowPhi: true };
			const response = editingId
				? await commQueries.updateTemplate(editingId, payload)
				: await commQueries.createTemplate(payload);
			await readJson(response);
			setNotice({ kind: "done", text: editingId ? "Шаблон обновлён." : "Шаблон создан." });
			resetDraft();
			await loadAll();
		} catch (error) {
			showToast(actionFailureToast("Ошибка выполнения операции", (error as { status?: number })?.status ?? null), "error");
			setNotice(failNotice(error, editingId ? "Шаблон не сохранён, остались прежние правки. Текст ниже не пропал." : "Шаблон не создан. Текст ниже не пропал."));
		} finally {
			setBusy(false);
		}
	}

	return {
		draftTitle, setDraftTitle,
		draftChannel, setDraftChannel,
		draftIntent, setDraftIntent,
		draftBody, setDraftBody,
		editingId, setEditingId,
		preview, previewError,
		resetDraft, insertTemplateVariable, saveTemplate,
	};
}
