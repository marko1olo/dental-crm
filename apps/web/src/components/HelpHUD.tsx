import React, { useEffect, useState } from "react";
import "./HelpHUD.css";

const hotkeys = {
	Doctor: [
		{ key: "Shift + Click", action: "Быстро пометить здоровым" },
		{ key: "Ctrl + Click", action: "Открыть историю зуба" },
		{ key: "Alt + S", action: "Сохранить план лечения" },
	],
	Admin: [
		{ key: "N", action: "Новая запись" },
		{ key: "Ctrl + F", action: "Поиск пациента" },
	],
};

const solutions = [
	"Экран КТ стал черным? Нажмите кнопку 'Сбросить кэш' в тулбаре для очистки WebGL памяти",
	"Смета не сохраняется? Проверьте, выбран ли врач в настройках приема",
];

export default function HelpHUD() {
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Ctrl + /
			if (e.ctrlKey && e.key === "/") {
				e.preventDefault();
				setIsOpen((prev) => !prev);
			}
			if (e.key === "Escape" && isOpen) {
				setIsOpen(false);
			}
		};

		// Also listen to a custom event if we want to open via button
		const handleToggle = () => setIsOpen((prev) => !prev);

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("TOGGLE_HELP_HUD" as any, handleToggle);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("TOGGLE_HELP_HUD" as any, handleToggle);
		};
	}, [isOpen]);

	const startTour = (tourId: string) => {
		setIsOpen(false);
		setTimeout(() => {
			window.dispatchEvent(new CustomEvent("START_TOUR", { detail: tourId }));
		}, 150);
	};

	if (!isOpen) return null;

	return (
		<div className="help-hud-overlay" onClick={() => setIsOpen(false)}>
			<div className="help-hud-container" onClick={(e) => e.stopPropagation()}>
				<div className="help-hud-header">
					<h3>Центр помощи и Hotkeys</h3>
					<span className="close-hint">Esc для закрытия</span>
				</div>

				<div className="help-hud-content">
					<div className="hotkeys-grid">
						{Object.entries(hotkeys).map(([role, keys]) => (
							<div key={role} className="hotkeys-role">
								<h4>{role}</h4>
								<div className="hotkey-list">
									{keys.map((k, i) => (
										<div key={i} className="hotkey-item">
											<kbd>{k.key}</kbd>
											<span>{k.action}</span>
										</div>
									))}
								</div>
							</div>
						))}
					</div>

					<div className="quick-solutions">
						<h4>Частые проблемы</h4>
						<ul>
							{solutions.map((s, i) => (
								<li key={i}>{s}</li>
							))}
						</ul>
					</div>

					<div className="help-hud-tours mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
						<h4 className="m-0 mb-4 text-base font-semibold text-slate-900 dark:text-white">
							Интерактивное обучение
						</h4>
						<div className="tour-selection-grid">
							<button
								className="tour-select-btn"
								onClick={() => startTour("schedule")}
							>
								📅 Расписание визитов
							</button>
							<button
								className="tour-select-btn"
								onClick={() => startTour("patients")}
							>
								👥 Карточки пациентов
							</button>
							<button
								className="tour-select-btn"
								onClick={() => startTour("tooth_chart")}
							>
								🦷 Зубная формула
							</button>
							<button
								className="tour-select-btn"
								onClick={() => startTour("treatment_plan")}
							>
								📋 Планы лечения
							</button>
							<button
								className="tour-select-btn"
								onClick={() => startTour("finance")}
							>
								💰 Счета и оплаты
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
