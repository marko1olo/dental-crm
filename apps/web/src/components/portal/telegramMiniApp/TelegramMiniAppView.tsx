/**
 * DENTE POCKET CLINIC — Telegram WebApp Mini App
 * (DOMAIN: TELEGRAM MINI APPS & PATIENT RETENTION HUB)
 *
 * Особенности (Apple HIG & Anti-Desktop-Squeeze):
 * - Интерактивная зубная формула жалоб FDI (32 постоянных + 20 молочных зубов):
 *   * Нативная шторка жалоб (Bottom Sheet Drawer): ⚡ Острая боль, 🦷 Скол, 🕳️ Кариес, ❄️ Холодное/горячее, 👑 Коронка/имплант
 *   * Сенсорный минимум >= 44x44px на тач-экранах (390x844)
 * - Онлайн-календарь и запись к врачу-стоматологу в 1 тап:
 *   * Выбор специалиста (терапевт, хирург, ортодонт, гигиенист)
 *   * Прикрепление выбранных зубов и симптомов прямо в медкарту и задачу CRM
 *   * Отправка через Telegram.WebApp.sendData и REST API /api/telegram/webapp/book
 * - Электронная медицинская карта (ЭМК): индекс здоровья, семейный профиль, NPS опрос
 * - Реферальная программа («Подари другу 1 000 ₽»)
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
	Activity,
	Calendar,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	Heart,
	Info,
	MessageSquare,
	Phone,
	Send,
	Share2,
	ShieldCheck,
	Sparkles,
	Star,
	User,
	Users,
	Zap,
} from "lucide-react";
import "./telegramMiniApp.css";
import {
	TelegramInteractiveToothPicker,
	type ToothComplaint,
} from "./TelegramInteractiveToothPicker";
import { TelegramMiniAppBooking } from "./TelegramMiniAppBooking";
import {
	TelegramPatientPortalCabinet,
	type TelegramCabinetTab,
} from "./TelegramPatientPortalCabinet";


// Типы для Telegram WebApp SDK
declare global {
	interface Window {
		Telegram?: {
			WebApp?: {
				initData?: string;
				initDataUnsafe?: {
					user?: {
						id?: number;
						first_name?: string;
						last_name?: string;
						username?: string;
					};
				};
				themeParams?: {
					bg_color?: string;
					text_color?: string;
					button_color?: string;
					button_text_color?: string;
					secondary_bg_color?: string;
				};
				isExpanded?: boolean;
				viewportHeight?: number;
				ready?: () => void;
				expand?: () => void;
				close?: () => void;
				sendData?: (data: string) => void;
				openTelegramLink?: (url: string) => void;
				openLink?: (url: string) => void;
				HapticFeedback?: {
					impactOccurred?: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
					notificationOccurred?: (type: "error" | "success" | "warning") => void;
					selectionChanged?: () => void;
				};
			};
		};
	}
}

export type TelegramTab =
	| "teeth"
	| "odontogram"
	| "booking"
	| "emr"
	| "cabinet"
	| "appointments"
	| "imaging"
	| "tax"
	| "finance";

export interface TelegramMiniAppViewProps {
	readonly organizationId?: string | null | undefined;
	readonly initialTab?: TelegramTab;
	readonly patientId?: string | null | undefined;
}

export const TelegramMiniAppView: React.FC<TelegramMiniAppViewProps> = memo(({
	organizationId: propOrgId,
	initialTab,
	patientId: propPatientId,
}) => {
	// Разбор URL-параметров Telegram Mini App (?tab=tax&taxSheet=1)
	const searchParams = useMemo(() => {
		if (typeof window === "undefined") return null;
		const queryStr = window.location.search || window.location.hash.split("?")[1] || "";
		return new URLSearchParams(queryStr);
	}, []);

	const urlTab = (searchParams?.get("tab") as TelegramTab | null) ?? null;
	const isTaxSheetRequested = searchParams?.get("taxSheet") === "1" || searchParams?.get("taxSheet") === "true";

	const effectiveInitialTab: TelegramTab = urlTab ?? initialTab ?? "cabinet";
	const [activeTab, setActiveTab] = useState<TelegramTab>(effectiveInitialTab);

	// Прикрепленные жалобы по зубам
	const [toothComplaints, setToothComplaints] = useState<ToothComplaint[]>([
		{
			toothNumber: 16,
			complaintType: "acute_throbbing",
			symptomLabel: "Острая пульсирующая боль",
			painLevel: 4,
			cito: true,
			notes: "Болит при накусывании 2 дня",
		},
	]);


	// Профиль пациента и семья
	const [patientName, setPatientName] = useState<string>("Александр");
	const [bonusPoints, setBonusPoints] = useState<number>(1500);
	const [familyMembers] = useState<Array<{ id: string; name: string; relation: string; age?: number }>>([
		{ id: "self", name: "Александр (Я)", relation: "self" },
		{ id: "child-1", name: "Артём (Сын, 8 лет)", relation: "child", age: 8 },
		{ id: "child-2", name: "София (Дочь, 12 лет)", relation: "child", age: 12 },
	]);
	const [activeFamilyMemberId, setActiveFamilyMemberId] = useState<string>("self");

	// NPS опрос
	const [npsScore, setNpsScore] = useState<number | null>(null);
	const [npsSubmitted, setNpsSubmitted] = useState<boolean>(false);

	// Инициализация Telegram WebApp
	useEffect(() => {
		const tg = window.Telegram?.WebApp;
		if (tg) {
			tg.ready?.();
			tg.expand?.();
			if (tg.initDataUnsafe?.user?.first_name) {
				setPatientName(tg.initDataUnsafe.user.first_name);
			}
		}
	}, []);

	const triggerHaptic = useCallback((style: "light" | "medium" | "heavy" = "light") => {
		try {
			window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(style);
		} catch {
			// Игнорируем в браузере без Telegram
		}
	}, []);

	// Добавление / обновление жалобы на зуб
	const handleSaveToothComplaint = useCallback((complaint: ToothComplaint) => {
		setToothComplaints((prev) => {
			const filtered = prev.filter((c) => c.toothNumber !== complaint.toothNumber);
			return [...filtered, complaint];
		});
	}, []);

	// Удаление жалобы на зуб
	const handleRemoveToothComplaint = useCallback((toothNumber: number) => {
		setToothComplaints((prev) => prev.filter((c) => c.toothNumber !== toothNumber));
	}, []);

	// Отправка NPS оценки
	const handleNpsRate = async (score: number) => {
		setNpsScore(score);
		setNpsSubmitted(true);
		triggerHaptic("light");

		try {
			await fetch("/api/telegram/loyalty/nps", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					organizationId: propOrgId || "demo-clinic-org",
					appointmentId: "demo-recent-appointment",
					score,
				}),
			});
		} catch {
			// Фоллбек
		}
	};

	// Поделиться реферальной ссылкой
	const handleShareReferral = () => {
		triggerHaptic("medium");
		const link = `https://t.me/DenteClinicBot?start=ref_${propPatientId || "friend"}`;
		const shareText = "Дарю тебе 1 000 ₽ на визит в стоматологию DENTE! Запишись онлайн в 1 тап:";
		const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`;

		if (window.Telegram?.WebApp?.openTelegramLink) {
			window.Telegram.WebApp.openTelegramLink(tgShareUrl);
		} else {
			window.open(tgShareUrl, "_blank");
		}
	};

	// Если активна любая из вкладок расширенного Кабинета пациента Pocket Clinic
	if (
		activeTab === "cabinet" ||
		activeTab === "teeth" ||
		activeTab === "appointments" ||
		activeTab === "imaging" ||
		activeTab === "tax" ||
		activeTab === "finance"
	) {
		const cabinetInitialTab: TelegramCabinetTab =
			activeTab === "cabinet" ? "appointments" : (activeTab as TelegramCabinetTab);
		return (
			<TelegramPatientPortalCabinet
				organizationId={propOrgId}
				patientId={propPatientId}
				initialTab={cabinetInitialTab}
				initialTaxSheetOpen={isTaxSheetRequested}
				onBack={() => setActiveTab("odontogram")}
			/>
		);
	}

	return (
		<div className="tg-app-container">
			{/* Шапка Mini App */}
			<header className="tg-app-header">

				<div className="tg-app-brand">
					<div className="tg-app-logo">
						<Activity size={20} />
					</div>
					<div>
						<div className="tg-app-title">DENTE Pocket Clinic</div>
						<div className="tg-app-subtitle">
							<ShieldCheck size={12} className="text-teal-400" />
							<span>Здравствуйте, {patientName}!</span>
						</div>
					</div>
				</div>

				<div className="tg-bonus-chip" title="Ваш бонусный баланс DENTE">
					<Sparkles size={13} />
					<span>{bonusPoints.toLocaleString("ru-RU")} ₽</span>
				</div>
			</header>

			{/* Семейный стрип: переключение между профилями родителей и детей */}
			<div className="tg-family-strip">
				<Users size={14} className="text-slate-400 ml-1 flex-shrink-0" />
				{familyMembers.map((m) => (
					<button
						key={m.id}
						type="button"
						className={`tg-family-pill ${activeFamilyMemberId === m.id ? "active" : ""}`}
						onClick={() => {
							setActiveFamilyMemberId(m.id);
							triggerHaptic("light");
						}}
					>
						<User size={13} />
						<span>{m.name}</span>
					</button>
				))}
			</div>

			{/* ТАБ 1: ИНТЕРАКТИВНАЯ ЗУБНАЯ ФОРМУЛА ЖАЛОБ (FDI 32 + 20) */}
			{activeTab === "odontogram" && (
				<main className="tg-tab-content">
					<TelegramInteractiveToothPicker
						selectedComplaints={toothComplaints}
						onSaveComplaint={handleSaveToothComplaint}
						onRemoveComplaint={handleRemoveToothComplaint}
						onProceedToBooking={() => setActiveTab("booking")}
					/>
				</main>
			)}

			{/* ТАБ 2: ОНЛАЙН-ЗАПИСЬ НА ПРИЁМ (С ПРИКРЕПЛЕНИЕМ ЗУБОВ) */}
			{activeTab === "booking" && (
				<main className="tg-tab-content">
					<TelegramMiniAppBooking
						organizationId={propOrgId}
						patientId={propPatientId}
						attachedComplaints={toothComplaints}
						onBackToTeeth={() => setActiveTab("odontogram")}
						onBookingComplete={() => {
							// Опционально очищаем жалобы или оставляем в медкарте
						}}
					/>
				</main>
			)}

			{/* ТАБ 3: ЭЛЕКТРОННАЯ МЕДКАРТА, СТАТУС ЛЕЧЕНИЯ & ЛОЯЛЬНОСТЬ */}
			{activeTab === "emr" && (
				<main className="tg-tab-content">
					{/* Карточка статуса плана лечения */}
					<div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 shadow-lg backdrop-blur-md">
						<div className="flex items-center justify-between mb-2">
							<div className="text-xs font-bold uppercase tracking-wider text-slate-400">
								Индекс здоровья & план лечения
							</div>
							<span className="text-xs font-bold text-teal-400">75% выполнено</span>
						</div>
						<div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden mb-3">
							<div className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full w-3/4 transition-all duration-500" />
						</div>
						<div className="text-xs text-slate-300 space-y-1">
							<div className="flex items-center gap-1.5 text-emerald-400">
								<Check size={14} />
								<span>Этап 1: Профгигиена полости рта (Завершено)</span>
							</div>
							<div className="flex items-center gap-1.5 text-emerald-400">
								<Check size={14} />
								<span>Этап 2: Терапия кариеса зубов 16, 26 (Завершено)</span>
							</div>
							<div className="flex items-center gap-1.5 text-amber-400">
								<Clock size={14} />
								<span>Этап 3: Контрольный осмотр и герметизация (Ожидает)</span>
							</div>
						</div>
					</div>

					{/* Карточка следующего визита */}
					<div className="bg-gradient-to-br from-teal-950/60 to-slate-900 border border-teal-500/40 rounded-2xl p-4 shadow-md">
						<div className="flex items-center justify-between mb-2">
							<span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">
								Ближайший запланированный визит
							</span>
							<span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
								Подтвержден
							</span>
						</div>
						<div className="text-base font-bold text-slate-100">Четверг, 12 октября в 14:00</div>
						<div className="text-xs text-slate-300 mt-1">Доктор: Смирнов А.В. • Кабинет 3 (Терапия)</div>
					</div>

					{/* Программа «Приведи друга» */}
					<div className="bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/30 rounded-2xl p-4 shadow-md">
						<div className="flex items-center gap-2 mb-2">
							<div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
								🎁
							</div>
							<div>
								<div className="text-sm font-bold text-slate-100">Подари другу 1 000 ₽</div>
								<div className="text-xs text-slate-400">И получи +500 ₽ на свой счет в клинике</div>
							</div>
						</div>
						<p className="text-xs text-slate-300 leading-relaxed mb-3">
							Ваш друг получит персональный сертификат на 1 000 ₽ на первый визит или комплексную чистку, а вы — 500 бонусов DENTE сразу после его записи.
						</p>
						<button
							type="button"
							className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
							onClick={handleShareReferral}
						>
							<Share2 size={15} />
							<span>Отправить приглашение другу в Telegram</span>
						</button>
					</div>

					{/* Опрос NPS / Индекс лояльности */}
					<div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 shadow-md">
						<div className="text-sm font-bold text-slate-100 mb-1">Оценка недавнего визита</div>
						<div className="text-xs text-slate-400 mb-3">
							Насколько вы довольны качеством лечения и сервисом в клинике?
						</div>

						{npsSubmitted ? (
							<div className="p-3 bg-slate-900/60 rounded-xl text-center space-y-2">
								<div className="text-xs text-teal-400 font-bold">
									{npsScore === 5 ? "⭐️ Спасибо за высшую оценку 5/5!" : "🙏 Спасибо за ваш отзыв!"}
								</div>
								{npsScore === 5 ? (
									<div className="space-y-1.5 pt-1">
										<p className="text-[11px] text-slate-300">
											Пожалуйста, поддержите доктора отзывом на картах:
										</p>
										<div className="flex gap-2">
											<a
												href="https://yandex.ru/maps/"
												target="_blank"
												rel="noopener noreferrer"
												className="flex-1 py-1.5 px-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold text-center"
											>
												Яндекс.Карты
											</a>
											<a
												href="https://2gis.ru/"
												target="_blank"
												rel="noopener noreferrer"
												className="flex-1 py-1.5 px-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold text-center"
											>
												2GIS
											</a>
										</div>
									</div>
								) : (
									<p className="text-[11px] text-slate-400">
										Руководство клиники уже уведомлено и свяжется с вами для разбора.
									</p>
								)}
							</div>
						) : (
							<div className="flex justify-between gap-1.5">
								{[1, 2, 3, 4, 5].map((star) => (
									<button
										key={star}
										type="button"
										className="flex-1 py-2.5 bg-slate-900/60 hover:bg-slate-700/80 border border-slate-700/60 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-200 transition-all active:scale-95"
										onClick={() => handleNpsRate(star)}
									>
										<Star size={18} className={star === 5 ? "text-amber-400 fill-amber-400" : "text-slate-400"} />
										<span className="text-xs font-bold">{star}</span>
									</button>
								))}
							</div>
						)}
					</div>
				</main>
			)}

			{/* Фиксированный нижний таббар (Навигация) */}
			<nav className="tg-bottom-nav">
				<button
					type="button"
					className={`tg-nav-btn ${activeTab === "odontogram" ? "active" : ""}`}
					onClick={() => {
						setActiveTab("odontogram");
						triggerHaptic("light");
					}}
				>
					<Zap size={20} />
					<span>Зубная формула</span>
					{toothComplaints.length > 0 && (
						<span className="tg-nav-badge">{toothComplaints.length}</span>
					)}
				</button>

				<button
					type="button"
					className={`tg-nav-btn ${activeTab === "booking" ? "active" : ""}`}
					onClick={() => {
						setActiveTab("booking");
						triggerHaptic("light");
					}}
				>
					<Calendar size={20} />
					<span>Онлайн-запись</span>
				</button>

				<button
					type="button"
					className={`tg-nav-btn ${activeTab === "emr" ? "active" : ""}`}
					onClick={() => {
						setActiveTab("emr");
						triggerHaptic("light");
					}}
				>
					<Activity size={20} />
					<span>Моё здоровье</span>
				</button>

				<button
					type="button"
					className={`tg-nav-btn ${(activeTab as TelegramTab) === "cabinet" ? "active" : ""}`}
					onClick={() => {
						setActiveTab("cabinet");
						triggerHaptic("light");
					}}
				>
					<ShieldCheck size={20} />
					<span>Кабинет</span>
				</button>
			</nav>

		</div>
	);
});

TelegramMiniAppView.displayName = "TelegramMiniAppView";
