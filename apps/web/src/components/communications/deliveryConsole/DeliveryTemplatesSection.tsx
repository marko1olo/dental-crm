import React from "react";
import { channelLabels, intentLabels } from "./constants";
import { DeliveryTemplateList } from "./DeliveryTemplateList";
import { DeliveryTemplatePreview } from "./DeliveryTemplatePreview";
import { DeliveryTemplateVariables } from "./DeliveryTemplateVariables";
import type { ChannelCode, PreviewResult, TemplateItem, TemplateVariable } from "./types";

export interface DeliveryTemplatesSectionProps {
	templates: TemplateItem[];
	draftTitle: string;
	setDraftTitle: (title: string) => void;
	draftChannel: ChannelCode;
	setDraftChannel: (channel: ChannelCode) => void;
	draftIntent: string;
	setDraftIntent: (intent: string) => void;
	draftBody: string;
	setDraftBody: (body: string) => void;
	editingId: string | null;
	setEditingId: (id: string | null) => void;
	preview: PreviewResult | null;
	previewError: string | null;
	variableCatalog: TemplateVariable[];
	busy: boolean;
	saveTemplate: () => Promise<void>;
	resetDraft: () => void;
	insertTemplateVariable: (key: string) => void;
}

export function DeliveryTemplatesSection({
	templates, draftTitle, setDraftTitle, draftChannel, setDraftChannel,
	draftIntent, setDraftIntent, draftBody, setDraftBody, editingId, setEditingId,
	preview, previewError, variableCatalog, busy, saveTemplate, resetDraft, insertTemplateVariable,
}: DeliveryTemplatesSectionProps) {
	return (
		<>
			<h3 className="ops-section-title">Шаблоны сообщений</h3>
			<DeliveryTemplateList
				templates={templates} setDraftTitle={setDraftTitle} setDraftChannel={setDraftChannel}
				setDraftIntent={setDraftIntent} setDraftBody={setDraftBody} setEditingId={setEditingId}
			/>
			<div className="ops-editor">
				<div className="ops-toolbar">
					<span className="ops-field ops-field--grow">
						<label htmlFor="template-title">Название</label>
						<input
							id="template-title" type="text" value={draftTitle}
							onChange={(e) => setDraftTitle(e.target.value)} placeholder="Напоминание о приёме"
						/>
					</span>
					<span className="ops-field">
						<label htmlFor="template-channel">Канал</label>
						<select
							id="template-channel" value={draftChannel}
							onChange={(e) => setDraftChannel(e.target.value as ChannelCode)}
						>
							{["sms", "email", "whatsapp", "telegram"].map((code) => (
								<option key={code} value={code}>{channelLabels[code]}</option>
							))}
						</select>
					</span>
					<span className="ops-field">
						<label htmlFor="template-intent">Назначение</label>
						<select id="template-intent" value={draftIntent} onChange={(e) => setDraftIntent(e.target.value)}>
							{Object.entries(intentLabels).map(([code, label]) => (
								<option key={code} value={code}>{label}</option>
							))}
						</select>
					</span>
				</div>
				<span className="ops-field">
					<label htmlFor="template-body">Текст</label>
					<textarea
						id="template-body" rows={4} value={draftBody}
						onChange={(e) => setDraftBody(e.target.value)} placeholder="{patient}, напоминаем: приём {date} в {time}."
					/>
				</span>
				<DeliveryTemplateVariables variableCatalog={variableCatalog} insertTemplateVariable={insertTemplateVariable} />
				<DeliveryTemplatePreview preview={preview} previewError={previewError} />
				<button
					className="primary-button"
					type="button"
					disabled={busy}
					onClick={() => void saveTemplate()}
				>
					{editingId ? "Сохранить изменения" : "Создать шаблон"}
				</button>
				{editingId ? (
					<button className="secondary-button" type="button" onClick={resetDraft}>Отменить правку</button>
				) : null}
			</div>
		</>
	);
}
