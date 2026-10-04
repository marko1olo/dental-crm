import React, { useEffect, useState, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import {
	BarChart3,
	CalendarDays,
	ChevronRight,
	CreditCard,
	Database,
	FileText,
	FlaskConical,
	Image as ImageIcon,
	LayoutDashboard,
	Megaphone,
	MessageSquare,
	MoreHorizontal,
	Package,
	ScanLine,
	Stethoscope,
	UserPlus,
	Users,
	X,
} from "lucide-react";
import { triggerHaptic } from "../../native/mobileBridge";
import type { AppView } from "../../utils/routeUtils";
import { viewLabels } from "../../utils/routeUtils";
import type { WorkspacePreloadIntent } from "../../workspacePreload";
import "./MobileTabBar.css";

export interface MobileTabBarProps {
	readonly currentView: AppView;
	readonly onSelectView: (view: AppView) => void;
	readonly onViewIntent?: (view: AppView, intent?: WorkspacePreloadIntent) => void;
	readonly allowedViews?: readonly AppView[];
}

/**
 * Основные 4 вкладки Natural Thumb Zone по канонам Apple HIG & DENTE:
 * [ 📅 Расписание ] [ 👥 Пациенты ] [ 🩺 Приём ] [ 💳 Касса ] [ ⋯ Ещё ]
 */
interface TabItemConfig {
	readonly id: AppView;
	readonly label: string;
	readonly icon: LucideIcon;
}

const PRIMARY_TABS: readonly TabItemConfig[] = [
	{ id: "schedule", label: "Расписание", icon: CalendarDays },
	{ id: "patients", label: "Пациенты", icon: Users },
	{ id: "visit", label: "Приём", icon: Stethoscope },
	{ id: "finance", label: "Касса", icon: CreditCard },
];

interface DrawerSectionItem {
	readonly id: AppView;
	readonly label: string;
	readonly subtitle: string;
	readonly icon: LucideIcon;
	readonly badgeBg: string;
	readonly iconColor: string;
}

interface DrawerSection {
	readonly title: string;
	readonly items: readonly DrawerSectionItem[];
}

const DRAWER_SECTIONS: readonly DrawerSection[] = [
	{
		title: "Лечение и приём",
		items: [
			{
				id: "shift",
				label: "Смена и дашборд",
				subtitle: "Показатели дня и загрузка кресел",
				icon: LayoutDashboard,
				badgeBg: "rgba(13, 148, 136, 0.15)",
				iconColor: "var(--teal, #0d9488)",
			},
			{
				id: "imaging",
				label: "Снимки и 3D КЛКТ",
				subtitle: "Рентген, визиограф и томография",
				icon: ImageIcon,
				badgeBg: "rgba(168, 85, 247, 0.15)",
				iconColor: "var(--purple-fg, #a855f7)",
			},
			{
				id: "documents",
				label: "Документы и справки",
				subtitle: "ИДС 1051н, договоры и акты",
				icon: FileText,
				badgeBg: "rgba(59, 130, 246, 0.15)",
				iconColor: "var(--blue-fg, #3b82f6)",
			},
			{
				id: "lab",
				label: "Лаборатория (ЗТЛ)",
				subtitle: "Наряд-заказы, коронки и этапы",
				icon: FlaskConical,
				badgeBg: "rgba(245, 158, 11, 0.15)",
				iconColor: "var(--warn-fg, #f59e0b)",
			},
			{
				id: "scanner",
				label: "Стерилизация и ЦСО",
				subtitle: "Журналы автоклавирования и СанПиН",
				icon: ScanLine,
				badgeBg: "rgba(16, 185, 129, 0.15)",
				iconColor: "var(--ok-fg, #10b981)",
			},
		],
	},
	{
		title: "Управление клиникой",
		items: [
			{
				id: "inventory",
				label: "Склад и материалы",
				subtitle: "Номенклатура, остатки и партии",
				icon: Package,
				badgeBg: "rgba(59, 130, 246, 0.15)",
				iconColor: "var(--blue-fg, #3b82f6)",
			},
			{
				id: "analytics",
				label: "Аналитика и выручка",
				subtitle: "Отчёты, средний чек и зарплаты",
				icon: BarChart3,
				badgeBg: "rgba(16, 185, 129, 0.15)",
				iconColor: "var(--ok-fg, #10b981)",
			},
			{
				id: "leads",
				label: "Обращения и лиды",
				subtitle: "Воронка пациентов и запись",
				icon: UserPlus,
				badgeBg: "rgba(249, 115, 22, 0.15)",
				iconColor: "var(--orange-fg, #f97316)",
			},
			{
				id: "marketing",
				label: "Маркетинг и акции",
				subtitle: "Рассылки, сегменты и повторные визиты",
				icon: Megaphone,
				badgeBg: "rgba(236, 72, 153, 0.15)",
				iconColor: "var(--pink-fg, #ec4899)",
			},
			{
				id: "communications",
				label: "Коммуникации и чаты",
				subtitle: "Звонки, WhatsApp и мессенджеры",
				icon: MessageSquare,
				badgeBg: "rgba(6, 182, 212, 0.15)",
				iconColor: "var(--cyan-fg, #06b6d4)",
			},
		],
	},
	{
		title: "Система",
		items: [
			{
				id: "settings",
				label: "Настройки клиники",
				subtitle: "Прейскурант, интеграции и профиль",
				icon: Database,
				badgeBg: "rgba(100, 116, 139, 0.15)",
				iconColor: "var(--muted, #64748b)",
			},
		],
	},
];

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
	currentView,
	onSelectView,
	onViewIntent,
	allowedViews,
}) => {
	const [isMoreOpen, setIsMoreOpen] = useState(false);

	// Блокировка скролла фона при открытом Bottom Sheet
	useEffect(() => {
		if (isMoreOpen) {
			const originalOverflow = document.body.style.overflow;
			document.body.style.overflow = "hidden";
			return () => {
				document.body.style.overflow = originalOverflow;
			};
		}
		return undefined;
	}, [isMoreOpen]);

	// Закрытие по Escape
	useEffect(() => {
		if (!isMoreOpen) return undefined;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsMoreOpen(false);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isMoreOpen]);

	const isPrimaryTabActive = PRIMARY_TABS.some((tab) => tab.id === currentView);
	const isMoreTabActive = !isPrimaryTabActive;

	const handleTabClick = useCallback(
		(view: AppView) => {
			triggerHaptic("selection");
			onSelectView(view);
			setIsMoreOpen(false);
		},
		[onSelectView],
	);

	const handleMoreClick = useCallback(() => {
		triggerHaptic("light");
		setIsMoreOpen((prev) => !prev);
	}, []);

	const closeMoreDrawer = useCallback(() => {
		setIsMoreOpen(false);
	}, []);

	return (
		<>
			{/* NATIVE IOS BOTTOM TAB BAR */}
			<nav
				className="dnt-bottom-nav mobile-tab-bar"
				aria-label="Мобильная навигация"
				role="navigation"
			>
				{PRIMARY_TABS.map((tab) => {
					const isActive = currentView === tab.id;
					const Icon = tab.icon;
					return (
						<a
							key={tab.id}
							href={`#${tab.id}`}
							className={`mobile-tab-item ${isActive ? "active" : ""}`}
							aria-current={isActive ? "page" : undefined}
							aria-label={tab.label}
							onClick={(e) => {
								e.preventDefault();
								handleTabClick(tab.id);
							}}
							onPointerEnter={() => onViewIntent?.(tab.id, "hover")}
							onPointerLeave={() => onViewIntent?.(tab.id, "cancel")}
						>
							<div className="mobile-tab-icon-wrap">
								<Icon className="mobile-tab-icon" aria-hidden="true" />
							</div>
							<span className="mobile-tab-label">{tab.label}</span>
						</a>
					);
				})}

				{/* Таб "⋯ Ещё" */}
				<button
					type="button"
					className={`mobile-tab-item ${isMoreTabActive ? "active" : ""}`}
					aria-expanded={isMoreOpen}
					aria-label="Все разделы"
					onClick={handleMoreClick}
				>
					<div className="mobile-tab-icon-wrap">
						<MoreHorizontal className="mobile-tab-icon" aria-hidden="true" />
					</div>
					<span className="mobile-tab-label">Ещё</span>
				</button>
			</nav>

			{/* NATIVE APPLE IOS BOTTOM SHEET DRAWER */}
			{isMoreOpen && (
				<div
					className="ios-bottom-sheet-backdrop"
					onClick={closeMoreDrawer}
					role="presentation"
				>
					<div
						className="ios-bottom-sheet-surface"
						role="dialog"
						aria-modal="true"
						aria-label="Все разделы клиники"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Tactile Drag Handle */}
						<div
							className="ios-bottom-sheet-handle-wrap"
							onClick={closeMoreDrawer}
							aria-hidden="true"
						>
							<div className="ios-bottom-sheet-handle" />
						</div>

						{/* Sheet Header */}
						<div className="ios-bottom-sheet-header">
							<h2 className="ios-bottom-sheet-title">Все разделы</h2>
							<button
								type="button"
								className="ios-bottom-sheet-close-btn"
								onClick={closeMoreDrawer}
								aria-label="Закрыть шторку"
							>
								<X size={18} aria-hidden="true" />
							</button>
						</div>

						{/* Sheet Content: Apple Grouped Lists */}
						<div className="ios-bottom-sheet-body">
							{DRAWER_SECTIONS.map((section) => {
								const filteredItems = section.items.filter(
									(item) => !allowedViews || allowedViews.includes(item.id),
								);
								if (filteredItems.length === 0) return null;

								return (
									<div key={section.title} className="ios-grouped-section">
										<div className="ios-grouped-section-title">
											{section.title}
										</div>
										<div className="ios-grouped-card">
											{filteredItems.map((item) => {
												const isActive = currentView === item.id;
												const ItemIcon = item.icon;
												return (
													<button
														key={item.id}
														type="button"
														className={`ios-grouped-row ${
															isActive ? "active" : ""
														}`}
														onClick={() => handleTabClick(item.id)}
														onPointerEnter={() =>
															onViewIntent?.(item.id, "hover")
														}
													>
														<div className="ios-row-left">
															<div
																className="ios-row-icon-badge"
																style={{
																	background: item.badgeBg,
																	color: item.iconColor,
																}}
															>
																<ItemIcon size={18} aria-hidden="true" />
															</div>
															<div className="ios-row-texts">
																<span className="ios-row-title">
																	{viewLabels[item.id] || item.label}
																</span>
																<span className="ios-row-subtitle">
																	{item.subtitle}
																</span>
															</div>
														</div>
														<ChevronRight
															size={16}
															className="ios-row-chevron"
															aria-hidden="true"
														/>
													</button>
												);
											})}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			)}
		</>
	);
};
