import React from "react";

export function DeliveryZeroChannelsAlert() {
	return (
		<div className="ops-notice ops-notice--error ops-channels-empty" role="alert">
			<strong>Новые сообщения сейчас не уйдут: ни один канал связи не подключён.</strong>
			<p>
				Телеграм и WhatsApp клиника подключает сама — в настройках. SMS и электронную почту подключает тот, кто устанавливал программу: для них нужны ключи доступа на сервере клиники.
			</p>
			<button
				type="button"
				className="secondary-button"
				onClick={() => {
					window.location.hash = "settings/telegram";
				}}
			>
				Подключить Телеграм или WhatsApp
			</button>
		</div>
	);
}
