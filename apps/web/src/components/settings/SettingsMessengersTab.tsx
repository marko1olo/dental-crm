import { BellRing, Bot, MessageCircle } from "lucide-react";
import { useState } from "react";
import "./SettingsMessengersTab.css";

import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { showToast } from "../GlobalToast";
import { MaxSettingsPanel } from "./MaxSettingsPanel.js";
import { MessengersOverviewCard } from "./MessengersOverviewCard.js";
import { ReminderCadenceConfigPanel } from "./ReminderCadenceConfigPanel.js";
import { SettingsMessageTemplatesTab } from "./SettingsMessageTemplatesTab.js";
import { SettingsTelegramTab } from "./SettingsTelegramTab.js";
import { VkIntegrationHub } from "./VkIntegrationHub.js";
import { WhatsappSettingsPanel } from "./WhatsappSettingsPanel.js";
import { BotOnboardingWizard } from "./telegram/BotOnboardingWizard.js";
import { BotStudioModal } from "./telegram/BotStudioModal.js";

interface StaffOption {
	id: string;
	fullName: string;
}

export type MessengerTabId =
	| "cadence"
	| "telegram"
	| "vk"
	| "whatsapp"
	| "max"
	| "templates";

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
		settingsTab === "telegram" ? "telegram" : "cadence",
	);
	const [isBotStudioOpen, setIsBotStudioOpen] = useState<boolean>(false);

	if (settingsTab !== "messengers" && settingsTab !== "telegram") return null;

	const staffOptions = props.staffOptions ?? [];
	const serverBaseUrl = props.serverBaseUrl;

	return (
		<section className="messengers-settings" aria-label="Мессенджеры клиники">
			<div className="messengers-settings-header">
				<div className="flex gap-4">
					<MessageCircle aria-hidden="true" />
					<div>
						<p className="eyebrow">Мессенджеры и каденции</p>
						<h2>Уведомления и мессенджеры клиники</h2>
						<p>
							Настройка цепочек напоминаний пациентам (24ч до визита, 2ч с навигацией, 24ч после операции)
							и шлюзов доставки через WhatsApp Business, Telegram, MAX (1C) и SMS.
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={() => setIsBotStudioOpen(true)}
					className="primary-button compact-button inline-flex items-center gap-1.5 shrink-0 self-start mt-1"
				>
					<Bot size={14} />
					<span>Настройка бота-ассистента</span>
				</button>
			</div>

			{/* Master Omnichannel Overview Card */}
			<div className="my-5">
				<MessengersOverviewCard
					onSelectTab={(tabId) => {
						if (
							tabId === "telegram" ||
							tabId === "whatsapp" ||
							tabId === "vk" ||
							tabId === "max" ||
							tabId === "cadence" ||
							tabId === "templates"
						) {
							setActiveMessenger(tabId as MessengerTabId);
						} else {
							setActiveMessenger("telegram");
						}
					}}
					onOpenBotStudio={() => setIsBotStudioOpen(true)}
					onOpenOperatorDesk={() => {
						if (appLogic?.setActiveView) {
							appLogic.setActiveView("chat");
						} else if (appLogic?.setCurrentView) {
							appLogic.setCurrentView("chat");
						} else {
							showToast("Переход в диалоги оператора ботов", "info");
						}
					}}
				/>
			</div>

			<div
				className="messenger-channel-tabs"
				role="tablist"
				aria-label="Каналы мессенджеров"
			>
				<button
					role="tab"
					aria-selected={activeMessenger === "cadence"}
					aria-controls="messenger-panel-cadence"
					id="messenger-tab-cadence"
					type="button"
					onClick={() => setActiveMessenger("cadence")}
					className={`messenger-channel-tab${activeMessenger === "cadence" ? " active" : ""}`}
				>
					<span
						className="messenger-tab-badge bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 rounded px-1.5 py-0.5 text-xs font-bold inline-flex items-center gap-0.5"
						aria-hidden="true"
					>
						<BellRing size={11} /> 24h
					</span>
					Каденция напоминаний
				</button>

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
					aria-selected={activeMessenger === "vk"}
					aria-controls="messenger-panel-vk"
					id="messenger-tab-vk"
					type="button"
					onClick={() => setActiveMessenger("vk")}
					className={`messenger-channel-tab${activeMessenger === "vk" ? " active" : ""}`}
				>
					<span className="messenger-tab-badge vk-badge" aria-hidden="true">
						VK
					</span>
					ВКонтакте
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
					Шаблоны сообщений
				</button>
			</div>

			{activeMessenger === "cadence" && (
				<div
					id="messenger-panel-cadence"
					role="tabpanel"
					aria-labelledby="messenger-tab-cadence"
				>
					<ReminderCadenceConfigPanel />
				</div>
			)}

			{activeMessenger === "telegram" && (
				<div
					id="messenger-panel-telegram"
					role="tabpanel"
					aria-labelledby="messenger-tab-telegram"
				>
					<SettingsTelegramTab props={mergedBag} settingsTab="telegram" />
				</div>
			)}

			{activeMessenger === "vk" && (
				<div
					id="messenger-panel-vk"
					role="tabpanel"
					aria-labelledby="messenger-tab-vk"
				>
					<VkIntegrationHub serverBaseUrl={serverBaseUrl} />
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
					<SettingsMessageTemplatesTab />
				</div>
			)}

			<BotStudioModal
				isOpen={isBotStudioOpen}
				onClose={() => setIsBotStudioOpen(false)}
				parentProps={mergedBag}
				initialChannel={
					activeMessenger === "vk"
						? "vk"
						: activeMessenger === "whatsapp"
							? "whatsapp"
							: activeMessenger === "max"
								? "max"
								: "telegram"
				}
			/>
		</section>
	);
}
