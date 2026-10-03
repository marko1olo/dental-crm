import React, { memo, useCallback, useMemo } from "react";

export interface SurfaceSelectorProps {
	selected: string[];
	onChange: (newSelected: string[]) => void;
	size?: number;
	disabled?: boolean;
	showPresets?: boolean;
}

const PRESETS = [
	{ label: "O", surfs: ["O"], title: "Окклюзионная (жевательная)" },
	{ label: "MO", surfs: ["M", "O"], title: "Медиально-окклюзионная полость" },
	{ label: "OD", surfs: ["O", "D"], title: "Окклюзионно-дистальная полость" },
	{ label: "MOD", surfs: ["M", "O", "D"], title: "Медиально-окклюзионно-дистальная (МОД)" },
	{ label: "V", surfs: ["V"], title: "Вестибулярная (щечная/губная)" },
	{ label: "C", surfs: ["C"], title: "Пришеечная область (V класс)" },
] as const;

function canonicalKey(surf: string): string {
	const upper = surf.toUpperCase();
	if (upper === "B") return "V";
	if (upper === "P") return "L";
	if (upper === "CERVICAL") return "C";
	return upper;
}

export const SurfaceSelector: React.FC<SurfaceSelectorProps> = memo(({
	selected,
	onChange,
	size = 110,
	disabled = false,
	showPresets = true,
}) => {
	const normalizedSelected = useMemo(
		() => Array.from(new Set(selected.map(canonicalKey))),
		[selected],
	);

	const isSurfActive = useCallback(
		(key: string) => {
			const canon = canonicalKey(key);
			return normalizedSelected.includes(canon);
		},
		[normalizedSelected],
	);

	const toggle = useCallback(
		(surface: string) => {
			if (disabled) return;
			const canon = canonicalKey(surface);
			if (normalizedSelected.includes(canon)) {
				onChange(selected.filter((s) => canonicalKey(s) !== canon));
			} else {
				onChange([...selected, canon]);
			}
		},
		[disabled, normalizedSelected, onChange, selected],
	);

	const applyPreset = useCallback(
		(presetSurfs: readonly string[]) => {
			if (disabled) return;
			const allIncluded = presetSurfs.every((s) => normalizedSelected.includes(s));
			if (allIncluded) {
				onChange(selected.filter((s) => !presetSurfs.includes(canonicalKey(s))));
			} else {
				const nextSet = new Set(selected.map(canonicalKey));
				for (const s of presetSurfs) {
					nextSet.add(s);
				}
				onChange(Array.from(nextSet));
			}
		},
		[disabled, normalizedSelected, onChange, selected],
	);

	const shouldShowPresets = showPresets && size >= 70;

	return (
		<div className="flex flex-col items-center justify-center select-none" data-testid="surface-selector-root">
			{/* Анатомическая 2D схема с расширенными хитбоксами и контрастными швами-фиссурами */}
			<svg
				width={size}
				height={Math.round(size * 1.2)}
				viewBox="0 0 100 120"
				className={`drop-shadow-sm transition-opacity duration-150 ${
					disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
				}`}
				role="img"
				aria-label="Анатомические поверхности зуба: O, V, L, M, D, C"
			>
				<title>Анатомические поверхности зуба (O, V, L, M, D, C)</title>

				{/* 1. Top: V (Вестибулярная / Щечная) */}
				<polygon
					role="button"
					tabIndex={0}
					points="4,4 96,4 72,26 28,26"
					fill={
						isSurfActive("V")
							? "var(--teal, #0d9488)"
							: "var(--odontogram-surface, var(--paper-soft, #f8fafc))"
					}
					stroke={
						isSurfActive("V")
							? "var(--teal-dark, #0f766e)"
							: "var(--line, var(--odontogram-border-strong, #cbd5e1))"
					}
					strokeWidth="1.5"
					strokeLinejoin="round"
					onClick={() => toggle("V")}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggle("V");
						}
					}}
					className="hover:opacity-90 hover:brightness-105 transition-all duration-150"
					data-testid="surf-poly-V"
				>
					<title>Вестибулярная (щечная/губная) поверхность (V)</title>
				</polygon>
				<text
					x="50"
					y="18"
					fill={
						isSurfActive("V")
							? "#ffffff"
							: "var(--odontogram-ink, var(--ink, #0f172a))"
					}
					fontSize="12"
					fontWeight="800"
					textAnchor="middle"
					pointerEvents="none"
				>
					V
				</text>

				{/* 2. Left: M (Медиальная / Мезиальная) */}
				<polygon
					role="button"
					tabIndex={0}
					points="4,4 26,28 26,72 4,96"
					fill={
						isSurfActive("M")
							? "var(--teal, #0d9488)"
							: "var(--odontogram-surface, var(--paper-soft, #f8fafc))"
					}
					stroke={
						isSurfActive("M")
							? "var(--teal-dark, #0f766e)"
							: "var(--line, var(--odontogram-border-strong, #cbd5e1))"
					}
					strokeWidth="1.5"
					strokeLinejoin="round"
					onClick={() => toggle("M")}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggle("M");
						}
					}}
					className="hover:opacity-90 hover:brightness-105 transition-all duration-150"
					data-testid="surf-poly-M"
				>
					<title>Медиальная (мезиальная) контактная поверхность (M)</title>
				</polygon>
				<text
					x="14"
					y="54"
					fill={
						isSurfActive("M")
							? "#ffffff"
							: "var(--odontogram-ink, var(--ink, #0f172a))"
					}
					fontSize="12"
					fontWeight="800"
					textAnchor="middle"
					pointerEvents="none"
				>
					M
				</text>

				{/* 3. Right: D (Дистальная) */}
				<polygon
					role="button"
					tabIndex={0}
					points="96,4 74,28 74,72 96,96"
					fill={
						isSurfActive("D")
							? "var(--teal, #0d9488)"
							: "var(--odontogram-surface, var(--paper-soft, #f8fafc))"
					}
					stroke={
						isSurfActive("D")
							? "var(--teal-dark, #0f766e)"
							: "var(--line, var(--odontogram-border-strong, #cbd5e1))"
					}
					strokeWidth="1.5"
					strokeLinejoin="round"
					onClick={() => toggle("D")}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggle("D");
						}
					}}
					className="hover:opacity-90 hover:brightness-105 transition-all duration-150"
					data-testid="surf-poly-D"
				>
					<title>Дистальная контактная поверхность (D)</title>
				</polygon>
				<text
					x="86"
					y="54"
					fill={
						isSurfActive("D")
							? "#ffffff"
							: "var(--odontogram-ink, var(--ink, #0f172a))"
					}
					fontSize="12"
					fontWeight="800"
					textAnchor="middle"
					pointerEvents="none"
				>
					D
				</text>

				{/* 4. Bottom: L (Язычная / Небная) */}
				<polygon
					role="button"
					tabIndex={0}
					points="28,74 72,74 96,96 4,96"
					fill={
						isSurfActive("L")
							? "var(--teal, #0d9488)"
							: "var(--odontogram-surface, var(--paper-soft, #f8fafc))"
					}
					stroke={
						isSurfActive("L")
							? "var(--teal-dark, #0f766e)"
							: "var(--line, var(--odontogram-border-strong, #cbd5e1))"
					}
					strokeWidth="1.5"
					strokeLinejoin="round"
					onClick={() => toggle("L")}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggle("L");
						}
					}}
					className="hover:opacity-90 hover:brightness-105 transition-all duration-150"
					data-testid="surf-poly-L"
				>
					<title>Язычная / нёбная поверхность (L)</title>
				</polygon>
				<text
					x="50"
					y="88"
					fill={
						isSurfActive("L")
							? "#ffffff"
							: "var(--odontogram-ink, var(--ink, #0f172a))"
					}
					fontSize="12"
					fontWeight="800"
					textAnchor="middle"
					pointerEvents="none"
				>
					L
				</text>

				{/* 5. Center: O (Окклюзионная / Жевательная) - просторный скругленный хитбокс */}
				<rect
					role="button"
					tabIndex={0}
					x="30"
					y="30"
					width="40"
					height="40"
					rx="6"
					fill={
						isSurfActive("O")
							? "var(--teal, #0d9488)"
							: "var(--odontogram-surface, var(--paper-soft, #f8fafc))"
					}
					stroke={
						isSurfActive("O")
							? "var(--teal-dark, #0f766e)"
							: "var(--line, var(--odontogram-border-strong, #cbd5e1))"
					}
					strokeWidth="1.5"
					onClick={() => toggle("O")}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggle("O");
						}
					}}
					className="hover:opacity-90 hover:brightness-105 transition-all duration-150"
					data-testid="surf-poly-O"
				>
					<title>Окклюзионная (жевательная) поверхность (O)</title>
				</rect>
				<text
					x="50"
					y="54"
					fill={
						isSurfActive("O")
							? "#ffffff"
							: "var(--odontogram-ink, var(--ink, #0f172a))"
					}
					fontSize="13"
					fontWeight="800"
					textAnchor="middle"
					pointerEvents="none"
				>
					O
				</text>

				{/* 6. Cervical: C (Пришеечная область / V класс) */}
				<rect
					role="button"
					tabIndex={0}
					x="4"
					y="102"
					width="92"
					height="15"
					rx="4"
					fill={
						isSurfActive("C")
							? "var(--teal, #0d9488)"
							: "var(--odontogram-surface, var(--paper-soft, #f8fafc))"
					}
					stroke={
						isSurfActive("C")
							? "var(--teal-dark, #0f766e)"
							: "var(--line, var(--odontogram-border-strong, #cbd5e1))"
					}
					strokeWidth="1.5"
					onClick={() => toggle("C")}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggle("C");
						}
					}}
					className="hover:opacity-90 hover:brightness-105 transition-all duration-150"
					data-testid="surf-poly-C"
				>
					<title>Пришеечная область / V класс (C)</title>
				</rect>
				<text
					x="50"
					y="113"
					fill={
						isSurfActive("C")
							? "#ffffff"
							: "var(--odontogram-ink, var(--ink, #0f172a))"
					}
					fontSize="9"
					fontWeight="700"
					textAnchor="middle"
					pointerEvents="none"
				>
					C (Пришеечная)
				</text>
			</svg>

			{/* Быстрые чипы полостей по Блэку: O, MO, OD, MOD, V, C */}
			{shouldShowPresets && (
				<div className="flex flex-wrap items-center justify-center gap-1 mt-2.5 max-w-[210px]" data-testid="surface-black-presets">
					{PRESETS.map((p) => {
						const isSelected = p.surfs.every((s) => normalizedSelected.includes(s));
						return (
							<button
								key={p.label}
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									applyPreset(p.surfs);
								}}
								disabled={disabled}
								className={`px-2 py-1 min-h-[26px] rounded-md text-[11px] font-mono font-bold border transition-all cursor-pointer select-none active:scale-95 ${
									isSelected
										? "bg-teal-600 text-white border-teal-700 shadow-2xs font-black"
										: "bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] text-[var(--odontogram-ink,var(--ink,#0f172a))] border-[var(--line,#cbd5e1)] hover:border-teal-500 hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))]"
								}`}
								title={p.title}
								data-testid={`surface-preset-${p.label}`}
							>
								{p.label}
							</button>
						);
					})}
					{normalizedSelected.length > 0 && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onChange([]);
							}}
							disabled={disabled}
							className="px-2 py-1 min-h-[26px] rounded-md text-[11px] font-medium text-[var(--muted,#64748b)] hover:text-rose-600 dark:hover:text-rose-400 border border-transparent hover:border-rose-400/30 cursor-pointer transition-colors"
							title="Снять выбор всех поверхностей"
							data-testid="surface-preset-clear"
						>
							Сброс
						</button>
					)}
				</div>
			)}
		</div>
	);
});

SurfaceSelector.displayName = "SurfaceSelector";
