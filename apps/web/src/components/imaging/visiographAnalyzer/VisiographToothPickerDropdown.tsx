/**
 * VisiographToothPickerDropdown.tsx — Селектор привязки зуба FDI к снимку визиографа
 * Mandate 8b: строго <= 120 строк.
 */

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
	boundToothCode?: string | null | undefined;
	onBindTooth?: ((code: string) => void) | undefined;
}

const UPPER_RIGHT = ["18", "17", "16", "15", "14", "13", "12", "11"];
const UPPER_LEFT = ["21", "22", "23", "24", "25", "26", "27", "28"];
const LOWER_RIGHT = ["48", "47", "46", "45", "44", "43", "42", "41"];
const LOWER_LEFT = ["31", "32", "33", "34", "35", "36", "37", "38"];

export const VisiographToothPickerDropdown: React.FC<Props> = ({ boundToothCode, onBindTooth }) => {
	const [isOpen, setIsOpen] = useState(false);

	const renderGrid = (teeth: string[]) => (
		<div className="grid grid-cols-8 gap-1">
			{teeth.map((t) => (
				<button
					key={t}
					type="button"
					onClick={() => {
						onBindTooth?.(t);
						setIsOpen(false);
					}}
					className={`h-6 text-[10px] font-bold rounded flex items-center justify-center cursor-pointer transition-colors ${
						boundToothCode === t
							? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
							: "bg-[var(--paper-soft,#1e293b)] hover:bg-[var(--teal,#0d9488)]/25 text-[var(--ink,#f8fafc)]"
					}`}
				>
					{t}
				</button>
			))}
		</div>
	);

	return (
		<div className="relative shrink-0 ml-1">
			<button
				type="button"
				data-testid="btn-visiograph-fdi-selector"
				onClick={() => setIsOpen((prev) => !prev)}
				className="secondary-button shrink-0"
				style={{
					height: "30px",
					minHeight: "30px",
					padding: "0 8px",
					borderRadius: "8px",
					border: boundToothCode ? "1px solid var(--teal, #0d9488)" : "1px solid var(--line, #334155)",
					background: boundToothCode ? "rgba(13, 148, 136, 0.15)" : "var(--paper-soft, #1e293b)",
					color: boundToothCode ? "var(--teal, #2dd4bf)" : "var(--ink, #f8fafc)",
					fontSize: "11.5px",
					fontWeight: 700,
					display: "inline-flex",
					alignItems: "center",
					gap: "4px",
					cursor: "pointer",
					whiteSpace: "nowrap",
				}}
				title="Связать снимок с зубом FDI (11..48)"
			>
				<span className="font-mono">{boundToothCode ? `Зуб #${boundToothCode}` : "Привязать зуб"}</span>
				<ChevronDown size={12} />
			</button>

			{isOpen && (
				<div
					className="absolute top-full left-0 mt-1 z-50 p-2.5 rounded-xl border border-[var(--line,#334155)] bg-[var(--paper-strong,#0f172a)] shadow-2xl flex flex-col gap-1.5"
					style={{ minWidth: "240px", backgroundColor: "var(--paper-strong, #0f172a)" }}
				>
					<div className="flex items-center justify-between text-[10px] font-bold text-[var(--muted,#94a3b8)] uppercase tracking-wider mb-0.5">
						<span>Формула FDI</span>
						<span className="text-[var(--teal,#2dd4bf)]">{boundToothCode ? `Текущий: #${boundToothCode}` : "Не привязан"}</span>
					</div>
					{renderGrid(UPPER_RIGHT)}
					{renderGrid(UPPER_LEFT)}
					<div className="w-full h-[1px] bg-[var(--line,#334155)] my-0.5" />
					{renderGrid(LOWER_RIGHT)}
					{renderGrid(LOWER_LEFT)}
				</div>
			)}
		</div>
	);
};
