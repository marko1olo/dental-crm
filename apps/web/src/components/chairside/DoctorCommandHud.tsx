/**
 * @file DoctorCommandHud.tsx
 * @description Командный HUD врача у кресла (Chairside Doctor Command HUD).
 *
 * Предоставляет молниеносный клавиатурный омни-инпут врача (Ctrl+K):
 * - Мгновенный ввод номера зуба (FDI 11..48, 51..85) со скроллом и селектом в формуле
 * - Быстрые клинические команды: касса, быстрая запись, соматическая норма, рецепты Rx
 * - In-memory поиск пациентов за 0ms без сетевой задержки
 *
 * Соответствует Apple HIG Spotlight & DENTE Design Tokens (frontend.md).
 */

import React, { useEffect, useRef } from "react";
import {
	Activity,
	Calendar,
	Camera,
	CheckCircle2,
	CreditCard,
	FileText,
	Pill,
	Search,
	Shield,
	Sparkles,
	Stethoscope,
	Users,
	X,
} from "lucide-react";
import {
	type CommandCategory,
	type CommandHudItem,
	useDoctorCommandHud,
} from "./useDoctorCommandHud";
import "./doctorCommandHud.css";

export interface DoctorCommandHudProps {
	isOpen?: boolean;
	onClose?: () => void;
	onNavigate?: (view: string) => void;
}

/**
 * Иконка для элемента в зависимости от категории и типа
 */
function renderItemIcon(item: CommandHudItem) {
	if (item.category === "teeth") {
		return <Sparkles size={16} aria-hidden="true" />;
	}
	if (item.category === "patients") {
		return <Users size={16} aria-hidden="true" />;
	}
	if (item.id === "cmd-cashbox") {
		return <CreditCard size={16} aria-hidden="true" />;
	}
	if (item.id === "cmd-new-appointment") {
		return <Calendar size={16} aria-hidden="true" />;
	}
	if (item.id === "cmd-somatic-norm") {
		return <CheckCircle2 size={16} aria-hidden="true" />;
	}
	if (item.id.startsWith("rx-") || item.id === "cmd-prescriptions-rx") {
		return <Pill size={16} aria-hidden="true" />;
	}
	if (item.id === "cmd-imaging-xray") {
		return <Camera size={16} aria-hidden="true" />;
	}
	if (item.id === "cmd-documents-hub") {
		return <FileText size={16} aria-hidden="true" />;
	}
	if (item.id === "cmd-privacy-shield") {
		return <Shield size={16} aria-hidden="true" />;
	}
	if (item.id.includes("protocol")) {
		return <Stethoscope size={16} aria-hidden="true" />;
	}
	return <Activity size={16} aria-hidden="true" />;
}

