import { showToast } from "../GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";
import type {
	CreateMessageTemplateCatalogInput,
	MessageTemplateCatalog,
} from "@dental/shared";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useAppLogicContext } from "../../contexts/AppLogicContext";

const DYNAMIC_TAGS = [
	{ tag: "{{patient_name}}", label: "Имя пациента" },
	{ tag: "{{appointment_date}}", label: "Дата приёма" },
	{ tag: "{{appointment_time}}", label: "Время приёма" },
	{ tag: "{{clinic_name}}", label: "Название клиники" },
	{ tag: "{{doctor_name}}", label: "Имя врача" },
];

export function MessageTemplatesPanel() {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;

	const [templates, setTemplates] = useState<MessageTemplateCatalog[]>([]);
	const [isCreating, setIsCreating] = useState(false);
	const [draftTitle, setDraftTitle] = useState("");
	const [draftText, setDraftText] = useState("");
	const [draftChannel, setDraftChannel] = useState("telegram");

	const loadTemplates = async () => {
		try {
			const headers = auth ? auth.denteClinicalReadHeaders() : {};
			const res = await fetch("/api/settings/message-templates", { headers });
			if (res.ok) {
				const data = await res.json();
				setTemplates(data);
			}
		} catch (e) {
			showToast(actionFailureToast("Ошибка выполнения операции", (e as { status?: number })?.status ?? null), "error");
			console.error(e);
		}
	};

	useEffect(() => {
		loadTemplates();
	}, [loadTemplates]);

	const handleCreate = async () => {
		if (!draftTitle || !draftText) return;

		const payload: CreateMessageTemplateCatalogInput = {
			title: draftTitle,
			channel: draftChannel,
			intent: "general",
			templateText: draftText,
			isActive: true,
		};

		const headers = auth
			? auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				})
			: { "Content-Type": "application/json" };

		await fetch("/api/settings/message-templates", {
			method: "POST",
			headers,
			body: JSON.stringify(payload),
		});

		setIsCreating(false);
		setDraftTitle("");
		setDraftText("");
		loadTemplates();
	};

	const handleDelete = async (id: string) => {
		const headers = auth ? auth.denteClinicalMutationHeaders() : {};
		await fetch(`/api/settings/message-templates/${id}`, {
			method: "DELETE",
			headers,
		});
		loadTemplates();
	};

	const insertTag = (tag: string) => {
		setDraftText((prev) => prev + tag);
	};

	return (
		<div className="message-templates-panel">
			<div className="flex justify-between items-center mb-4">
				<h3 className="text-lg font-medium">Шаблоны сообщений</h3>
				<button
					type="button"
					className="btn btn-primary"
					onClick={() => setIsCreating(true)}
				>
					<Plus size={16} className="mr-2" /> Добавить
				</button>
			</div>

			{isCreating && (
				<div className="template-editor border p-4 mb-4 rounded-lg bg-slate-50 dark:bg-slate-800">
					<div className="flex flex-col gap-3 mb-4">
						<input
							type="text"
							placeholder="Название шаблона"
							value={draftTitle}
							onChange={(e) => setDraftTitle(e.target.value)}
							className="input"
						/>
						<select
							value={draftChannel}
							onChange={(e) => setDraftChannel(e.target.value)}
							className="select"
						>
							<option value="telegram">Telegram</option>
							<option value="whatsapp">WhatsApp</option>
							<option value="sms">SMS</option>
						</select>

						<div className="tags flex gap-2 flex-wrap mb-2">
							{DYNAMIC_TAGS.map((tag) => (
								<button
									key={tag.tag}
									type="button"
									className="badge badge-outline cursor-pointer"
									onClick={() => insertTag(tag.tag)}
								>
									{tag.label}
								</button>
							))}
						</div>

						<textarea
							placeholder="Текст сообщения..."
							value={draftText}
							onChange={(e) => setDraftText(e.target.value)}
							className="textarea min-h-[100px]"
						/>
					</div>

					<div className="flex gap-2">
						<button
							type="button"
							className="btn btn-primary"
							onClick={handleCreate}
						>
							Сохранить
						</button>
						<button
							type="button"
							className="btn btn-ghost"
							onClick={() => setIsCreating(false)}
						>
							Отмена
						</button>
					</div>
				</div>
			)}

			<div className="templates-list flex flex-col gap-3">
				{templates?.map((template) => (
					<div
						key={template.id}
						className="template-card border p-3 rounded flex justify-between"
					>
						<div>
							<div className="font-medium">
								{template.title}{" "}
								<span className="text-sm text-slate-500">
									({template.channel})
								</span>
							</div>
							<div className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">
								{template.templateText}
							</div>
						</div>
						<button
							type="button"
							className="btn btn-ghost text-red-500 p-2"
							onClick={() => handleDelete(template.id)}
							aria-label="Удалить"
						>
							<Trash2 size={16} />
						</button>
					</div>
				))}

				{templates?.length === 0 && !isCreating && (
					<div className="text-center text-slate-500 py-8">
						Нет сохранённых шаблонов
					</div>
				)}
			</div>
		</div>
	);
}
