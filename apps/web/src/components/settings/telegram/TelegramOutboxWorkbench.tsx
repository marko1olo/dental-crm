import { Send, Image as ImageIcon } from "lucide-react";

export function TelegramOutboxWorkbench({
	mergedProps,
	getTypedTelegramInlineButtonRows,
	telegramOutboxBulkSendGuidance,
	telegramOutboxSendGuidanceId,
}: {
	mergedProps: any;
	getTypedTelegramInlineButtonRows: (replyMarkup: any) => any[];
	telegramOutboxBulkSendGuidance: string;
	telegramOutboxSendGuidanceId: string;
}) {
	const {
		telegramOutbox,
		sendDueTelegramOutbox,
		isTelegramSendingDue,
		telegramSendingItemId,
		isTelegramLoading,
		telegramOutboxStatusFilterOptions,
		telegramOutboxStatusFilter,
		setTelegramOutboxStatusFilter,
		telegramOutboxStatusFilterLabels,
		telegramOutboxTemplateFilterOptions,
		telegramOutboxTemplateFilter,
		setTelegramOutboxTemplateFilter,
		telegramOutboxTemplateFilterLabels,
		visibleTelegramOutboxItems,
		filteredTelegramOutboxItems,
		telegramHumanMessage,
		telegramTemplateLabels,
		telegramDeliveryStatusLabels,
		formatDateTime,
		sendTelegramOutboxItem,
		isTelegramOutboxItemDueForUi,
		loadMoreTelegramOutbox,
		isTelegramOutboxLoadingMore,
		typedTelegramInlineButtonKindLabels,
	} = mergedProps;

	const typedTelegramOutbox = telegramOutbox as any | null;
	const typedTelegramOutboxStatusFilterOptions =
		(telegramOutboxStatusFilterOptions as string[]) ?? [];
	const typedTelegramOutboxTemplateFilterOptions =
		(telegramOutboxTemplateFilterOptions as string[]) ?? [];
	const typedVisibleTelegramOutboxItems = visibleTelegramOutboxItems as any[];
	const telegramOutboxRemainingCount = typedTelegramOutbox
		? Math.max(
				0,
				typedTelegramOutbox.filteredCount -
					typedVisibleTelegramOutboxItems.length,
			)
		: 0;

	return (
		<article className="telegram-outbox-panel">
			<div className="panel-heading">
				<div>
					<h3>Очередь отправок</h3>
					<p>
						Это расчет готовности: отправка разрешена только при связанном чате,
						подключенном боте и защищенной серверной связке.
					</p>
				</div>
				<div className="telegram-outbox-summary-actions">
					<span className="status-pill status-confirmed">
						{typedTelegramOutbox?.dueCount ?? 0} к отправке сейчас /{" "}
						{typedTelegramOutbox?.readyCount ?? 0} готово /{" "}
						{typedTelegramOutbox?.blockedCount ?? 0} требует настройки
					</span>
					<button
						className="secondary-button compact-button"
						type="button"
						onClick={() => void sendDueTelegramOutbox()}
						aria-busy={
							isTelegramSendingDue || Boolean(telegramSendingItemId) || undefined
						}
						aria-describedby={
							telegramOutboxBulkSendGuidance
								? telegramOutboxSendGuidanceId
								: undefined
						}
						disabled={
							!typedTelegramOutbox?.dueCount ||
							isTelegramSendingDue ||
							Boolean(telegramSendingItemId) ||
							isTelegramLoading
						}
					>
						<Send aria-hidden="true" />{" "}
						{isTelegramSendingDue ? "Отправляем" : "Отправить готовые"}
					</button>
					{telegramOutboxBulkSendGuidance ? (
						<p
							className="telegram-outbox-guidance"
							id={telegramOutboxSendGuidanceId}
							role="status"
							aria-live="polite"
						>
							{telegramOutboxBulkSendGuidance}
						</p>
					) : null}
				</div>
			</div>
			<div
				className="telegram-outbox-controls"
				aria-label="Фильтры очереди Telegram"
			>
				<label>
					Статус
					<div className="quick-chips-row">
						{typedTelegramOutboxStatusFilterOptions.map((status: string) => (
							<button
								key={status}
								type="button"
								className={`quick-chip ${telegramOutboxStatusFilter === status ? "selected" : ""}`}
								onClick={() => setTelegramOutboxStatusFilter(status)}
							>
								{telegramOutboxStatusFilterLabels[status]}
							</button>
						))}
					</div>
				</label>
				<label>
					Сценарий
					<div className="quick-chips-row">
						{typedTelegramOutboxTemplateFilterOptions.map((templateKind: string) => (
							<button
								key={templateKind}
								type="button"
								className={`quick-chip ${telegramOutboxTemplateFilter === templateKind ? "selected" : ""}`}
								onClick={() => setTelegramOutboxTemplateFilter(templateKind)}
							>
								{telegramOutboxTemplateFilterLabels[templateKind]}
							</button>
						))}
					</div>
				</label>
				<span>
					Показано {typedVisibleTelegramOutboxItems.length} из{" "}
					{typedTelegramOutbox?.filteredCount ??
						filteredTelegramOutboxItems.length}
					{typedTelegramOutbox
						? ` / всего ${typedTelegramOutbox.totalCount}`
						: ""}
				</span>
			</div>
			<div className="telegram-outbox-list">
				{typedVisibleTelegramOutboxItems.map((item: any) => {
					const itemButtonRows = getTypedTelegramInlineButtonRows(
						item.replyMarkup,
					);
					const itemBlockingNote = item.blockedReason
						? telegramHumanMessage(item.blockedReason)
						: "";
					const itemWarningNotes = item.warnings
						.map((warning: string) => telegramHumanMessage(warning))
						.filter(Boolean);
					return (
						<article
							className={`telegram-outbox-item outbox-${item.deliveryStatus}`}
							key={item.id}
						>
							<div>
								<strong>{item.title}</strong>
								<p>
									{item.previewText || telegramHumanMessage(item.blockedReason)}
								</p>
								<div className="telegram-outbox-preview-meta">
									{item.photoUrl ? (
										<div className="telegram-visual-card-preview compact">
											<img
												src={item.photoUrl}
												alt="Картинка Telegram-сообщения"
												loading="lazy"
												decoding="async"
											/>
											<span className="telegram-visual-card-indicator">
												<ImageIcon aria-hidden="true" /> Картинка
											</span>
										</div>
									) : null}
									{itemButtonRows.length ? (
										<div
											className="telegram-outbox-buttons"
											aria-label="Кнопки Telegram"
										>
											{itemButtonRows.map((row: any[], rowIndex: number) => (
												<div
													className="telegram-inline-button-row"
													key={`${item.id}-row-${rowIndex}`}
												>
													{row.map((button: any) => (
														<span
															key={`${item.id}-${button.text}-${button.target}`}
														>
															{button.text}
															<small>
																{
																	typedTelegramInlineButtonKindLabels[
																		button.kind
																	]
																}
															</small>
														</span>
													))}
												</div>
											))}
										</div>
									) : null}
								</div>
								{itemBlockingNote || itemWarningNotes.length ? (
									<div
										className="telegram-outbox-notes"
										aria-label="Причины и предупреждения Telegram"
									>
										{itemBlockingNote ? (
											<small>{itemBlockingNote}</small>
										) : null}
										{itemWarningNotes.map((warning: string) => (
											<small key={`${item.id}:${warning}`}>{warning}</small>
										))}
									</div>
								) : null}
								<small>
									{telegramTemplateLabels[item.templateKind]} ·{" "}
									{telegramDeliveryStatusLabels[item.deliveryStatus]} ·{" "}
									{formatDateTime(item.scheduledAt)}
								</small>
							</div>
							<div className="telegram-outbox-actions">
								<span>{item.chatLinkId ? "чат связан" : "нужен QR"}</span>
								<button
									className="secondary-button compact-button"
									type="button"
									onClick={() => void sendTelegramOutboxItem(item.id)}
									disabled={
										item.deliveryStatus !== "ready" ||
										!isTelegramOutboxItemDueForUi(item) ||
										Boolean(telegramSendingItemId) ||
										isTelegramSendingDue
									}
								>
									<Send aria-hidden="true" />{" "}
									{telegramSendingItemId === item.id ? "..." : "Отправить"}
								</button>
							</div>
						</article>
					);
				})}
				{telegramOutboxRemainingCount > 0 || typedTelegramOutbox?.nextCursor ? (
					<div className="telegram-outbox-result-note">
						<span>
							Еще {telegramOutboxRemainingCount} задач в выбранном фильтре.
						</span>
						{typedTelegramOutbox?.nextCursor ? (
							<button
								className="secondary-button compact-button"
								type="button"
								onClick={() => void loadMoreTelegramOutbox()}
								disabled={isTelegramOutboxLoadingMore}
							>
								{isTelegramOutboxLoadingMore ? "Загружаем" : "Показать еще"}
							</button>
						) : null}
					</div>
				) : null}
				{typedTelegramOutbox &&
				typedTelegramOutbox.items.length > 0 &&
				filteredTelegramOutboxItems.length === 0 ? (
					<p className="telegram-empty-state">
						По выбранным фильтрам задач нет.
					</p>
				) : null}
				{typedTelegramOutbox && typedTelegramOutbox.items.length === 0 ? (
					<p className="telegram-empty-state">
						Нет Telegram-задач в текущей очереди связи.
					</p>
				) : null}
			</div>
			{typedTelegramOutbox?.warnings.length ? (
				<div className="telegram-warning-strip compact">
					{typedTelegramOutbox.warnings.map((warning: string) => (
						<span key={warning}>{telegramHumanMessage(warning)}</span>
					))}
				</div>
			) : null}
		</article>
	);
}
