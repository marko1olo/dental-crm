import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWorkspaceProfileStore } from "../../hooks/useWorkspaceProfile";

export function VisitSafetyStrip() {
	const { visitSafetyCards } = useAppLogicContext();
	const hasEngineeringStatus = useWorkspaceProfileStore(
		(s) => s.hasEngineeringStatus,
	);

	if (!hasEngineeringStatus) {
		return null;
	}

	return (
		<details
			className="visit-safety-strip-toggle"
			style={{
				margin: "1rem 0",
				fontSize: "0.85rem",
				color: "var(--slate-500)",
			}}
		>
			<summary style={{ cursor: "pointer", userSelect: "none" }}>
				Инженерный статус (локальное сохранение, связь с сервером)
			</summary>
			<section
				className="visit-safety-strip"
				aria-label="Сохранность черновика и диктовки"
				style={{
					display: "flex",
					flexWrap: "wrap",
					gap: "1rem",
					marginTop: "1rem",
					padding: "1rem",
					background: "var(--paper)",
					borderRadius: "8px",
				}}
			>
				{visitSafetyCards.map((item: any) => (
					<article
						className={`safety-${item.state}`}
						key={item.key}
						style={{ flex: "1 1 200px" }}
					>
						<span
							style={{
								display: "block",
								fontSize: "0.75rem",
								textTransform: "uppercase",
								letterSpacing: "0.05em",
							}}
						>
							{item.label}
						</span>
						<strong style={{ display: "block", margin: "4px 0" }}>
							{item.value}
						</strong>
						<p
							style={{
								margin: "0",
								fontSize: "0.8rem",
								lineHeight: "1.2",
							}}
						>
							{item.detail}
						</p>
					</article>
				))}
			</section>
		</details>
	);
}
