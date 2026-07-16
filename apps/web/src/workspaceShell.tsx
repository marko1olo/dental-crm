import type { StaffRole } from "@dental/shared";
import {
	Banknote,
	BarChart3,
	Barcode,
	CalendarClock,
	CalendarDays,
	ClipboardCheck,
	ClipboardList,
	CreditCard,
	Database,
	FileCheck2,
	FileText,
	HelpCircle,
	Image as ImageIcon,
	Lock,
	Megaphone,
	MessageSquare,
	Mic,
	Moon,
	Package,
	PhoneCall,
	Plus,
	ReceiptText,
	Settings,
	Sparkles,
	Stethoscope,
	Sun,
	Users,
} from "lucide-react";

import { useEffect, useState } from "react";
import { QrGatewayPanel } from "./components/QrGatewayPanel";
import { useThemeStore } from "./store/themeStore";

export const appViews = [
	"shift",
	"schedule",
	"patients",
	"leads",
	"imaging",
	"visit",
	"documents",
	"finance",
	"analytics",
	"communications",
	"inbox",
	"settings",
	"marketing",
	"scanner",
	"inventory",
] as const;
export type AppView = (typeof appViews)[number];

export const viewLabels: Record<AppView, string> = {
	shift: "Смена",
	schedule: "Записи",
	patients: "Пациенты",
	leads: "Лиды (Канбан)",
	imaging: "Снимки",
	visit: "Прием",
	documents: "Документы",
	finance: "Финансы",
	analytics: "Аналитика",
	communications: "Связь",
	inbox: "Чаты",
	settings: "Настройки",
	marketing: "Маркетинг/SEO",
	scanner: "Сканнер лотков (ЦСО)",
	inventory: "Склад",
};

export const viewHints: Record<AppView, string> = {
	shift: "что делать сейчас",
	schedule: "очередь, врачи и кресла",
	patients: "карточки и контакты",
	leads: "воронка продаж",
	imaging: "рентген, КЛКТ и КТ",
	visit: "прием и диктовка",
	documents: "договоры и справки",
	finance: "Счета, акты и платежи",
	analytics: "BI дашборды и отчеты",
	communications: "сообщения и задачи",
	inbox: "Единый мессенджер (WhatsApp/TG)",
	settings: "Системные настройки, справочники, профиль",
	marketing: "Аналитика привлечения, LTV",
	scanner: "Стерилизация и сканирование штрих-кодов",
	inventory: "Остатки и расходники",
};

type WorkspaceViewIntentHandler = (view: AppView) => void;

function SidebarIcon({ section }: { section: AppView }) {
	if (section === "schedule") return <CalendarDays aria-hidden="true" />;
	if (section === "patients") return <Users aria-hidden="true" />;
	if (section === "leads") return <Users aria-hidden="true" />;
	if (section === "imaging") return <ImageIcon aria-hidden="true" />;
	if (section === "visit") return <ClipboardList aria-hidden="true" />;
	if (section === "documents") return <FileText aria-hidden="true" />;
	if (section === "finance") return <Banknote aria-hidden="true" />;
	if (section === "analytics") return <BarChart3 aria-hidden="true" />;
	if (section === "communications") return <PhoneCall aria-hidden="true" />;
	if (section === "inbox") return <MessageSquare aria-hidden="true" />;
	if (section === "settings") return <Settings aria-hidden="true" />;
	if (section === "marketing") return <Megaphone aria-hidden="true" />;
	if (section === "scanner") return <Barcode aria-hidden="true" />;
	if (section === "inventory") return <Package aria-hidden="true" />;
	return <Sparkles aria-hidden="true" />;
}

export function ActionIcon({ section }: { section: AppView }) {
	if (section === "schedule") return <CalendarClock aria-hidden="true" />;
	if (section === "patients") return <Users aria-hidden="true" />;
	if (section === "leads") return <Users aria-hidden="true" />;
	if (section === "imaging") return <ImageIcon aria-hidden="true" />;
	if (section === "visit") return <ClipboardCheck aria-hidden="true" />;
	if (section === "documents") return <FileCheck2 aria-hidden="true" />;
	if (section === "finance") return <ReceiptText aria-hidden="true" />;
	if (section === "analytics") return <BarChart3 aria-hidden="true" />;
	if (section === "communications") return <MessageSquare aria-hidden="true" />;
	if (section === "settings") return <Database aria-hidden="true" />;
	if (section === "inventory") return <Package aria-hidden="true" />;
	return <Sparkles aria-hidden="true" />;
}

