import React from "react";

export interface PlanThreeTierMatrixProps {
	readonly selectedTierId: "basic" | "standard" | "premium";
}

export const PlanThreeTierMatrix: React.FC<PlanThreeTierMatrixProps> = ({ selectedTierId }) => {
	return (
		<div
			className="three-tier-comparison-matrix"
			data-testid="three-tier-materials-comparison"
			style={{
				backgroundColor: "var(--pc-surface, var(--paper-strong, #ffffff))",
				border: "1px solid var(--pc-border, #334155)",
				borderRadius: "10px",
				padding: "12px 14px",
				display: "flex",
				flexDirection: "column",
				gap: "10px",
			}}
		>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
				<strong style={{ fontSize: "13px", color: "var(--pc-primary, #0d9488)" }}>
					Сравнение используемых материалов и гарантии (Текущий выбор):
				</strong>
				<span style={{ fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)" }}>
					Клинические гарантии и стандарты клиники
				</span>
			</div>

			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px", fontSize: "12px" }}>
				<div style={{ padding: "8px 10px", borderRadius: "6px", backgroundColor: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--pc-border, #334155)" }}>
					<div style={{ color: "var(--pc-text-muted, #94a3b8)", fontSize: "12px" }}>Материалы пломб / реставраций:</div>
					<strong style={{ color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
						{selectedTierId === "basic" && "Микрогибридный композит светового отверждения"}
						{selectedTierId === "standard" && "Нанокомпозит с эффектом хамелеона"}
						{selectedTierId === "premium" && "Прессованная стеклокерамика (дисиликат лития)"}
					</strong>
				</div>

				<div style={{ padding: "8px 10px", borderRadius: "6px", backgroundColor: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--pc-border, #334155)" }}>
					<div style={{ color: "var(--pc-text-muted, #94a3b8)", fontSize: "12px" }}>Официальный срок гарантии:</div>
					<strong style={{ color: "var(--pc-success, #10b981)" }}>
						{selectedTierId === "basic" && "1 год (12 месяцев)"}
						{selectedTierId === "standard" && "3 года (36 месяцев)"}
						{selectedTierId === "premium" && "5 лет на ортопедию + пожизненно на титан"}
					</strong>
				</div>

				<div style={{ padding: "8px 10px", borderRadius: "6px", backgroundColor: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--pc-border, #334155)" }}>
					<div style={{ color: "var(--pc-text-muted, #94a3b8)", fontSize: "12px" }}>Ортопедические конструкции:</div>
					<strong style={{ color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
						{selectedTierId === "basic" && "Металлокерамика на биоинертном кобальт-хромовом каркасе"}
						{selectedTierId === "standard" && "Многослойный ультратранслюцентный диоксид циркония"}
						{selectedTierId === "premium" && "Прессованная стеклокерамика и премиальная имплантационная система с гидрофильной поверхностью"}
					</strong>
				</div>
			</div>
		</div>
	);
};
