import { MessageCircle } from "lucide-react";
import { useState } from "react";
import "./SettingsMessengersTab.css";

import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { MaxSettingsPanel } from "./MaxSettingsPanel.js";
import { MessageTemplatesPanel } from "./MessageTemplatesPanel.js";
import { SettingsTelegramTab } from "./SettingsTelegramTab.js";
import { WhatsappSettingsPanel } from "./WhatsappSettingsPanel.js";

interface StaffOption {
	id: string;
	fullName: string;
}

type MessengerTabId = "telegram" | "whatsapp" | "max" | "templates";

/*
 * Контракт вкладки: только то, что она реально читает из объединённого мешка.
 * Аннотация обязательна — useAppLogic объявлен как `(): any`
 * (apps/web/src/useAppLogic.tsx:934), поэтому appLogic, derivations и результат
 * Object.assign имеют тип any, и снятие `as any` само по себе не включает ни
 * одной проверки. С этой аннотацией опечатка в имени пропса становится ошибкой.
 *
 * serverBaseUrl — шов для развёртываний, где API живёт не на том же хосте, что
 * SPA. Сегодня его НИКТО не заполняет: производителя нет ни в useAppLogic, ни в
 * SettingsView.settingsProps (там `Record<string, any>`, тоже стирающий типы).
 * Поэтому значение всегда undefined, и WhatsappSettingsPanel/MaxSettingsPanel
 * всегда уходят на свой запасной путь window.location.origin. Шов сохранён и
 * типизирован, но URL здесь не выдумывается: VITE_API_URL несёт суффикс /api,
 * а строители вебхуков дописывают /api сами.
 */
type MessengersMergedProps = {
	staffOptions?: StaffOption[] | undefined;
	serverBaseUrl?: string | undefined;
};

export function SettingsMessengersTab({
	props: incomingProps,
	settingsTab,
}: {
	props?: MessengersMergedProps;
	settingsTab: string;
}) {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	/*
	 * mergedBag остаётся непроверяемым намеренно: он целиком передаётся вниз в
	 * SettingsTelegramTab, у которого свой (пока тоже нетипизированный) набор
	 * пропсов. Сужать его до двух полей нельзя — во время исполнения вниз уходят
	 * все поля, и узкий тип соврал бы читателю о том, что нужно дочерней вкладке.
	 */
	const mergedBag = Object.assign({}, appLogic, derivations, incomingProps);
	const props: MessengersMergedProps = mergedBag;
	const [activeMessenger, setActiveMessenger] = useState<MessengerTabId>(
		settingsTab === "telegram" ? "telegram" : "whatsapp",
	);

	if (settingsTab !== "messengers" && settingsTab !== "telegram") return null;

	const staffOptions = props.staffOptions ?? [];
	const serverBaseUrl = props.serverBaseUrl;

	return (
		<section className="messengers-settings" aria-label="Мессенджеры клиники">
			<div className="import-copy">
				<MessageCircle aria-hidden="true" />
				<div>
					<p className="eyebrow">Мессенджеры</p>
					<h2>Интеграция с мессенджерами</h2>
					<p>
						Настройте интеграцию с Telegram, WhatsApp Business и MAX для
						автоматических уведомлений, рассылок и обратной связи с пациентами.
					</p>
				</div>
			</div>

			<div
				className="messenger-channel-tabs"
				role="tablist"
				aria-label="Каналы мессенджеров"
			>
				<button
					role="tab"
					aria-selected={activeMessenger === "telegram"}
					aria-controls="messenger-panel-telegram"
					id="messenger-tab-telegram"
					type="button"
					onClick={() => setActiveMessenger("telegram")}
					className={`messenger-channel-tab${activeMessenger === "telegram" ? " active" : ""}`}
				>
					<span className="messenger-tab-badge tg-badge" aria-hidden="true">
						TG
					</span>
					Telegram-бот
				</button>

				<button
					role="tab"
					aria-selected={activeMessenger === "whatsapp"}
					aria-controls="messenger-panel-whatsapp"
					id="messenger-tab-whatsapp"
					type="button"
					onClick={() => setActiveMessenger("whatsapp")}
					className={`messenger-channel-tab${activeMessenger === "whatsapp" ? " active" : ""}`}
				>
					<span className="messenger-tab-badge wa-badge" aria-hidden="true">
						WA
					</span>
					WhatsApp Business
				</button>

				<button
					role="tab"
					aria-selected={activeMessenger === "max"}
					aria-controls="messenger-panel-max"
					id="messenger-tab-max"
					type="button"
					onClick={() => setActiveMessenger("max")}
					className={`messenger-channel-tab${activeMessenger === "max" ? " active" : ""}`}
				>
					<span className="messenger-tab-badge max-badge" aria-hidden="true">
						MAX
					</span>
					MAX by 1C
				</button>

				<button
					role="tab"
					aria-selected={activeMessenger === "templates"}
					aria-controls="messenger-panel-templates"
					id="messenger-tab-templates"
					type="button"
					onClick={() => setActiveMessenger("templates")}
					className={`messenger-channel-tab${activeMessenger === "templates" ? " active" : ""}`}
				>
					<span
						className="messenger-tab-badge bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 rounded px-1.5 py-0.5 text-xs font-medium"
						aria-hidden="true"
					>
						TXT
					</span>
					Шаблоны
				</button>
			</div>

			{activeMessenger === "telegram" && (
				<div
					id="messenger-panel-telegram"
					role="tabpanel"
					aria-labelledby="messenger-tab-telegram"
				>
					<SettingsTelegramTab props={mergedBag} settingsTab="telegram" />
				</div>
			)}

			{activeMessenger === "whatsapp" && (
				<div
					id="messenger-panel-whatsapp"
					role="tabpanel"
					aria-labelledby="messenger-tab-whatsapp"
				>
					<WhatsappSettingsPanel
						staffOptions={staffOptions}
						serverBaseUrl={serverBaseUrl}
					/>
				</div>
			)}

			{activeMessenger === "max" && (
				<div
					id="messenger-panel-max"
					role="tabpanel"
					aria-labelledby="messenger-tab-max"
				>
					<MaxSettingsPanel
						staffOptions={staffOptions}
						serverBaseUrl={serverBaseUrl}
					/>
				</div>
			)}

			{activeMessenger === "templates" && (
				<div
					id="messenger-panel-templates"
					role="tabpanel"
					aria-labelledby="messenger-tab-templates"
				>
					<MessageTemplatesPanel />
				</div>
			)}
		</section>
	);
}
