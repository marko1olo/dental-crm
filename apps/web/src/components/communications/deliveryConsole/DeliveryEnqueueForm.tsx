import React from "react";
import { DeliveryEnqueueChannelBar } from "./DeliveryEnqueueChannelBar";
import { DeliveryEnqueueRecipientBar } from "./DeliveryEnqueueRecipientBar";
import type { TemplateItem } from "./types";

export interface DeliveryEnqueueFormProps {
	enqueueChannel: "sms" | "email" | "whatsapp" | "telegram";
	setEnqueueChannel: (channel: "sms" | "email" | "whatsapp" | "telegram") => void;
	enqueueIntent: string;
	setEnqueueIntent: (intent: string) => void;
	enqueueScope: "service" | "marketing";
	setEnqueueScope: (scope: "service" | "marketing") => void;
	enqueueRecipient: string;
	setEnqueueRecipient: (recipient: string) => void;
	enqueueSubject: string;
	setEnqueueSubject: (subject: string) => void;
	enqueueTemplateId: string;
	setEnqueueTemplateId: (templateId: string) => void;
	enqueueBody: string;
	setEnqueueBody: (body: string) => void;
	enqueueBusy: boolean;
	enqueueMessage: () => Promise<void>;
	enqueueTemplates: TemplateItem[];
	uisQuota: { remaining: number; smsQuotaLimit: number } | null;
}

export function DeliveryEnqueueForm({
	enqueueChannel, setEnqueueChannel, enqueueIntent, setEnqueueIntent,
	enqueueScope, setEnqueueScope, enqueueRecipient, setEnqueueRecipient,
	enqueueSubject, setEnqueueSubject, enqueueTemplateId, setEnqueueTemplateId,
	enqueueBody, setEnqueueBody, enqueueBusy, enqueueMessage, enqueueTemplates, uisQuota,
}: DeliveryEnqueueFormProps) {
	return (
		<>
			<h3 className="ops-section-title">Поставить в очередь</h3>
			<div className="ops-editor" data-testid="outbox-enqueue-form">
				<p className="ops-hint">
					Одно сообщение одному получателю — без рассылки. Уйдёт через «Отправить из очереди» или автоматический обработчик, если он включён.
				</p>
				<DeliveryEnqueueChannelBar
					enqueueChannel={enqueueChannel} setEnqueueChannel={setEnqueueChannel}
					enqueueIntent={enqueueIntent} setEnqueueIntent={setEnqueueIntent}
					enqueueScope={enqueueScope} setEnqueueScope={setEnqueueScope}
					setEnqueueTemplateId={setEnqueueTemplateId}
				/>
				<DeliveryEnqueueRecipientBar
					enqueueChannel={enqueueChannel} enqueueRecipient={enqueueRecipient}
					setEnqueueRecipient={setEnqueueRecipient} enqueueSubject={enqueueSubject}
					setEnqueueSubject={setEnqueueSubject} enqueueTemplateId={enqueueTemplateId}
					setEnqueueTemplateId={setEnqueueTemplateId} setEnqueueBody={setEnqueueBody}
					enqueueTemplates={enqueueTemplates}
				/>
				{enqueueTemplateId ? (
					<p className="ops-hint">
						Текст возьмётся из шаблона. Переменные без значений сервер не подставит пустотой — для разовой отправки с подстановками удобнее готовый текст ниже.
					</p>
				) : (
					<span className="ops-field mb-3">
						<label htmlFor="enqueue-body">Текст сообщения</label>
						<textarea
							id="enqueue-body" data-testid="outbox-enqueue-body"
							value={enqueueBody} onChange={(e) => setEnqueueBody(e.target.value)}
							placeholder="Текст сообщения..." rows={4}
						/>
					</span>
				)}
				{enqueueChannel === "sms" && uisQuota !== null && uisQuota.remaining <= 0 && (
					<div className="ops-notice ops-notice--warn mb-3" role="alert" data-testid="sms-quota-warning-banner">
						Лимит SMS исчерпан. Переключите канал на WhatsApp или Telegram для бесплатной отправки сообщения.
					</div>
				)}
				<button
					className="primary-button" type="button" data-testid="outbox-enqueue-submit"
					disabled={enqueueBusy} onClick={() => void enqueueMessage()}
				>
					{enqueueBusy ? "Ставлю в очередь…" : "Поставить в очередь"}
				</button>
			</div>
		</>
	);
}