export function getFilteredAppViews(role: StaffRole): AppView[] {
	if (role === "doctor") {
		return [
			"shift",
			"schedule",
			"patients",
			"imaging",
			"visit",
			"documents",
			"communications",
		];
	}
	if (role === "assistant") {
		return [
			"shift",
			"schedule",
			"patients",
			"imaging",
			"documents",
			"communications",
		];
	}
	if (role === "administrator") {
		return [
			"shift",
			"schedule",
			"patients",
			"leads",
			"imaging",
			"documents",
			"communications",
			"finance",
			"analytics",
			"settings",
			"marketing",
			"inventory",
		];
	}
	if (role === "manager") {
		return [
			"schedule",
			"patients",
			"leads",
			"finance",
			"analytics",
			"communications",
			"settings",
			"marketing",
		];
	}
	if (role === "owner") {
		return Array.from(appViews);
	}
	return ["schedule", "patients"];
}

export function WorkspaceSidebar({
	currentView,
	onViewIntent,
	role,
}: {
	currentView: AppView;
	onViewIntent?: WorkspaceViewIntentHandler;
	role: StaffRole;
}) {
	const allowedViews = getFilteredAppViews(role);

	return (
		<aside className="sidebar" aria-label="Навигация">
			<div className="brand-mark">
				<Stethoscope aria-hidden="true" />
				<span>DENTE</span>
			</div>
			<nav>
				{appViews.map((view) =>
					allowedViews.includes(view) ? (
						<a
							className={`nav-item ${currentView === view ? "active" : ""}`}
							href={`#${view}`}
							key={view}
							aria-current={currentView === view ? "page" : undefined}
							aria-label={`${viewLabels[view]}: ${viewHints[view]}`}
							title={`${viewLabels[view]}: ${viewHints[view]}`}
							onPointerEnter={() => onViewIntent?.(view)}
							onFocus={() => onViewIntent?.(view)}
							onTouchStart={() => onViewIntent?.(view)}
						>
							<SidebarIcon section={view} />
							<span className="nav-copy">
								<span className="nav-label">{viewLabels[view]}</span>
								<small>{viewHints[view]}</small>
							</span>
						</a>
					) : null,
				)}
			</nav>
		</aside>
	);
}

interface WorkspaceTopbarProps {
	clinicName: string;
	onGoToDictation: () => void;
	onGoToSchedule: () => void;
	onGoToVisit: () => void;
	onReopenOnboarding: () => void;
	onRoleChange: (role: StaffRole) => void;
	onViewIntent?: WorkspaceViewIntentHandler;
	roleFocusOrder: StaffRole[];
	selectedWorkspaceRole: StaffRole;
	showAdministrationTopActions: boolean;
	showDoctorVisitShortcut: boolean;
	staffRoleLabels: Record<StaffRole, string>;
	todayIso: string;
	onLockSession?: () => void;
	isOmniRoleMode?: boolean;
}

