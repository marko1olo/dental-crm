/**
 * SurgeryImplantParametersSection.tsx — Секция параметров имплантационной системы (DENTE CRM).
 * Декомпозиция монолита в соответствии с Мандатами 8b/8zi.
 */

import React from "react";
import { Wrench } from "lucide-react";
import {
	SURGERY_IMPLANT_SYSTEMS,
	type SurgeryCapType,
} from "./surgeryCatalogData";

export interface SurgeryImplantParametersSectionProps {
	readonly selectedBrand: string;
	readonly onSelectBrand: (brand: string) => void;
	readonly diameterMm: number;
	readonly onSelectDiameter: (d: number) => void;
	readonly lengthMm: number;
	readonly onSelectLength: (l: number) => void;
	readonly torqueNcm: number;
	readonly onSelectTorque: (t: number) => void;
	readonly capType: SurgeryCapType;
	readonly onSelectCapType: (cap: SurgeryCapType) => void;
	readonly catalogArticle: string;
	readonly lotNumber: string;
	readonly serialNumber: string;
}

export const SurgeryImplantParametersSection: React.FC<SurgeryImplantParametersSectionProps> = ({
	selectedBrand,
	onSelectBrand,
	diameterMm,
	onSelectDiameter,
	lengthMm,
	onSelectLength,
	torqueNcm,
	onSelectTorque,
	capType,
	onSelectCapType,
	catalogArticle,
	lotNumber,
	serialNumber,
}) => {
	return (
		<div className="flex flex-col gap-3 p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
			<div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
				<Wrench size={14} className="text-[var(--teal,#0d9488)]" />
				<span>Имплантационная система &amp; параметры изделия:</span>
			</div>
			<div className="flex items-center gap-1.5 flex-wrap">
				{SURGERY_IMPLANT_SYSTEMS.map((sys) => (
					<button
						key={sys.id}
						type="button"
						onClick={() => onSelectBrand(sys.brandName)}
						className={`min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center whitespace-nowrap ${
							selectedBrand === sys.brandName
								? "bg-[var(--teal-surface,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper)]/80"
						}`}
						data-testid={`brand-${sys.id}`}
					>
						{sys.brandName}
					</button>
				))}
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
				<div className="flex flex-col gap-1">
					<span className="text-[11px] font-semibold text-[var(--muted)]">Диаметр (мм):</span>
					<div className="flex items-center gap-1">
						{[3.5, 4.0, 4.5, 5.0].map((d) => (
							<button
								key={d}
								type="button"
								onClick={() => onSelectDiameter(d)}
								className={`flex-1 min-h-[44px] sm:min-h-[36px] sm:h-9 px-1 text-xs font-bold rounded-xl border whitespace-nowrap overflow-hidden transition-all flex items-center justify-center cursor-pointer ${
									diameterMm === d
										? "bg-[var(--teal-surface,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								Ø {d}
							</button>
						))}
					</div>
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-[11px] font-semibold text-[var(--muted)]">Длина (мм):</span>
					<div className="flex items-center gap-1">
						{[8.5, 10.0, 11.5, 13.0].map((l) => (
							<button
								key={l}
								type="button"
								onClick={() => onSelectLength(l)}
								className={`flex-1 min-h-[44px] sm:min-h-[36px] sm:h-9 px-1 text-xs font-bold rounded-xl border whitespace-nowrap overflow-hidden transition-all flex items-center justify-center cursor-pointer ${
									lengthMm === l
										? "bg-[var(--teal-surface,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								{l}
							</button>
						))}
					</div>
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-[11px] font-semibold text-[var(--muted)]">Торк стабильности:</span>
					<div className="flex items-center gap-1">
						{[25, 35, 45].map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => onSelectTorque(t)}
								className={`flex-1 min-h-[44px] sm:min-h-[36px] sm:h-9 px-1 text-xs font-bold rounded-xl border whitespace-nowrap overflow-hidden transition-all flex items-center justify-center cursor-pointer ${
									torqueNcm === t
										? "bg-[var(--teal-surface,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
								data-testid={`torque-${t}`}
							>
								{`${t} Н·см`}
							</button>
						))}
					</div>
				</div>
			</div>

			<div className="flex items-center gap-2 pt-1 border-t border-[var(--line)]">
				<span className="text-[11px] font-semibold text-[var(--muted)] shrink-0">Заглушка/ФДМ:</span>
				<button
					type="button"
					onClick={() => onSelectCapType("fdm")}
					className={`flex-1 min-h-[44px] sm:min-h-[36px] sm:h-9 px-2 text-xs font-bold rounded-xl border whitespace-nowrap flex items-center justify-center cursor-pointer transition-all ${
						capType === "fdm"
							? "bg-[var(--teal-surface,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]"
							: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
					data-testid="cap-fdm"
				>
					Формирователь десны (ФДМ)
				</button>
				<button
					type="button"
					onClick={() => onSelectCapType("plug")}
					className={`flex-1 min-h-[44px] sm:min-h-[36px] sm:h-9 px-2 text-xs font-bold rounded-xl border whitespace-nowrap flex items-center justify-center cursor-pointer transition-all ${
						capType === "plug"
							? "bg-[var(--teal-surface,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]"
							: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
					data-testid="cap-plug"
				>
					Винт-заглушка (наглухо)
				</button>
			</div>

			<div className="grid grid-cols-3 gap-2 text-xs pt-1">
				<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
					<div className="text-[10px] text-[var(--muted)]">АРТИКУЛ (REF)</div>
					<div className="font-mono font-bold">{catalogArticle}</div>
				</div>
				<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
					<div className="text-[10px] text-[var(--muted)]">ПАРТИЯ (LOT)</div>
					<div className="font-mono font-bold">{lotNumber}</div>
				</div>
				<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
					<div className="text-[10px] text-[var(--muted)]">СЕРИЙНЫЙ (SN)</div>
					<div className="font-mono font-bold">{serialNumber}</div>
				</div>
			</div>
		</div>
	);
};
