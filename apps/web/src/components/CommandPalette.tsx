import {
	Calendar,
	ChevronRight,
	CreditCard,
	FileText,
	LogOut,
	PlusCircle,
	Search,
	Settings,
	Stethoscope,
	User,
	UserPlus,
	X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import "./CommandPalette.css";

interface CommandPaletteProps {
	patients: any[];
	onSelectPatient: (patientId: string) => void;
	onNavigate: (view: string) => void;
	onLogout?: () => void;
}

export function CommandPalette({
	patients,
	onSelectPatient,
	onNavigate,
	onLogout,
}: CommandPaletteProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				(e.key.toLowerCase() === "k" || e.code === "KeyK") &&
				(e.ctrlKey || e.metaKey)
			) {
				e.preventDefault();
				setIsOpen((prev) => !prev);
				setQuery("");
				setSelectedIndex(0);
			}
			if (e.key === "Escape" && isOpen) {
				setIsOpen(false);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen]);

	useEffect(() => {
		if (isOpen) {
			setTimeout(() => inputRef.current?.focus(), 50);
		}
	}, [isOpen]);

	let filteredItems: Array<{
		id: string;
		icon: React.ReactNode;
		label: string;
		subLabel?: string;
		action: () => void;
		section?: string;
	}> = [];

	const lowerQuery = query.toLowerCase();

	if (lowerQuery.startsWith("/patient")) {
		const term = lowerQuery.replace("/patient", "").trim();
		filteredItems = patients
			.filter(
				(p) =>
					p.fullName.toLowerCase().includes(term) || p.phone?.includes(term),
			)
			.slice(0, 8)
			.map((p) => ({
				id: `patient-${p.id}`,
				icon: <User size={18} />,
				label: p.fullName,
				subLabel: p.phone,
				action: () => {
					onSelectPatient(p.id);
					setIsOpen(false);
				},
				section: "Пациенты",
			}));
	} else if (lowerQuery.startsWith("создать")) {
		filteredItems = [
			{
				id: "c-app",
				icon: <Calendar size={18} />,
				label: "Открыть расписание",
				action: () => {
					onNavigate("schedule");
					setIsOpen(false);
				},
				section: "Действия",
			},
			{
				id: "c-doc",
				icon: <FileText size={18} />,
				label: "Документы",
				action: () => {
					onNavigate("documents");
					setIsOpen(false);
				},
				section: "Действия",
			},
		];
	} else {
		// Default search
		const matchedPatients = query
			? patients
					.filter(
						(p) =>
							p.fullName.toLowerCase().includes(lowerQuery) ||
							p.phone?.includes(lowerQuery),
					)
					.slice(0, 3)
			: [];

		const cmds = [
			{
				id: "view-schedule",
				icon: <Calendar size={18} />,
				label: "Расписание",
				action: () => onNavigate("schedule"),
				section: "Навигация",
			},
			{
				id: "view-patients",
				icon: <User size={18} />,
				label: "Пациенты",
				action: () => onNavigate("patients"),
				section: "Навигация",
			},
			{
				id: "view-documents",
				icon: <FileText size={18} />,
				label: "Документы",
				action: () => onNavigate("documents"),
				section: "Навигация",
			},
			{
				id: "view-settings",
				icon: <Settings size={18} />,
				label: "Настройки",
				action: () => onNavigate("settings"),
				section: "Навигация",
			},
		].filter((c) => c.label.toLowerCase().includes(lowerQuery));

		if (onLogout)
			cmds.push({
				id: "logout",
				icon: <LogOut size={18} />,
				label: "Выйти",
				action: onLogout,
				section: "Система",
			});

		filteredItems = [
			...matchedPatients.map((p) => ({
				id: `pat-${p.id}`,
				icon: <User size={18} />,
				label: p.fullName,
				subLabel: p.phone,
				action: () => {
					onSelectPatient(p.id);
					setIsOpen(false);
				},
				section: "Пациенты",
			})),
			...cmds,
		];
	}

	useEffect(() => {
		setSelectedIndex(0);
	}, [query]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setSelectedIndex((p) => (p + 1) % filteredItems.length);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setSelectedIndex(
				(p) => (p - 1 + filteredItems.length) % filteredItems.length,
			);
		} else if (e.key === "Enter" && filteredItems.length > 0) {
			e.preventDefault();
			filteredItems[selectedIndex]?.action?.();
			setIsOpen(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="cmd-palette-backdrop" onClick={() => setIsOpen(false)}>
			<div
				className="cmd-palette-container"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="cmd-palette-input-container">
					<Search
						size={24}
						style={{ color: "var(--muted, #888)", marginRight: 16 }}
					/>
					<input
						ref={inputRef}
						className="cmd-palette-input"
						placeholder="Команда, пациент или /фильтр..."
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={handleKeyDown}
					/>
					<button className="cmd-palette-esc" onClick={() => setIsOpen(false)}>
						ESC
					</button>
				</div>

				<div className="cmd-palette-results">
					{filteredItems.length === 0 ? (
						<div className="cmd-palette-empty">Нет результатов</div>
					) : (
						<ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
							{filteredItems.map((item, index) => {
								const isSelected = index === selectedIndex;
								const showSection =
									index === 0 ||
									filteredItems[index - 1]?.section !== item.section;
								return (
									<React.Fragment key={item.id}>
										{showSection && item.section && (
											<div className="cmd-palette-section-title">
												{item.section}
											</div>
										)}
										<li
											className={`cmd-palette-item ${isSelected ? "cmd-palette-item-selected" : ""}`}
											onMouseEnter={() => setSelectedIndex(index)}
											onClick={() => {
												item.action?.();
												setIsOpen(false);
											}}
										>
											<div className="cmd-palette-item-icon">{item.icon}</div>
											<div style={{ flex: 1 }}>
												<div className="cmd-palette-item-label">
													{item.label}
												</div>
												{item.subLabel && (
													<div className="cmd-palette-item-sublabel">
														{item.subLabel}
													</div>
												)}
											</div>
											<ChevronRight
												size={18}
												style={{
													opacity: isSelected ? 1 : 0,
													color: "var(--muted, #888)",
												}}
											/>
										</li>
									</React.Fragment>
								);
							})}
						</ul>
					)}
				</div>

				<div className="cmd-palette-footer">
					<span>
						<kbd className="cmd-palette-kbd">↑↓</kbd> Навигация
					</span>
					<span>
						<kbd className="cmd-palette-kbd">Enter</kbd> Выбор
					</span>
					<span>
						Попробуйте ввести <b>/patient</b> или <b>создать</b>
					</span>
				</div>
			</div>
		</div>
	);
}
