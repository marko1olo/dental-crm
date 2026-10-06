import React from "react";
import { Image as ImageIcon, Send } from "lucide-react";
import { EmptyState } from "../../EmptyState";

type TelegramInlineButtonRow = { text: string; target: string; kind: string }[];

export interface TelegramOutboxSectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: legacy props bag
	props: any;
}

export function TelegramOutboxSection({ props }: TelegramOutboxSectionProps) {
	const {
		formatDateTime,
		filteredTelegramOutboxItems = [],
		typedTelegramInlineButtonKindLabels = {},
		telegramHumanMessage,
		telegramOutbox,
		sendDueTelegramOutbox,
		isTelegramSendingDue,
		telegramSendingItemId,
		isTelegramLoading,
		telegramOutboxStatusFilterOptions = [],
		telegramOutboxStatusFilter,
		setTelegramOutboxStatusFilter,
		telegramOutboxStatusFilterLabels = {},
		telegramOutboxTemplateFilterOptions = [],
		telegramOutboxTemplateFilter,
		setTelegramOutboxTemplateFilter,
		telegramOutboxTemplateFilterLabels = {},
		visibleTelegramOutboxItems = [],
		telegramTemplateLabels = {},
		telegramDeliveryStatusLabels = {},
		sendTelegramOutboxItem,
		isTelegramOutboxItemDueForUi,
		loadMoreTelegramOutbox,
		isTelegramOutboxLoadingMore,
	} = props;

	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const typedTelegramOutbox = telegramOutbox as any | null;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const typedVisibleTelegramOutboxItems = visibleTelegramOutboxItems as any[];
	const telegramOutboxRemainingCount = typedTelegramOutbox
		? Math.max(0, typedTelegramOutbox.filteredCount - typedVisibleTelegramOutboxItems.length)
		: 0;
	const typedTelegramOutboxStatusFilterOptions = telegramOutboxStatusFilterOptions as string[];
	const typedTelegramOutboxTemplateFilterOptions = telegramOutboxTemplateFilterOptions as string[];
	const telegramOutboxSendGuidanceId = "telegram-outbox-send-guidance";
	const telegramOutboxBulkSendGuidance = isTelegramLoading
		? "Загрузка..."
		: isTelegramSendingDue || telegramSendingItemId
			? "Отправка..."
			: "";

	const getTypedTelegramInlineButtonRows = (replyMarkup: Record<string, unknown> | null) => {
		if (!replyMarkup) return [] as TelegramInlineButtonRow[];
		return (replyMarkup.inline_keyboard ?? []) as TelegramInlineButtonRow[];
	};

	return (
		<article className="telegram-outbox-panel">
			<div className="panel-heading">
				<div>
					<h3>Очередь отправок</h3>
					<p>Отправка разрешена при связанном чате, подключенном боте и защищенной серверной связке.</p>
				</div>
				<div className="telegram-outbox-summary-actions">
					<span className="status-pill status-confirmed">
						{typedTelegramOutbox?.dueCount ?? 0} к отправке сейчас / {typedTelegramOutbox?.readyCount ?? 0} готово / {typedTelegramOutbox?.blockedCount ?? 0} требует настройки
					</span>
					<button
						className="secondary-button compact-button"
						type="button"
						onClick={() => void sendDueTelegramOutbox()}
						aria-busy={isTelegramSendingDue || Boolean(telegramSendingItemId) || undefined}
						aria-describedby={telegramOutboxBulkSendGuidance ? telegramOutboxSendGuidanceId : undefined}
						disabled={!typedTelegramOutbox?.dueCount || isTelegramSendingDue || Boolean(telegramSendingItemId) || isTelegramLoading}
					>
						<Send aria-hidden="true" /> {isTelegramSendingDue ? "Отправляем" : "Отправить готовые"}
					</button>
					{telegramOutboxBulkSendGuidance ? (
						<p className="telegram-outbox-guidance" id={telegramOutboxSendGuidanceId} role="status" aria-live="polite">
							{telegramOutboxBulkSendGuidance}
						</p>
					) : null}
				</div>
			</div>
			<fieldset className="telegram-outbox-controls" aria-label="Фильтры очереди Telegram" style={{ border: "none", padding: 0, margin: 0 }}>
				<div>
					Статус
					<div className="quick-chips-row">
						{typedTelegramOutboxStatusFilterOptions.map((status) => (
							<button
								key={status}
								type="button"
								className={`quick-chip ${telegramOutboxStatusFilter === status ? "selected" : ""}`}
								// biome-ignore lint/suspicious/noExplicitAny: automated suppression
								onClick={() => setTelegramOutboxStatusFilter(status as any)}
							>
								{telegramOutboxStatusFilterLabels[status]}
							</button>
						))}
					</div>
				</div>
				<div>
					Сценарий
					<div className="quick-chips-row">
						{typedTelegramOutboxTemplateFilterOptions.map((templateKind) => (
							<button
								key={templateKind}
								type="button"
								className={`quick-chip ${telegramOutboxTemplateFilter === templateKind ? "selected" : ""}`}
								// biome-ignore lint/suspicious/noExplicitAny: automated suppression
								onClick={() => setTelegramOutboxTemplateFilter(templateKind as any)}
							>
								{telegramOutboxTemplateFilterLabels[templateKind]}
							</button>
						))}
					</div>
				</div>
				<span>
					Показано {typedVisibleTelegramOutboxItems.length} из {typedTelegramOutbox?.filteredCount ?? (filteredTelegramOutboxItems?.length ?? 0)}
					{typedTelegramOutbox ? ` / всего ${typedTelegramOutbox.totalCount}` : ""}
				</span>
			</fieldset>
			<div className="telegram-outbox-list">
				{/* biome-ignore lint/suspicious/noExplicitAny: outbox item */}
				{typedVisibleTelegramOutboxItems.map((item: any) => {
					const itemButtonRows = getTypedTelegramInlineButtonRows(item.replyMarkup);
					const itemBlockingNote = item.blockedReason ? telegramHumanMessage(item.blockedReason) : "";
					const itemWarningNotes = (item?.warnings ?? [])
						// biome-ignore lint/suspicious/noExplicitAny: warning note
						.map((warning: any) => telegramHumanMessage(warning as string))
						.filter(Boolean);
					return (
						<article className={`telegram-outbox-item outbox-${item.deliveryStatus}`} key={item.id}>
							<div>
								<strong>{item.title}</strong>
								<p>{item.previewText || telegramHumanMessage(item.blockedReason)}</p>
								<div className="telegram-outbox-preview-meta">
									{item.photoUrl ? (
										<div className="telegram-visual-card-preview compact">
											<img src={item.photoUrl} alt="Картинка Telegram-сообщения" loading="lazy" decoding="async" />
											<span className="telegram-visual-card-indicator">
												<ImageIcon aria-hidden="true" /> Картинка
											</span>
										</div>
									) : null}
									{itemButtonRows.length ? (
										<fieldset className="telegram-outbox-buttons" aria-label="Кнопки Telegram" style={{ border: "none", padding: 0, margin: 0 }}>
											{itemButtonRows.map((row, rowIndex) => ({ row, rowId: `${item.id}-row-${rowIndex}` })).map(({ row, rowId }) => (
												<div className="telegram-inline-button-row" key={rowId}>
													{row.map((button) => (
														<span key={`${item.id}-${button.text}-${button.target}`}>
															{button.text}
															<small>{typedTelegramInlineButtonKindLabels[button.kind]}</small>
														</span>
													))}
												</div>
											))}
										</fieldset>
									) : null}
								</div>
								{itemBlockingNote || itemWarningNotes.length ? (
									<fieldset className="telegram-outbox-notes" aria-label="Причины и предупреждения Telegram" style={{ border: "none", padding: 0, margin: 0 }}>
										{itemBlockingNote ? <small>{itemBlockingNote}</small> : null}
										{/* biome-ignore lint/suspicious/noExplicitAny: warning note */}
										{itemWarningNotes.map((warning: any) => (
											<small key={`${item.id}:${warning}`}>{warning}</small>
										))}
									</fieldset>
								) : null}
								<small>
									{telegramTemplateLabels[item.templateKind]} · {telegramDeliveryStatusLabels[item.deliveryStatus]} · {formatDateTime(item.scheduledAt)}
								</small>
							</div>
							<div className="telegram-outbox-actions">
								<span>{item.chatLinkId ? "чат связан" : "нужен QR"}</span>
								<button
									className="secondary-button compact-button"
									type="button"
									onClick={() => void sendTelegramOutboxItem(item.id)}
									disabled={item.deliveryStatus !== "ready" || !isTelegramOutboxItemDueForUi(item) || Boolean(telegramSendingItemId) || isTelegramSendingDue}
								>
									<Send aria-hidden="true" /> {telegramSendingItemId === item.id ? "..." : "Отправить"}
								</button>
							</div>
						</article>
					);
				})}
				{telegramOutboxRemainingCount > 0 || typedTelegramOutbox?.nextCursor ? (
					<div className="telegram-outbox-result-note">
						<span>Еще {telegramOutboxRemainingCount} задач в выбранном фильтре.</span>
						{typedTelegramOutbox?.nextCursor ? (
							<button className="secondary-button compact-button" type="button" onClick={() => void loadMoreTelegramOutbox()} disabled={isTelegramOutboxLoadingMore}>
								{isTelegramOutboxLoadingMore ? "Загружаем" : "Показать еще"}
							</button>
						) : null}
					</div>
				) : null}
				{typedTelegramOutbox && (typedTelegramOutbox.items?.length ?? 0) > 0 && (filteredTelegramOutboxItems?.length ?? 0) === 0 ? (
					<EmptyState title="Задач не найдено" description="По выбранным фильтрам Telegram-задач не найдено." className="py-6" />
				) : null}
				{typedTelegramOutbox && (typedTelegramOutbox.items?.length ?? 0) === 0 ? (
					<EmptyState title="Очередь пуста" description="Нет Telegram-задач в текущей очереди связи." className="py-6" />
				) : null}
			</div>
			{typedTelegramOutbox?.warnings?.length ? (
				<div className="telegram-warning-strip compact">
					{/* biome-ignore lint/suspicious/noExplicitAny: warning string */}
					{(typedTelegramOutbox.warnings ?? []).map((warning: any) => (
						<span key={warning}>{telegramHumanMessage(warning)}</span>
					))}
				</div>
			) : null}
		</article>
	);
}
