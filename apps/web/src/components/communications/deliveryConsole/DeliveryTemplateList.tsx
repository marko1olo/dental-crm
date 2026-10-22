import React from "react";
import { channelLabels, intentLabels } from "./constants";
import type { ChannelCode, TemplateItem } from "./types";

export interface DeliveryTemplateListProps {
	templates: TemplateItem[];
	setDraftTitle: (t: string) => void;
	setDraftChannel: (c: ChannelCode) => void;
	setDraftIntent: (i: string) => void;
	setDraftBody: (b: string) => void;
	setEditingId: (id: string | null) => void;
}

export function DeliveryTemplateList({
	templates,
	setDraftTitle,
	setDraftChannel,
	setDraftIntent,
	setDraftBody,
	setEditingId,
}: DeliveryTemplateListProps) {
	if ((templates ?? []).length === 0) {
		return (
			<div className="ops-empty">
				<p>Шаблонов пока нет. Без шаблона «Подтверждение приёма» автоматические напоминания не включаются.</p>
				<button
					type="button"
					className="secondary-button"
					data-testid="btn-fill-default-confirmation-template"
					onClick={() => {
						setDraftTitle("Подтверждение приёма (SMS)");
						setDraftChannel("sms");
						setDraftIntent("appointment_confirmation");
						setDraftBody("Здравствуйте, {patient}! Напоминаем о приёме {date} в {time}. Клиника ДЕНТЕ.");
					}}
				>
					Заполнить шаблон подтверждения по умолчанию
				</button>
			</div>
		);
	}

	return (
		<ul className="ops-template-list">
			{templates.map((template) => (
				<li className="ops-template" key={template.id}>
					<span className="ops-template__head">
						<strong>{template.title}</strong>
						<span className="ops-state ops-state--info">{channelLabels[template.channel] ?? template.channel}</span>
						<span className="ops-state">{intentLabels[template.intent] ?? template.intent}</span>
						{!template.isActive && <span className="ops-state ops-state--warn">выключен</span>}
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
	);
}