export function DoctorCommandHud(props: DoctorCommandHudProps) {
	const {
		isOpen: controlledOpen,
		onClose,
		onNavigate,
	} = props;

	const {
		isOpen,
		setIsOpen,
		query,
		setQuery,
		selectedIndex,
		setSelectedIndex,
		results,
		close,
		executeCurrent,
		handleKeyDown,
	} = useDoctorCommandHud({
		initialOpen: controlledOpen,
		onClose,
		onNavigate,
	});

	const inputRef = useRef<HTMLInputElement>(null);
	const resultsRef = useRef<HTMLDivElement>(null);

	// Синхронизация контролируемого состояния
	useEffect(() => {
		if (controlledOpen !== undefined) {
			setIsOpen(controlledOpen);
		}
	}, [controlledOpen, setIsOpen]);

	// Автоматический фокус инпута при открытии HUD
	useEffect(() => {
		if (isOpen) {
			const timer = setTimeout(() => {
				inputRef.current?.focus();
				inputRef.current?.select();
			}, 30);
			return () => clearTimeout(timer);
		}
	}, [isOpen]);

	// Автоскролл к выбранному элементу в списке при навигации стрелками
	useEffect(() => {
		if (resultsRef.current && results.length > 0) {
			const activeEl = resultsRef.current.children[selectedIndex] as HTMLElement;
			if (activeEl) {
				activeEl.scrollIntoView({ block: "nearest" });
			}
		}
	}, [selectedIndex, results.length]);

	if (!isOpen) {
		return null;
	}

	return (
		<div
			className="doctor-command-hud-backdrop"
			data-testid="doctor-command-hud-backdrop"
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					close();
				}
			}}
		>
			<div
				className="doctor-command-hud-modal"
				role="dialog"
				aria-modal="true"
				aria-label="Командный HUD врача у кресла"
				data-testid="doctor-command-hud-modal"
				onKeyDown={handleKeyDown}
			>
				{/* 1-строчный четкий инпут поиска */}
				<div className="doctor-command-hud-search-bar">
					<Search
						size={18}
						className="doctor-command-hud-search-icon"
						aria-hidden="true"
					/>
					<input
						ref={inputRef}
						type="text"
						className="doctor-command-hud-input"
						data-testid="doctor-command-hud-input"
						placeholder="Команда, номер зуба (46, 11) или пациент... (Ctrl+K)"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						autoFocus
						spellCheck={false}
						autoComplete="off"
					/>
					{query.trim().length > 0 ? (
						<button
							type="button"
							className="doctor-command-hud-clear-btn"
							onClick={() => setQuery("")}
							title="Очистить строку"
							aria-label="Очистить строку"
						>
							<X size={14} />
						</button>
					) : null}
					<kbd className="doctor-command-hud-kbd-badge" title="Закрыть">
						Esc
					</kbd>
				</div>

				{/* Список подсказок и команд */}
				<div
					ref={resultsRef}
					className="doctor-command-hud-results"
					role="listbox"
					data-testid="doctor-command-hud-results"
				>
					{results.length === 0 ? (
						<div
							className="doctor-command-hud-empty"
							data-testid="doctor-command-hud-empty"
						>
							<Search size={28} opacity={0.4} />
							<span>Команда или пациент не найдены</span>
							<span style={{ fontSize: "11px", opacity: 0.7 }}>
								Попробуйте ввести номер зуба (46, 11), «касса», «норма» или ФИО
							</span>
						</div>
					) : (
						results.map((item, idx) => {
							const isSelected = idx === selectedIndex;
							return (
								<div
									key={item.id}
									role="option"
									aria-selected={isSelected}
									className={`doctor-command-hud-item ${isSelected ? "is-selected" : ""}`}
									data-testid={`doctor-command-hud-item-${item.id}`}
									onClick={() => {
										item.action();
										close();
									}}
									onMouseEnter={() => setSelectedIndex(idx)}
								>
									<div className="doctor-command-hud-item-left">
										<div className="doctor-command-hud-item-icon-wrap">
											{renderItemIcon(item)}
										</div>
										<div className="doctor-command-hud-item-content">
											<div className="doctor-command-hud-item-title">
												{item.title}
											</div>
											<div className="doctor-command-hud-item-subtitle">
												{item.subtitle}
											</div>
										</div>
									</div>

									<div className="doctor-command-hud-item-right">
										<span className="doctor-command-hud-category-chip">
											{item.categoryLabel}
										</span>
										{item.shortcut ? (
											<kbd className="doctor-command-hud-action-kbd">
												{item.shortcut}
											</kbd>
										) : null}
									</div>
								</div>
							);
						})
					)}
				</div>

				{/* Нижний статус-бар управления */}
				<div className="doctor-command-hud-footer">
					<div className="doctor-command-hud-hints">
						<span className="doctor-command-hud-hint-item">
							<kbd>↑</kbd> <kbd>↓</kbd> Навигация
						</span>
						<span className="doctor-command-hud-hint-item">
							<kbd>↵ Enter</kbd> Выбрать
						</span>
						<span className="doctor-command-hud-hint-item">
							<kbd>Esc</kbd> Закрыть
						</span>
					</div>
					<div className="doctor-command-hud-version-tag">
						DENTE Chairside HUD
					</div>
				</div>
			</div>
		</div>
	);
}

export default DoctorCommandHud;
