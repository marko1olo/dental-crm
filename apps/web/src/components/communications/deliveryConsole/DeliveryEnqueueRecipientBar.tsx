import React from "react";
import { intentLabels } from "./constants";
import type { TemplateItem } from "./types";

export interface DeliveryEnqueueRecipientBarProps {
	enqueueChannel: "sms" | "email" | "whatsapp" | "telegram";
	enqueueRecipient: string;
	setEnqueueRecipient: (val: string) => void;
	enqueueSubject: string;
	setEnqueueSubject: (val: string) => void;
	enqueueTemplateId: string;
	setEnqueueTemplateId: (val: string) => void;
	setEnqueueBody: (val: string) => void;
	enqueueTemplates: TemplateItem[];
}

export function DeliveryEnqueueRecipientBar({
	enqueueChannel,
	enqueueRecipient,
	setEnqueueRecipient,
	enqueueSubject,
	setEnqueueSubject,
	enqueueTemplateId,
	setEnqueueTemplateId,
	setEnqueueBody,
	enqueueTemplates,
}: DeliveryEnqueueRecipientBarProps) {
	return (
		<div className="ops-toolbar">
			<span className="ops-field ops-field--grow">
				<label htmlFor="enqueue-recipient">
					{enqueueChannel === "email" ? "Адрес почты" : "Телефон или идентификатор"}
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
					{(enqueueTemplates || []).map((t) => (
						<option key={t.id} value={t.id}>
							{t.title}
							{intentLabels[t.intent] ? ` · ${intentLabels[t.intent]}` : ""}
						</option>
					))}
				</select>
			</span>
		</div>
	);
}
