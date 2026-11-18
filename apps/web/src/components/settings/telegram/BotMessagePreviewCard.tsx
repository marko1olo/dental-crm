import React from "react";
import type { BotPreset } from "./telegramBotPresets.js";

export type BotChannelType = "telegram" | "vk" | "whatsapp" | "max";

export interface BotMessagePreviewCardProps {
	preset: BotPreset;
	channel?: BotChannelType;
	customClinicName?: string;
	customWelcomeText?: string;
	customPrimaryActionLabel?: string;
	previewScreenId?: string;
	onScreenChange?: (screenId: string) => void;
	themeMode?: "light" | "dark";
	onThemeModeChange?: (mode: "light" | "dark") => void;
}

interface ChannelInfo {
	name: string;
	badge: string;
	statusText: string;
	headerClass: string;
	channelClass: string;
}

const CHANNEL_MAP: Record<BotChannelType, ChannelInfo> = {
	telegram: {
		name: "Telegram Bot",
		badge: "TG",
		statusText: "bot",
		headerClass: "header-telegram",
		channelClass: "channel-telegram",
	},
	vk: {
		name: "ВКонтакте Сообщество",
		badge: "VK",
		statusText: "сообщество онлайн",
		headerClass: "header-vk",
		channelClass: "channel-vk",
	},
	whatsapp: {
		name: "WhatsApp Business",
		badge: "WA",
		statusText: "официальный бизнес-аккаунт",
		headerClass: "header-whatsapp",
		channelClass: "channel-whatsapp",
	},
	max: {
		name: "MAX (1С:Медицина)",
		badge: "MAX",
		statusText: "корпоративный шлюз CRM",
		headerClass: "header-max",
		channelClass: "channel-max",
	},
};

/**
 * Карточка предпросмотра сообщений клинического бота в мессенджерах (Telegram, VK, WhatsApp, MAX).
 * Отображает интерактивное оформление чата без бутафорского симулятора корпуса смартфона.
 */
