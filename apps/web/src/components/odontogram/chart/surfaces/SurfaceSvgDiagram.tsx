import type React from "react";
import { memo } from "react";

export interface SurfaceSvgDiagramProps {
	size: number;
	disabled: boolean;
	isSurfActive: (key: string) => boolean;
	toggle: (surface: string) => void;
}

export const SurfaceSvgDiagram: React.FC<SurfaceSvgDiagramProps> = memo(({
	size,
	disabled,
	isSurfActive,
	toggle,
}) => {
	const polygons: Array<{ key: string; points: string; tx: number; ty: number; title: string }> = [
		{ key: "V", points: "4,4 96,4 72,26 28,26", tx: 50, ty: 18, title: "Вестибулярная (щечная/губная) поверхность (V)" },
		{ key: "M", points: "4,4 26,28 26,72 4,96", tx: 14, ty: 54, title: "Медиальная (мезиальная) контактная поверхность (M)" },
		{ key: "D", points: "96,4 74,28 74,72 96,96", tx: 86, ty: 54, title: "Дистальная контактная поверхность (D)" },
		{ key: "L", points: "28,74 72,74 96,96 4,96", tx: 50, ty: 88, title: "Язычная / нёбная поверхность (L)" },
	];

	const fill = (k: string) => isSurfActive(k) ? "var(--teal, #0d9488)" : "var(--odontogram-surface, var(--paper-soft, #f8fafc))";
	const stroke = (k: string) => isSurfActive(k) ? "var(--teal-dark, #0f766e)" : "var(--line, var(--odontogram-border-strong, #cbd5e1))";
	const textFill = (k: string) => isSurfActive(k) ? "#ffffff" : "var(--odontogram-ink, var(--ink, #0f172a))";

	return (
		<svg
			width={size}
			height={Math.round(size * 1.2)}
			viewBox="0 0 100 120"
			className={`drop-shadow-sm transition-opacity duration-150 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
			role="img"
			aria-label="Анатомические поверхности зуба: O, V, L, M, D, C"
		>
			<title>Анатомические поверхности зуба (O, V, L, M, D, C)</title>
			{polygons.map((p) => (
				<g key={p.key}>
					<polygon
						role="button"
						tabIndex={0}
						points={p.points}
						fill={fill(p.key)}
						stroke={stroke(p.key)}
						strokeWidth="1.5"
						strokeLinejoin="round"
						onClick={() => toggle(p.key)}
						onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(p.key); } }}
						className="hover:opacity-90 hover:brightness-105 transition-all duration-150"
						data-testid={`surf-poly-${p.key}`}
					>
						<title>{p.title}</title>
					</polygon>
					<text x={p.tx} y={p.ty} fill={textFill(p.key)} fontSize="12" fontWeight="800" textAnchor="middle" pointerEvents="none">
						{p.key}
					</text>
				</g>
			))}

			{/* Center: O (Окклюзионная) */}
			<rect
				role="button"
				tabIndex={0}
				x="30" y="30" width="40" height="40" rx="6"
				fill={fill("O")}
				stroke={stroke("O")}
				strokeWidth="1.5"
				onClick={() => toggle("O")}
				onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle("O"); } }}
				className="hover:opacity-90 hover:brightness-105 transition-all duration-150"
				data-testid="surf-poly-O"
			>
				<title>Окклюзионная (жевательная) поверхность (O)</title>
			</rect>
			<text x="50" y="54" fill={textFill("O")} fontSize="13" fontWeight="800" textAnchor="middle" pointerEvents="none">O</text>

			{/* Cervical: C (Пришеечная) */}
			<rect
				role="button"
				tabIndex={0}
				x="4" y="102" width="92" height="15" rx="4"
				fill={fill("C")}
				stroke={stroke("C")}
				strokeWidth="1.5"
				onClick={() => toggle("C")}
				onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle("C"); } }}
				className="hover:opacity-90 hover:brightness-105 transition-all duration-150"
				data-testid="surf-poly-C"
			>
				<title>Пришеечная область / V класс (C)</title>
			</rect>
			<text x="50" y="113" fill={textFill("C")} fontSize="9" fontWeight="700" textAnchor="middle" pointerEvents="none">C (Пришеечная)</text>
		</svg>
	);
});
SurfaceSvgDiagram.displayName = "SurfaceSvgDiagram";