export function WorkspaceTopbar({
	clinicName,
	onGoToDictation,
	onGoToSchedule,
	onGoToVisit,
	onReopenOnboarding,
	onRoleChange,
	onViewIntent,
	roleFocusOrder,
	selectedWorkspaceRole,
	showAdministrationTopActions,
	showDoctorVisitShortcut,
	staffRoleLabels,
	todayIso,
	onLockSession,
	isOmniRoleMode,
}: WorkspaceTopbarProps) {
	const themeMode = useThemeStore((s) => s.themeMode);
	const setThemeMode = useThemeStore((s) => s.setThemeMode);

	const [actualTheme, setActualTheme] = useState<"light" | "dark">("dark");

	useEffect(() => {
		let active = "dark";
		if (themeMode === "auto") {
			const hour = new Date().getHours();
			active = hour >= 7 && hour < 19 ? "light" : "dark";
		} else {
			active = themeMode;
		}
		setActualTheme(active as "light" | "dark");
	}, [themeMode]);

	useEffect(() => {
		document.body.setAttribute("data-theme", actualTheme);
		if (actualTheme === "dark") {
			document.documentElement.classList.add("dark");
			document.body.classList.add("theme-dark");
		} else {
			document.documentElement.classList.remove("dark");
			document.body.classList.remove("theme-dark");
		}
		localStorage.setItem("dente_theme", actualTheme);
	}, [actualTheme]);

	const toggleTheme = () => {
		const next = actualTheme === "dark" ? "light" : "dark";
		setThemeMode(next);
	};

	return (
		<header className="topbar">
			<div className="topbar-left">
				<p className="eyebrow">
					{todayIso && !isNaN(Date.parse(todayIso))
						? new Date(todayIso).toLocaleDateString("ru-RU", {
								weekday: "long",
								day: "numeric",
								month: "long",
								year: "numeric",
							})
						: new Date().toLocaleDateString("ru-RU", {
								weekday: "long",
								day: "numeric",
								month: "long",
								year: "numeric",
							})}
				</p>
				<h1>{clinicName}</h1>
				{!isOmniRoleMode && (
					<details
						className="workspace-role-switcher"
						aria-label="Роли оператора"
					>
						<summary>
							<span>Роль</span>
							<strong>{staffRoleLabels[selectedWorkspaceRole]}</strong>
						</summary>
						<div className="role-switcher-options">
							{roleFocusOrder.map((role) => (
								<button
									className={selectedWorkspaceRole === role ? "active" : ""}
									key={role}
									type="button"
									aria-pressed={selectedWorkspaceRole === role}
									aria-label={`Сменить роль: ${staffRoleLabels[role]}`}
									onClick={(event) => {
										onRoleChange(role);
										event.currentTarget
											.closest("details")
											?.removeAttribute("open");
									}}
								>
									{staffRoleLabels[role]}
								</button>
							))}
						</div>
					</details>
				)}
			</div>

			<div className="top-actions">
				{showAdministrationTopActions ? (
					<a
						className="icon-button"
						href="#settings"
						title="Настройки импорта и экспорта"
						aria-label="Настройки импорта и экспорта"
						onPointerEnter={() => onViewIntent?.("settings")}
						onFocus={() => onViewIntent?.("settings")}
						onTouchStart={() => onViewIntent?.("settings")}
					>
						<Database aria-hidden="true" />
					</a>
				) : null}
				{showAdministrationTopActions ? (
					<button
						className="secondary-button compact-top-button"
						type="button"
						onClick={onReopenOnboarding}
					>
						<ClipboardCheck aria-hidden="true" /> Настроить
					</button>
				) : null}
				{showDoctorVisitShortcut ? (
					<button
						className="secondary-button daily-top-button"
						type="button"
						onClick={onGoToVisit}
					>
						<ClipboardCheck aria-hidden="true" /> Прием
					</button>
				) : null}
				<button
					aria-label="Открыть диктовку приема"
					className="icon-button top-dictation-button"
					type="button"
					title="Голосовая заметка"
					onClick={onGoToDictation}
				>
					<Mic aria-hidden="true" />
				</button>
				<QrGatewayPanel />
				<button
					aria-label="Справка / Обучение"
					className="icon-button"
					type="button"
					title="Справка / Обучение"
					onClick={(e) => {
						const rect = e.currentTarget.getBoundingClientRect();
						window.dispatchEvent(new CustomEvent("TOGGLE_HELP_HUD"));
					}}
				>
					<HelpCircle aria-hidden="true" size={20} />
				</button>
				<button
					aria-label="Переключить тему"
					className="icon-button"
					type="button"
					title="Переключить тему"
					onClick={toggleTheme}
				>
					{actualTheme === "dark" ? (
						<Sun aria-hidden="true" size={20} />
					) : (
						<Moon aria-hidden="true" size={20} />
					)}
				</button>
				{onLockSession ? (
					<button
						aria-label="Заблокировать сессию"
						className="icon-button top-lock-button"
						type="button"
						title="Заблокировать сессию"
						onClick={onLockSession}
						style={{ color: "#ef4444" }}
					>
						<Lock aria-hidden="true" size={20} />
					</button>
				) : null}
				<button
					className="primary-button"
					type="button"
					onPointerEnter={() => onViewIntent?.("schedule")}
					onFocus={() => onViewIntent?.("schedule")}
					onTouchStart={() => onViewIntent?.("schedule")}
					onClick={onGoToSchedule}
				>
					<Plus aria-hidden="true" /> Запись
				</button>
			</div>

		</header>
	);
}
