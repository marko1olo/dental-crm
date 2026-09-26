import React, { memo, useCallback, useMemo } from "react";
import type { ToothState } from "./toothChartTypes";

export const SurfaceSelector = ({
	selected,
	onChange,
	size = 100,
	disabled = false,
}: {
	selected: string[];
	onChange: (newSelected: string[]) => void;
	size?: number;
	disabled?: boolean;
}) => {
	const toggle = (surface: string) => {
		if (disabled) return;
		if (selected.includes(surface)) {
			onChange(selected.filter((s) => s !== surface));
		} else {
			onChange([...selected, surface]);
		}
	};

	return (
		<div className="flex flex-col items-center justify-center">
			<svg
				width={size}
				height={Math.round(size * 1.2)}
				viewBox="0 0 100 120"
				className={`drop-shadow-md group ${
					disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
				}`}
				role="img"
				aria-label="6 Анатомических поверхностей зуба (O, V, L, M, D, C)"
			>
				<title>Поверхности зуба (O, V, L, M, D, C)</title>
				{/* Top (B/V - Вестибулярная) */}
				<polygon
					role="tab"
					tabIndex={0}
					points="0,0 100,0 70,30 30,30"
					fill={
						selected.includes("B") || selected.includes("V")
							? "var(--teal, #0d9488)"
							: "var(--odontogram-surface, var(--paper-soft, #f8fafc))"
					}
					stroke={
						selected.includes("B") || selected.includes("V")
							? "var(--teal-dark, #0f766e)"
							: "var(--odontogram-border-strong, var(--line-strong, #cbd5e1))"
					}
					strokeWidth="2"
					onClick={() => toggle("V")}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggle("V");
						}
					}}
					className="hover:opacity-90 transition-colors duration-200"
				/>
				<text
					x="50"
					y="18"
					fill={
						selected.includes("B") || selected.includes("V")
							? "#ffffff"
							: "var(--odontogram-ink, var(--ink, #0f172a))"
					}
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					V
				</text>

				{/* Bottom (L/P - Язычная/Нёбная) */}
				<polygon
					role="tab"
					tabIndex={0}
					points="30,70 70,70 100,100 0,100"
					fill={
						selected.includes("L") || selected.includes("P")
							? "var(--teal, #0d9488)"
							: "var(--odontogram-surface, var(--paper-soft, #f8fafc))"
					}
					stroke={
						selected.includes("L") || selected.includes("P")
							? "var(--teal-dark, #0f766e)"
							: "var(--odontogram-border-strong, var(--line-strong, #cbd5e1))"
					}
					strokeWidth="2"
					onClick={() => toggle("L")}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggle("L");
						}
					}}
					className="hover:opacity-90 transition-colors duration-200"
				/>
				<text
					x="50"
					y="90"
					fill={
						selected.includes("L") || selected.includes("P")
							? "#ffffff"
							: "var(--odontogram-ink, var(--ink, #0f172a))"
					}
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					L
				</text>

				{/* Left (M - Мезиальная) */}
				<polygon
					role="tab"
					tabIndex={0}
					points="0,0 30,30 30,70 0,100"
					fill={
						selected.includes("M")
							? "var(--teal, #0d9488)"
							: "var(--odontogram-surface, var(--paper-soft, #f8fafc))"
					}
					stroke={
						selected.includes("M")
							? "var(--teal-dark, #0f766e)"
							: "var(--odontogram-border-strong, var(--line-strong, #cbd5e1))"
					}
					strokeWidth="2"
					onClick={() => toggle("M")}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggle("M");
						}
					}}
					className="hover:opacity-90 transition-colors duration-200"
				/>
				<text
					x="12"
					y="54"
					fill={
						selected.includes("M") ? "#ffffff" : "var(--odontogram-ink, var(--ink, #0f172a))"
					}
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					M
				</text>

				{/* Right (D - Дистальная) */}
				<polygon
					role="tab"
					tabIndex={0}
					points="100,0 70,30 70,70 100,100"
					fill={
						selected.includes("D")
							? "var(--teal, #0d9488)"
							: "var(--odontogram-surface, var(--paper-soft, #f8fafc))"
					}
					stroke={
						selected.includes("D")
							? "var(--teal-dark, #0f766e)"
							: "var(--odontogram-border-strong, var(--line-strong, #cbd5e1))"
					}
					strokeWidth="2"
					onClick={() => toggle("D")}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggle("D");
						}
					}}
					className="hover:opacity-90 transition-colors duration-200"
				/>
				<text
					x="88"
					y="54"
					fill={
						selected.includes("D") ? "#ffffff" : "var(--odontogram-ink, var(--ink, #0f172a))"
					}
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					D
				</text>

				{/* Center (O - Окклюзионная) */}
				<polygon
					role="tab"
					tabIndex={0}
					points="30,30 70,30 70,70 30,70"
					fill={
						selected.includes("O")
							? "var(--teal, #0d9488)"
							: "var(--odontogram-surface, var(--paper-soft, #f8fafc))"
					}
					stroke={
						selected.includes("O")
							? "var(--teal-dark, #0f766e)"
							: "var(--odontogram-border-strong, var(--line-strong, #cbd5e1))"
					}
					strokeWidth="2"
					onClick={() => toggle("O")}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggle("O");
						}
					}}
					className="hover:opacity-90 transition-colors duration-200"
				/>
				<text
					x="50"
					y="54"
					fill={
						selected.includes("O") ? "#ffffff" : "var(--odontogram-ink, var(--ink, #0f172a))"
					}
					fontSize="12"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					O
				</text>

				{/* Cervical Bottom Collar (C - Пришеечная / V класс) */}
				<rect
					role="tab"
					tabIndex={0}
					x="0"
					y="104"
					width="100"
					height="16"
					rx="3"
					fill={
						selected.includes("C") || selected.includes("cervical")
							? "var(--teal, #0d9488)"
							: "var(--odontogram-surface, var(--paper-soft, #f8fafc))"
					}
					stroke={
						selected.includes("C") || selected.includes("cervical")
							? "var(--teal-dark, #0f766e)"
							: "var(--odontogram-border-strong, var(--line-strong, #cbd5e1))"
					}
					strokeWidth="1.5"
					onClick={() => toggle("C")}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggle("C");
						}
					}}
					className="hover:opacity-90 transition-colors duration-200"
				/>
				<text
					x="50"
					y="116"
					fill={
						selected.includes("C") || selected.includes("cervical")
							? "#ffffff"
							: "var(--odontogram-ink, var(--ink, #0f172a))"
					}
					fontSize="10"
					fontWeight="bold"
					textAnchor="middle"
					pointerEvents="none"
				>
					C (Пришеечная)
				</text>
			</svg>
		</div>
	);
};


