/**
 * @file HeaderUserMenu.tsx
 * @description Doctor profile, Role badge, Light/Dark theme quick switch,
 * Accessibility mode button (GOST R 52872-2019 / WCAG AAA), and Session lock/logout.
 * Adheres to Hick's Law, Desktop Density, and Zero-Carnival Monochrome.
 */

import {
	Glasses,
	Lock,
	LogOut,
	Moon,
	Sun,
	User,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useThemeStore } from "../../store/themeStore";
import type { AccessibilityModeButtonProps, HeaderUserMenuProps } from "./types";

/**
 * Кнопка быстрого перехода на версию для людей с ограниченными возможностями
 * (ГОСТ Р 52872-2019 / WCAG AAA).
 */
export function AccessibilityModeButton({
	className = "",
	compact = false,
	isAccessibilityMode: isAccessibilityModeProp,
	onToggle,
}: AccessibilityModeButtonProps) {
	const storeThemeMode = useThemeStore((s) => s.themeMode);
	const storeA11y = useThemeStore((s) => s.isAccessibilityMode);
	const storeToggle = useThemeStore((s) => s.toggleAccessibilityMode);

	const isAccessibilityMode =
		isAccessibilityModeProp !== undefined
			? isAccessibilityModeProp
			: typeof window === "undefined"
				? useThemeStore.getState().isAccessibilityMode ||
					useThemeStore.getState().themeMode === "contrast"
				: storeA11y || storeThemeMode === "contrast";

	const handleToggle = onToggle || storeToggle;

	return (
		<button
			type="button"
			onClick={handleToggle}
			className={`dnt-a11y-toggle-btn ${
				isAccessibilityMode ? "dnt-a11y-toggle-btn--active" : ""
			} ${className}`}
			aria-pressed={isAccessibilityMode}
			aria-label={
				isAccessibilityMode
					? "Вернуться на стандартную версию оформления"
					: "Перейти на версию для людей с ограниченными возможностями (ГОСТ Р 52872-2019 / WCAG AAA)"
			}
			title={
				isAccessibilityMode
					? "Стандартная версия оформления"
					: "Версия для людей с ограниченными возможностями (высокий контраст 7:1, ГОСТ Р 52872-2019)"
			}
		>
			<Glasses size={14} className="shrink-0" />
			{!compact && (
				<span>
					{isAccessibilityMode ? "Обычная версия" : "Для слабовидящих"}
				</span>
			)}
		</button>
	);
}

export function HeaderUserMenu({
	className = "",
	user = {
		name: "Д-р Иванов А. С.",
		role: "Врач-стоматолог",
		specialty: "Терапевт-ортопед",
	},
	onLockSession,
	onLogout,
}: HeaderUserMenuProps) {
	const [isOpen, setIsOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement | null>(null);

	const themeMode = useThemeStore((s) => s.themeMode);
	const setThemeMode = useThemeStore((s) => s.setThemeMode);
	const toggleAccessibilityMode = useThemeStore((s) => s.toggleAccessibilityMode);

	const isDark =
		themeMode === "dark" ||
		themeMode === "night" ||
		themeMode === "ocean" ||
		themeMode === "cyber_xray" ||
		themeMode === "emerald";

	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsOpen(false);
		};
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);

	return (
		<div ref={menuRef} className={`dnt-header-user-menu relative flex items-center gap-1.5 shrink-0 ${className}`}>
			{/* Theme Toggle Button (Light/Dark) */}
			<button
				type="button"
				onClick={() => setThemeMode(isDark ? "light" : "dark")}
				className="h-8 w-8 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] flex items-center justify-center transition-colors cursor-pointer"
				title={isDark ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
				aria-label={isDark ? "Светлая тема" : "Тёмная тема"}
			>
				{isDark ? (
					<Sun size={15} className="text-amber-500" />
				) : (
					<Moon size={15} className="text-sky-500" />
				)}
			</button>

			{/* User Profile Capsule Button */}
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className="h-8 pl-1.5 pr-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 transition-all cursor-pointer"
				aria-expanded={isOpen}
				aria-haspopup="menu"
				aria-label="Меню пользователя"
				title={`Профиль: ${user.name || "Врач"}`}
			>
				{/* Avatar */}
				<div className="w-6 h-6 rounded-md bg-[var(--teal-surface,#0d948814)] text-[var(--teal,#0d9488)] flex items-center justify-center font-bold text-xs shrink-0">
					{user.avatarUrl ? (
						<img src={user.avatarUrl} alt="" className="w-full h-full rounded-md object-cover" />
					) : (
						<User size={13} />
					)}
				</div>

				<div className="hidden sm:flex flex-col text-left leading-tight min-w-0 max-w-[120px] lg:max-w-[160px]">
					<span className="text-xs font-semibold text-[var(--ink,#0f172a)] truncate">
						{user.name || "Врач клиники"}
					</span>
					<span className="text-[10px] text-[var(--muted,#64748b)] truncate">
						{user.role || "Сотрудник"}
					</span>
				</div>
			</button>

			{/* User Menu Dropdown */}
			{isOpen && (
				<div
					className="absolute top-full right-0 mt-1.5 w-60 p-2 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#e2e8f0)] shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150"
					role="menu"
				>
					{/* Header summary */}
					<div className="px-2 py-1.5 mb-1 border-b border-[var(--line-subtle,#f1f5f9)]">
						<div className="text-xs font-bold text-[var(--ink,#0f172a)] truncate">
							{user.name || "Врач"}
						</div>
						<div className="text-[10px] text-[var(--muted,#64748b)] truncate">
							{user.specialty || user.role || "Стоматолог"}
						</div>
					</div>

					{/* Accessibility button */}
					<div className="py-1">
						<AccessibilityModeButton
							className="w-full justify-start text-xs !min-h-[36px]"
							onToggle={() => {
								toggleAccessibilityMode();
								setIsOpen(false);
							}}
						/>
					</div>

					{/* Lock Session */}
					{onLockSession && (
						<button
							type="button"
							role="menuitem"
							onClick={() => {
								setIsOpen(false);
								onLockSession();
							}}
							className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer transition-colors"
						>
							<Lock size={13} className="text-amber-500" />
							<span>Заблокировать экран</span>
						</button>
					)}

					{/* Logout */}
					{onLogout && (
						<button
							type="button"
							role="menuitem"
							onClick={() => {
								setIsOpen(false);
								onLogout();
							}}
							className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer transition-colors border-t border-[var(--line-subtle,#f1f5f9)] mt-1"
						>
							<LogOut size={13} />
							<span>Выйти из системы</span>
						</button>
					)}
				</div>
			)}
		</div>
	);
}
