import type { MessageTemplate } from "@dental/shared";
import { Battery, Building2, CheckCheck, MessageSquare } from "lucide-react";
import React, { useState } from "react";
import { MessageTemplateEditorModal } from "./templates/MessageTemplateEditorModal";
import { MessageTemplateListCard } from "./templates/MessageTemplateListCard";
import { MessageTemplatePhonePreview } from "./templates/MessageTemplatePhonePreview";
import { useMessageTemplates } from "./templates/useMessageTemplates";
import "./SettingsMessageTemplatesTab.css";

export function SettingsMessageTemplatesTab() {
	const {
		templates,
		selectedTemplateId,
		setSelectedTemplateId,
		activeChannelFilter,
		setActiveChannelFilter,
		loadTemplates,
		handleDelete,
	} = useMessageTemplates();

	const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
	const [isEditorOpen, setIsEditorOpen] = useState(false);

	const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

	return (
		<div className="space-y-4 animate-fade-in" data-testid="settings-message-templates-tab">
			<div className="flex flex-col gap-1">
				<div className="flex items-center justify-between">
					<h3 className="text-lg font-bold text-[var(--ink)] m-0 flex items-center gap-2">
						<MessageSquare size={20} className="text-[var(--teal)]" />
						<span>Шаблоны сообщений</span>
					</h3>
					<div className="hidden items-center gap-1 text-xs text-[var(--muted)]">
						<Battery size={14} />
						<Building2 size={14} />
						<CheckCheck size={14} />
					</div>
				</div>
				<p className="text-xs text-[var(--muted)] m-0">
					Тексты для напоминаний в WhatsApp, Telegram и SMS с переменными:{" "}
					<code className="text-[11px] font-mono text-[var(--teal)]">{"{patient_name}"}</code>,{" "}
					<code className="text-[11px] font-mono text-[var(--teal)]">{"{doctor_name}"}</code>,{" "}
					<code className="text-[11px] font-mono text-[var(--teal)]">{"{time}"}</code>,{" "}
					<code className="text-[11px] font-mono text-[var(--teal)]">{"{clinic_address}"}</code>.
				</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
				<MessageTemplateListCard
					templates={templates}
					selectedId={selectedTemplateId}
					onSelect={setSelectedTemplateId}
					onEdit={(t) => { setEditingTemplate(t); setIsEditorOpen(true); }}
					onDelete={handleDelete}
					onAddNew={() => { setEditingTemplate(null); setIsEditorOpen(true); }}
					channelFilter={activeChannelFilter}
					onChannelFilterChange={setActiveChannelFilter}
				/>
				<MessageTemplatePhonePreview template={selectedTemplate} />
			</div>

			<MessageTemplateEditorModal
				template={editingTemplate}
				isOpen={isEditorOpen}
				onClose={() => setIsEditorOpen(false)}
				onSaved={loadTemplates}
			/>
		</div>
	);
}

export default SettingsMessageTemplatesTab;
