import React from "react";
import { UPPER_JAW_TEETH, LOWER_JAW_TEETH, getToothCoords } from "./toothAnatomyHelpers";

export const AnatomicalJawArchSchema: React.FC<{
	readonly selectedFdi: number;
	readonly brand?: string;
	readonly diameterMm?: number;
	readonly lengthMm?: number;
}> = ({ selectedFdi, brand = "Имплантат", diameterMm, lengthMm }) => {
	const renderTooth = (tooth: number, idx: number, isUpper: boolean) => {
		const { x, y } = getToothCoords(idx, isUpper);
		const isTarget = tooth === selectedFdi;
		return (
			<g key={tooth} className="tooth-node">
				{isTarget ? (
					<>
						<rect x={x - 12} y={y - 11} width="24" height="22" rx="5" fill="var(--teal, #0d9488)" stroke="#0f766e" strokeWidth="1.5" />
						<circle cx={x} cy={isUpper ? y - 13 : y + 13} r="2.5" fill="#f59e0b" />
						<text x={x} y={y + 3.5} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="900" fontFamily="monospace">
							{tooth}
						</text>
					</>
				) : (
					<>
						<rect x={x - 11} y={y - 10} width="22" height="20" rx="4" fill="var(--paper)" stroke="var(--line)" strokeWidth="1" />
						<text x={x} y={y + 3.5} textAnchor="middle" fill="var(--muted)" fontSize="9" fontWeight="700" fontFamily="monospace">
							{tooth}
						</text>
					</>
				)}
			</g>
		);
	};

	return (
		<div className="anatomical-jaw-arch-container p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1.5" data-testid="anatomical-jaw-arch">
			<div className="flex items-center justify-between text-xs flex-wrap gap-1">
				<span className="font-black uppercase tracking-wider text-[var(--muted)] text-[10px]">
					Анатомическая зубная дуга FDI (Локализация имплантата):
				</span>
				<div className="flex items-center gap-2 text-[11px] font-mono">
					<span className="inline-flex items-center gap-1.5 text-[var(--teal,#0d9488)] font-bold">
						<span className="w-2.5 h-2.5 rounded-xs bg-[var(--teal,#0d9488)] inline-block" />
						{`Имплантат #${selectedFdi || "—"} (${brand}${diameterMm && lengthMm ? ` Ø${Number(diameterMm).toFixed(1)}×${lengthMm}мм` : ""})`}
					</span>
				</div>
			</div>

			<div className="w-full overflow-x-auto py-1">
				<svg viewBox="0 0 490 114" className="w-full h-auto max-h-[140px] text-[var(--ink)] select-none" role="img" aria-label={`Схема зубного ряда #${selectedFdi}`}>
					<path d="M 24 22 Q 242 46 460 22" fill="none" stroke="var(--line)" strokeDasharray="3 3" opacity="0.5" />
					<path d="M 24 88 Q 242 64 460 88" fill="none" stroke="var(--line)" strokeDasharray="3 3" opacity="0.5" />
					<line x1="242" y1="14" x2="242" y2="98" stroke="var(--line-strong, #94a3b8)" strokeDasharray="2 2" opacity="0.4" />
					<text x="242" y="11" textAnchor="middle" fill="var(--muted)" fontSize="8" fontWeight="800" letterSpacing="0.06em">ВЕРХНЯЯ ЧЕЛЮСТЬ (MAXILLA)</text>
					<text x="242" y="108" textAnchor="middle" fill="var(--muted)" fontSize="8" fontWeight="800" letterSpacing="0.06em">НИЖНЯЯ ЧЕЛЮСТЬ (MANDIBULA)</text>
					<text x="18" y="11" fill="var(--muted)" fontSize="7.5" fontWeight="700">ПРАВО (R)</text>
					<text x="466" y="11" textAnchor="end" fill="var(--muted)" fontSize="7.5" fontWeight="700">ЛЕВО (L)</text>
					{UPPER_JAW_TEETH.map((tooth, idx) => renderTooth(tooth, idx, true))}
					{LOWER_JAW_TEETH.map((tooth, idx) => renderTooth(tooth, idx, false))}
				</svg>
			</div>
		</div>
	);
};
