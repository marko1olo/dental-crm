import React from "react";
import { channelLabels, intentLabels } from "./constants";
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
	enqueueChannel,
	setEnqueueChannel,
	enqueueIntent,
	setEnqueueIntent,
	enqueueScope,
	setEnqueueScope,
	enqueueRecipient,
	setEnqueueRecipient,
	enqueueSubject,
	setEnqueueSubject,
	enqueueTemplateId,
	setEnqueueTemplateId,
	enqueueBody,
	setEnqueueBody,
	enqueueBusy,
	enqueueMessage,
	enqueueTemplates,
	uisQuota,
}: DeliveryEnqueueFormProps) {
	return (
		<>
			{/*
			  ── Поставить в очередь ───────────────────────────────────────────
			  POST /api/communications/outbox. БЫЛО: API принимал разовую
			  постановку (шаблон или готовый текст + адрес), а пульт умел только
			  смотреть журнал, отменять и повторять. Администратор не мог
			  отправить одно SMS/письмо без кампании или авто-напоминаний.
			*/}
			<h3 className="ops-section-title">Поставить в очередь</h3>
			<div className="ops-editor" data-testid="outbox-enqueue-form">
				<p className="ops-hint">
					Одно сообщение одному получателю — без рассылки. Уйдёт через
					«Отправить из очереди» или автоматический обработчик, если он включён.
				</p>

				<div className="ops-toolbar">
					<span className="ops-field">
						<label htmlFor="enqueue-channel">Канал</label>
						<select
							id="enqueue-channel"
							data-testid="outbox-enqueue-channel"
							value={enqueueChannel}
							onChange={(event) => {
								setEnqueueChannel(
									event.target.value as
										| "sms"
										| "email"
										| "whatsapp"
										| "telegram",
								);
								setEnqueueTemplateId("");
							}}
						>
							{(["sms", "email", "whatsapp", "telegram"] as const).map(
								(code) => (
									<option key={code} value={code}>
										{channelLabels[code]}
									</option>
								),
							)}
						</select>
					</span>

					<span className="ops-field ops-field--grow">
						<label htmlFor="enqueue-intent">Назначение</label>
						<select
							id="enqueue-intent"
							data-testid="outbox-enqueue-intent"
							value={enqueueIntent}
							onChange={(event) => setEnqueueIntent(event.target.value)}
						>
							{Object.entries(intentLabels).map(([code, label]) => (
								<option key={code} value={code}>
									{label}
								</option>
							))}
						</select>
					</span>

					<span className="ops-field">
						<label htmlFor="enqueue-scope">Тип</label>
						<select
							id="enqueue-scope"
							data-testid="outbox-enqueue-scope"
							value={enqueueScope}
							onChange={(event) =>
								setEnqueueScope(event.target.value as "service" | "marketing")
							}
						>
							<option value="service">Сервисное</option>
							<option value="marketing">Рекламное</option>
						</select>
					</span>
				</div>

				<div className="ops-toolbar">
					<span className="ops-field ops-field--grow">
						<label htmlFor="enqueue-recipient">
							{enqueueChannel === "email"
								? "Адрес почты"
								: "Телефон или идентификатор"}
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

				{enqueueTemplateId ? (
					<p className="ops-hint">
						Текст возьмётся из шаблона. Переменные без значений сервер не
						подставит пустотой — для разовой отправки с подстановками удобнее
						готовый текст ниже.
					</p>
				) : (
					<span className="ops-field mb-3">
						<label htmlFor="enqueue-body">Текст сообщения</label>
						<textarea
							id="enqueue-body"
							data-testid="outbox-enqueue-body"
							value={enqueueBody}
							onChange={(event) => setEnqueueBody(event.target.value)}
							placeholder="Текст сообщения..."
							rows={4}
						/>
					</span>
				)}

				{enqueueChannel === "sms" &&
				uisQuota !== null &&
				uisQuota.remaining <= 0 ? (
					<div
						className="ops-notice ops-notice--warn mb-3"
						role="alert"
						data-testid="sms-quota-warning-banner"
					>
						Лимит SMS исчерпан. Переключите канал на WhatsApp или Telegram для бесплатной отправки сообщения.
					</div>
				) : null}

				<button
					className="primary-button"
					type="button"
					data-testid="outbox-enqueue-submit"
					disabled={enqueueBusy}
					onClick={() => void enqueueMessage()}
				>
					{enqueueBusy ? "Ставлю в очередь…" : "Поставить в очередь"}
				</button>
			</div>
		</>
	);
}