export function BotMessagePreviewCard(props: BotMessagePreviewCardProps) {
	const {
		preset,
		channel = "telegram",
		customClinicName,
		customWelcomeText,
		customPrimaryActionLabel,
		previewScreenId,
		onScreenChange,
	} = props;

	const clinicTitle = customClinicName?.trim() || "Стоматология ДЕНТЕ";
	const info = CHANNEL_MAP[channel] ?? CHANNEL_MAP.telegram;

	// Resolve screen content
	let title = clinicTitle;
	let text = customWelcomeText || preset?.defaultWelcomeText || `Добро пожаловать в «${clinicTitle}»!`;
	let buttons: Array<Array<{ text: string; action: string; isPrimary?: boolean; url?: string }>> = [];

	if (previewScreenId === "booking") {
		title = "Онлайн-запись 24/7";
		text = `Онлайн-запись на приём в «${clinicTitle}»:\n\n1. Выберите направление или специалиста\n2. Укажите удобную дату и время\n3. Запись моментально появится в расписании клиники.`;
		buttons = [
			[{ text: "Терапия / Осмотр (Смирнова Е.А.)", action: "action:select_service", isPrimary: true }],
			[
				{ text: "Эстетика & Виниры (Барабаш С.В.)", action: "action:select_service" },
				{ text: "Детское отделение (адаптация)", action: "action:select_service" },
			],
			[{ text: "Ближайший слот: Завтра 14:00", action: "action:confirm_slot", isPrimary: true }],
		];
	} else if (previewScreenId === "reminders") {
		title = "Напоминание о приёме";
		text = `Напоминание о визите:\n\nЗдравствуйте, Анна! Напоминаем о вашем приёме завтра в 14:00 к врачу Смирновой Е.А. (Терапия, кабинет 2).\n\nКлиника: «${clinicTitle}»\nПожалуйста, подтвердите визит или перенесите время:`;
		buttons = [
			[{ text: "Да, я буду (Подтвердить)", action: "action:confirm_visit", isPrimary: true }],
			[{ text: "Перенести на другой день", action: "action:reschedule" }],
		];
	} else if (previewScreenId === "reviews") {
		title = "Сбор отзывов и NPS";
		text = `Спасибо, что доверили здоровье вашей улыбки клинике «${clinicTitle}»!\n\nКак прошёл ваш сегодняшний визит? Будем благодарны за оценку на независимых порталах. Это помогает нам становиться лучше!`;
		buttons = [
			[{ text: "Отлично, всё понравилось", action: "action:rate_5", isPrimary: true }],
			[
				{ text: "Яндекс.Карты (Бонус 500 ₽)", action: "action:open_yandex", url: "https://maps.yandex.ru" },
				{ text: "2ГИС", action: "action:open_2gis", url: "https://2gis.ru" },
			],
		];
	} else if (previewScreenId === "estimate") {
		title = "План лечения и смета";
		text = `План лечения и согласованная смета в «${clinicTitle}»:\n\n• Этап 1: Профессиональная гигиена и диагностика — 6 000 ₽\n• Этап 2: Терапия зубов под микроскопом — 11 000 ₽\n• Этап 3: Керамическая реставрация — 25 000 ₽`;
		buttons = [
			[{ text: "Согласовать план лечения", action: "action:approve_plan", isPrimary: true }],
			[{ text: "Связаться с куратором", action: "action:call_concierge" }],
		];
	} else if (preset?.screens?.root?.buttons) {
		buttons = preset.screens.root.buttons;
	}

	return (
		<div
			className={`tg-simulator-wrapper ${info.channelClass}`}
			aria-label={`Предпросмотр сообщения бота (${info.name})`}
			style={{
				width: "100%",
				maxWidth: "380px",
				display: "flex",
				flexDirection: "column",
				gap: "10px",
				margin: "0 auto",
			}}
		>
			<div className={`p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-xs ${info.headerClass}`}>
				<div className="flex items-center justify-between pb-3 border-b border-[var(--line)] text-xs text-[var(--ink-muted)]">
					<span className="font-semibold text-[var(--ink)]">{info.name}</span>
					<span className="px-2 py-0.5 rounded-full bg-[var(--paper-soft)] border border-[var(--line)] text-[10px] text-[var(--ink-muted)]">
						{info.statusText}
					</span>
				</div>

				<div className="py-3 text-sm leading-relaxed whitespace-pre-line text-[var(--ink)]">
					<div className="font-semibold text-xs mb-1.5 text-[var(--primary)]">{title}</div>
					{text}
				</div>

				{buttons.length > 0 && (
					<div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--line)]">
						{buttons.map((row, rIdx) => (
							<div key={rIdx} className="flex gap-1.5">
								{row.map((btn, bIdx) => (
									<button
										key={bIdx}
										type="button"
										className={
											btn.isPrimary
												? "h-8 px-3 rounded-md bg-[var(--primary)] text-white text-xs font-medium flex-1 cursor-pointer hover:bg-[var(--primary-hover)] transition-colors"
												: "h-8 px-3 rounded-md bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] text-xs font-medium flex-1 cursor-pointer hover:bg-[var(--paper-soft)] transition-colors"
										}
										onClick={() => {
											if (btn.action.startsWith("screen:") && onScreenChange) {
												onScreenChange(btn.action.replace("screen:", ""));
											}
										}}
									>
										{btn.text}
									</button>
								))}
							</div>
						))}
					</div>
				)}

				{customPrimaryActionLabel && (
					<div className="pt-2">
						<button
							type="button"
							className="h-8 px-3 rounded-md bg-[var(--primary)] text-white text-xs font-medium w-full cursor-pointer hover:bg-[var(--primary-hover)] transition-colors"
						>
							{customPrimaryActionLabel}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

/** Алиас для плавной обратной совместимости */
export const TelegramPhoneSimulator = BotMessagePreviewCard;
export default BotMessagePreviewCard;
