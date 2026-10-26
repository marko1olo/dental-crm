import React from "react";

interface SimulatorChipsProps {
	currentScreenId: string;
	onSelectScreen: (id: string) => void;
}

const TEMPLATE_TABS = [
	{ id: "root", label: "Приветствие" },
	{ id: "booking", label: "Онлайн-запись" },
	{ id: "reminders", label: "Напоминание" },
	{ id: "reviews", label: "Отзывы" },
	{ id: "price_faq", label: "Прейскурант" },
	{ id: "admin_chat", label: "Администратор" },
];

export const SimulatorChips: React.FC<SimulatorChipsProps> = ({
	currentScreenId,
	onSelectScreen,
}) => {
	return (
		<div
			className="tg-template-quick-chips"
			style={{
				display: "flex",
				gap: "6px",
				padding: "10px 14px",
				background: "var(--paper-soft, rgba(0,0,0,0.03))",
				borderBottom: "1px solid var(--line, rgba(0,0,0,0.08))",
				overflowX: "auto",
			}}
		>
			{TEMPLATE_TABS.map((tab) => {
				const isSelected = currentScreenId === tab.id;
				return (
					<button
						key={tab.id}
						type="button"
						onClick={() => onSelectScreen(tab.id)}
						style={{
							padding: "4px 10px",
							fontSize: "11px",
							fontWeight: isSelected ? 600 : 500,
							borderRadius: "6px",
							border: "1px solid",
							borderColor: isSelected ? "var(--teal, #0d9488)" : "var(--line, #cbd5e1)",
							background: isSelected ? "var(--teal, #0d9488)" : "var(--paper, #ffffff)",
							color: isSelected ? "#ffffff" : "var(--ink, #0f172a)",
							cursor: "pointer",
							whiteSpace: "nowrap",
						}}
					>
						{tab.label}
					</button>
				);
			})}
		</div>
	);
};
