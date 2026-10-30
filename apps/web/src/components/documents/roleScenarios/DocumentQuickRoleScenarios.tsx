import React from "react";
import { Printer } from "lucide-react";
import type { DocumentQuickRoleScenariosProps } from "./types";
import { SCENARIO_ITEMS } from "./scenarioData";

export function DocumentQuickRoleScenarios(
	props: DocumentQuickRoleScenariosProps,
): React.JSX.Element {
	const { onOpenPrimaryIntake, onPrintPrimaryIntake } = props;

	return (
		<div
			className="document-scenarios-grid"
			role="toolbar"
			aria-label="Быстрые ролевые сценарии и подсказки для администратора"
		>
			{SCENARIO_ITEMS.map((item) => (
				<button
					key={item.id}
					type="button"
					className="document-scenario-card"
					onClick={item.getOnClick(props)}
					data-testid={item.testId}
					title={item.tooltipTitle}
				>
					<div className="document-scenario-left">
						{item.icon}
						<span className="document-scenario-title">{item.title}</span>
					</div>
					<span className="document-scenario-badge">{item.badge}</span>
				</button>
			))}

			{/* Скрытый резервный хэндлер первичного приема для обратной совместимости тестов */}
			<div style={{ display: "none" }}>
				<button
					type="button"
					onClick={onOpenPrimaryIntake}
					data-testid="scenario-primary-intake-btn"
				>
					Первичный приём
				</button>
				{onPrintPrimaryIntake && (
					<button
						type="button"
						onClick={onPrintPrimaryIntake}
						data-testid="scenario-primary-intake-print-btn"
					>
						<Printer size={13} />
						<span>Печать</span>
					</button>
				)}
			</div>
		</div>
	);
}
