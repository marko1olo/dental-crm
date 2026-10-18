import {
	type MessageTemplate,
	type MessageTemplateChannel,
	type MessageTemplateScenario,
} from "@dental/shared";
import type React from "react";
import { useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { showToast } from "../../GlobalToast";

export function useMessageTemplateEditor(
	template: MessageTemplate | null | undefined,
	onSaved: () => void,
	onClose: () => void
) {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const [title, setTitle] = useState(template?.title || "");
	const [channel, setChannel] = useState<MessageTemplateChannel>(template?.channel || "telegram");
	const [scenario, setScenario] = useState<MessageTemplateScenario>(template?.scenario || "appointment_reminder_24h");
	const [text, setText] = useState(template?.templateText || "");
	const [isSaving, setIsSaving] = useState(false);

	const handleInsertMacro = (key: string) => setText((prev) => `${prev}{${key}}`);

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim() || !text.trim()) {
			showToast("Заполните название и текст шаблона", "warning");
			return;
		}
		setIsSaving(true);
		try {
			const headers = { ...auth?.denteClinicalReadHeaders(), "Content-Type": "application/json" };
			const url = template ? `/api/v1/message-templates/${template.id}` : "/api/v1/message-templates";
			const res = await fetch(url, {
				method: template ? "PUT" : "POST",
				headers,
				body: JSON.stringify({ title: title.trim(), channel, scenario, templateText: text.trim(), isActive: true }),
			});
			if (!res.ok) {
				showToast("Не удалось сохранить шаблон", "error");
				return;
			}
			showToast("Шаблон сохранён", "success");
			onSaved();
			onClose();
		} catch {
			showToast("Ошибка связи с сервером", "error");
		} finally {
			setIsSaving(false);
		}
	};

	return { title, setTitle, channel, setChannel, scenario, setScenario, text, setText, isSaving, handleInsertMacro, handleSave };
}
