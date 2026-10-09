import React from "react";
import { formatSmsBalance } from "../deliveryReportNotice.js";
import { channelLabels } from "./constants";
import type { ChannelCode, GatewayStatus } from "./types";

export interface DeliveryChannelsStatusProps {
	gateways: GatewayStatus | null;
	configuredChannels: ChannelCode[];
	uisQuota: {
		remaining: number;
		smsQuotaLimit: number;
	} | null;
}

export function DeliveryChannelsStatus({
	gateways,
	configuredChannels,
	uisQuota,
}: DeliveryChannelsStatusProps) {
	return (
		<>
			{/*
				── Кто разбирает очередь ──────────────────────────────────────────
				Самый дорогой сбой в этом разделе — молчаливый. Обработчик очереди
				выключен по умолчанию (рассылка не должна включаться сама), но узнать
				об этом из интерфейса было нельзя: экран показывал наполняющуюся
				очередь и ни одного признака, что её никто не отправляет.
				Предупреждение появляется только когда сообщения реально ждут: пустая
				очередь при выключенном обработчике никому не мешает.

				И только когда подключён хотя бы один канал. Иначе на экране
				оказывались две красные плашки подряд, обе со словами «сообщения не
				отправляются», хотя причина одна и она ниже: без ключей шлюза
				включённый обработчик тоже ничего не отправит. Две тревоги за раз
				читаются как шум и перестают читаться вовсе.
			*/}
			{gateways &&
			configuredChannels.length > 0 &&
			!gateways?.automaticSending?.enabled &&
			(gateways?.automaticSending?.waiting ?? 0) > 0 ? (
				<div className="ops-notice ops-notice--error" role="alert">
					<strong>
						Сообщения не отправляются: ждут в очереди{" "}
						{gateways?.automaticSending?.waiting ?? 0}
						{gateways?.automaticSending?.oldestWaitingAt
							? `, самое раннее с ${new Date(gateways.automaticSending.oldestWaitingAt).toLocaleString("ru-RU")}`
							: ""}
						.
					</strong>
					<p>
						Автоматическая отправка выключена на сервере. Разослать накопившееся
						прямо сейчас можно кнопкой «Отправить из очереди» выше; чтобы
						сообщения уходили сами, тот, кто устанавливал программу, включает
						переменную {gateways?.automaticSending?.enableWith ?? ""}.
					</p>
				</div>
			) : null}

			{/* ── Шлюзы ─────────────────────────────────────────────────────── */}
			<h3 className="ops-section-title">Каналы</h3>
			{gateways === null ? (
				<p>Загружаю состояние каналов…</p>
			) : (
				<>
					{configuredChannels.length === 0 ? (
						/*
						 * БЫЛО: «Ни один канал не настроен: сообщения не отправятся. Ключи
						 * шлюзов задаются в окружении сервера (SMS, SMTP, WhatsApp,
						 * Telegram)». Администратор клиники не знает, что такое окружение
						 * сервера, и — главное — идти ему было некуда: сказали, что не
						 * работает, и не сказали, что делать.
						 *
						 * Разделяем по ответственности, потому что она разная:
						 * WhatsApp хранится в denteWhatsappBotConfigs, Telegram — в
						 * denteTelegramBotConfigs, то есть эти два канала клиника
						 * подключает сама через настройки. SMS и почта читаются только из
						 * окружения сервера (readSmsCredentialsFromEnv,
						 * readSmtpCredentialsFromEnv) — их подключает тот, кто ставил
						 * программу.
						 */
						<div
							className="ops-notice ops-notice--error ops-channels-empty"
							role="alert"
						>
							{/*
								«НОВЫЕ», а не «сообщения» вообще. Прежняя формулировка
								утверждала, что сообщения не отправляются, — и тут же под ней в
								журнале стояли строки «Доставлено» и «Отправлено». Администратор
								не мог ответить на простой вопрос «письма уходят или нет?»:
								экран говорил одновременно да и нет. Записи в журнале остаются
								от периода, когда канал был настроен, и это нормально; неверно
								было обобщение в баннере.
							*/}
							<strong>
								Новые сообщения сейчас не уйдут: ни один канал связи не
								подключён.
							</strong>
							<p>
								Телеграм и WhatsApp клиника подключает сама — в настройках. SMS
								и электронную почту подключает тот, кто устанавливал программу:
								для них нужны ключи доступа на сервере клиники.
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
					) : null}
					{/*
						Список каналов показывается, только когда есть что различать.
						Когда не подключён НИ ОДИН, шесть одинаковых плашек «не настроен»
						подряд повторяли красный баннер выше шесть раз. Стена одинаковых
						предупреждений приучает не читать предупреждения вообще — а
						следующее может оказаться важным.
					*/}
					{configuredChannels.length > 0 ? (
						<ul className="quick-chips-row ops-channel-list">
							{(Object.keys(gateways?.channels ?? {}) as ChannelCode[]).map(
								(code) => {
									const channel = gateways?.channels?.[code];
									return (
										<li key={code}>
											<span
												className={`ops-state ops-state--${channel?.configured ? "ok" : "muted"}`}
											>
												{channelLabels[code] ?? code}:{" "}
												{channel?.configured ? "настроен" : "не настроен"}
											</span>
										</li>
									);
								},
							)}
						</ul>
					) : null}
					{gateways?.channels?.sms?.configured ? (
						<p className="ops-hint">
							SMS-шлюз: {gateways?.channels?.sms?.provider ?? "—"}
							{gateways?.channels?.sms?.sender
								? `, отправитель ${gateways?.channels?.sms?.sender}`
								: ""}
							.{" "}
							{gateways?.channels?.sms?.balance
								? `Остаток ${formatSmsBalance(gateways.channels.sms.balance)} ${gateways?.channels?.sms?.balance?.currency ?? ""}.`
								: gateways?.channels?.sms?.balanceError
									? `Остаток не получен: ${gateways?.channels?.sms?.balanceError}`
									: ""}
							{uisQuota && (
								<span
									className={
										(uisQuota?.remaining ?? 0) <= 0
											? "text-[var(--bad-fg)] font-bold ml-2"
											: "ml-2"
									}
								>
									Лимит UIS SMS:{" "}
									{(uisQuota?.smsQuotaLimit ?? 0) - (uisQuota?.remaining ?? 0)}/
									{uisQuota?.smsQuotaLimit ?? 0}
								</span>
							)}
						</p>
					) : null}
				</>
			)}
		</>
	);
}
