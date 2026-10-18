import type { MessageTemplate, MessageTemplateChannel, MessageTemplateScenario } from "@dental/shared";
import { useCallback, useEffect, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { showToast } from "../../GlobalToast";

export function useMessageTemplates() {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const [templates, setTemplates] = useState<MessageTemplate[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
	const [activeChannelFilter, setActiveChannelFilter] = useState<MessageTemplateChannel | "all">("all");
	const [activeScenarioFilter, setActiveScenarioFilter] = useState<MessageTemplateScenario | "all">("all");

	const loadTemplates = useCallback(async () => {
		setIsLoading(true);
		try {
			const headers = auth ? auth.denteClinicalReadHeaders() : {};
			const res = await fetch("/api/v1/message-templates", { headers });
			if (res.ok) {
				const json = await res.json();
				const list = Array.isArray(json) ? json : json.data || [];
				setTemplates(list);
				if (list.length > 0 && !selectedTemplateId) {
					setSelectedTemplateId(list[0].id);
				}
			}
		} catch {
			showToast("Ошибка загрузки шаблонов", "error");
		} finally {
			setIsLoading(false);
		}
	}, [auth, selectedTemplateId]);

	useEffect(() => { void loadTemplates(); }, [loadTemplates]);

	const handleDelete = useCallback(async (id: string) => {
		try {
			const headers = auth ? auth.denteClinicalReadHeaders() : {};
			const res = await fetch(`/api/v1/message-templates/${id}`, { method: "DELETE", headers });
			if (res.ok) {
				setTemplates((prev) => prev.filter((t) => t.id !== id));
				if (selectedTemplateId === id) setSelectedTemplateId(null);
				showToast("Шаблон удалён", "success");
			} else {
				showToast("Не удалось удалить шаблон", "error");
			}
		} catch {
			showToast("Ошибка связи с сервером", "error");
		}
	}, [auth, selectedTemplateId]);

	return {
		templates,
		isLoading,
		selectedTemplateId,
		setSelectedTemplateId,
		activeChannelFilter,
		setActiveChannelFilter,
		activeScenarioFilter,
		setActiveScenarioFilter,
		loadTemplates,
		handleDelete,
	};
}
