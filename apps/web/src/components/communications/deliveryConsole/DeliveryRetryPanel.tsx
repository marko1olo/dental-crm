import React from "react";
import type { Notice } from "../deliveryReportNotice.js";

export interface DeliveryRetryPanelProps {
	busy: boolean;
	notice: Notice | null;
	runDispatch: () => Promise<void>;
	runReminders: () => Promise<void>;
}

export function DeliveryRetryPanel({
	busy,
	notice,
	runDispatch,
	runReminders,
}: DeliveryRetryPanelProps) {
	return (
		<>
			<div className="panel-heading" data-testid="message-delivery-console">
				<h2>Отправка сообщений</h2>
				<div className="quick-chips-row">
					{/*
						Было «Разобрать очередь» — из чего понять, что произойдёт, нельзя.
						Кнопка берёт до 25 сообщений из очереди и пытается их отправить.
					*/}
					<button
						className="secondary-button"
						type="button"
						title="Взять сообщения из очереди и попробовать отправить их сейчас"
						onClick={() => void runDispatch()}
						disabled={busy}
					>
						Отправить из очереди
					</button>
					<button
						className="secondary-button"
						type="button"
						title="Поставить в очередь напоминания о завтрашних приёмах — тем, кому их ещё не ставили"
						onClick={() => void runReminders()}
						disabled={busy}
					>
						Поставить напоминания
					</button>
				</div>
			</div>

			{notice ? (
				notice.kind === "fail" ? (
					<p className="ops-notice ops-notice--error" role="alert">
						{notice.text}
					</p>
				) : (
					<p className="ops-notice" role="status" aria-live="polite">
						{notice.text}
					</p>
				)
			) : null}
		</>
	);
}
