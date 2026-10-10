import React from "react";

export interface AiPersonalizeFooterProps {
	planLoading: boolean;
	postLoading: boolean;
	onRunPlan: () => void;
	onRunPost: () => void;
	onSaveSettings: () => void;
	onResetSettings: () => void;
}

export const AiPersonalizeFooter: React.FC<AiPersonalizeFooterProps> = ({
	planLoading,
	postLoading,
	onRunPlan,
	onRunPost,
	onSaveSettings,
	onResetSettings,
}) => {
	const isBusy = planLoading || postLoading;

	return (
		<div
			className="ops-actions"
			style={{
				display: "flex",
				flexWrap: "wrap",
				gap: "0.5rem",
				marginTop: "1rem",
				paddingTop: "0.75rem",
				borderTop: "1px solid var(--line, #e2e8f0)",
				alignItems: "center",
			}}
		>
			<button
				type="button"
				className="primary-button"
				onClick={onRunPlan}
				disabled={isBusy}
				data-testid="ai-personalize-plan-btn"
				style={{
					minHeight: "36px",
					borderRadius: "8px",
					fontWeight: 600,
					fontSize: "0.85rem",
				}}
			>
				{planLoading ? "Собираю объяснение…" : "Объяснить план пациенту"}
			</button>

			<button
				type="button"
				className="secondary-button"
				onClick={onRunPost}
				disabled={isBusy}
				data-testid="ai-personalize-post-btn"
				style={{
					minHeight: "36px",
					borderRadius: "8px",
					fontSize: "0.85rem",
				}}
			>
				{postLoading ? "Собираю памятку…" : "Памятка после приёма"}
			</button>

			<div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
				<button
					type="button"
					className="secondary-button"
					onClick={onSaveSettings}
					disabled={isBusy}
					data-testid="ai-save-style-btn"
					style={{
						minHeight: "36px",
						borderRadius: "8px",
						fontSize: "0.85rem",
					}}
				>
					Сохранить стиль
				</button>

				<button
					type="button"
					className="secondary-button"
					onClick={onResetSettings}
					disabled={isBusy}
					data-testid="ai-reset-style-btn"
					style={{
						minHeight: "36px",
						borderRadius: "8px",
						fontSize: "0.85rem",
						color: "var(--muted, #64748b)",
					}}
				>
					Сброс к эталону клинических рекомендаций
				</button>
			</div>
		</div>
	);
};
