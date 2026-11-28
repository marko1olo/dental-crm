/**
 * SurgeryImplantParametersSection.tsx — Секция параметров имплантационной системы (DENTE CRM).
 * Декомпозиция монолита в соответствии с Мандатами 8b/8zi.
 * Чистые семантические токены без хардкода teal (Мандат 8am).
 */

import React from "react";
import { Compass, Wrench } from "lucide-react";
import {
	SURGERY_IMPLANT_SYSTEMS,
	findImplantSystemById,
	type SurgeryCapType,
} from "./surgeryCatalogData";

export interface ToothImplantSpec {
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly torqueNcm: number;
	readonly isqValue: number;
	readonly capType: SurgeryCapType;
	readonly lotNumber: string;
	readonly serialNumber: string;
	readonly catalogArticle: string;
}

export interface SurgeryImplantParametersSectionProps {
	readonly selectedBrand: string;
	readonly onSelectBrand: (brand: string) => void;
	readonly diameterMm: number;
	readonly onSelectDiameter: (d: number) => void;
	readonly lengthMm: number;
	readonly onSelectLength: (l: number) => void;
	readonly torqueNcm: number;
	readonly onSelectTorque: (t: number) => void;
	readonly isqValue?: number | undefined;
	readonly onSelectIsq?: ((isq: number) => void) | undefined;
	readonly capType: SurgeryCapType;
	readonly onSelectCapType: (cap: SurgeryCapType) => void;
	readonly catalogArticle: string;
	readonly lotNumber: string;
	readonly serialNumber: string;
	readonly onChangeLotNumber?: ((lot: string) => void) | undefined;
	readonly onChangeSerialNumber?: ((serial: string) => void) | undefined;
	readonly selectedTeeth?: readonly number[] | undefined;
	readonly activeToothFdi?: number | undefined;
	readonly onSelectActiveTooth?: ((tooth: number) => void) | undefined;
	readonly perToothSpecs?: Readonly<Record<number, ToothImplantSpec>> | undefined;
	readonly isGuidedSurgery?: boolean | undefined;
	readonly onToggleGuidedSurgery?: ((val: boolean) => void) | undefined;
	readonly guidedSleeveDiameterMm?: number | undefined;
	readonly onSelectGuidedSleeveDiameter?: ((val: number) => void) | undefined;
	readonly guidedSleeveOffsetMm?: number | undefined;
	readonly onSelectGuidedSleeveOffset?: ((val: number) => void) | undefined;
	readonly surgicalGuideTemplateId?: string | undefined;
	readonly onChangeSurgicalGuideTemplateId?: ((val: string) => void) | undefined;
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
	isqValue = 72,
	onSelectIsq,
	capType,
	onSelectCapType,
	catalogArticle,
	lotNumber,
	serialNumber,
	onChangeLotNumber,
	onChangeSerialNumber,
	selectedTeeth,
	activeToothFdi,
	onSelectActiveTooth,
	perToothSpecs,
	isGuidedSurgery = false,
	onToggleGuidedSurgery,
	guidedSleeveDiameterMm = 5.0,
	onSelectGuidedSleeveDiameter,
	guidedSleeveOffsetMm = 2.0,
	onSelectGuidedSleeveOffset,
	surgicalGuideTemplateId = "",
	onChangeSurgicalGuideTemplateId,
}) => {
	const selectedSystem = findImplantSystemById(selectedBrand);
	const availableDiameters = selectedSystem?.standardDiametersMm?.length
		? selectedSystem.standardDiametersMm
		: [3.5, 4.0, 4.5, 5.0];
	const availableLengths = selectedSystem?.standardLengthsMm?.length
		? selectedSystem.standardLengthsMm
		: [8.5, 10.0, 11.5, 13.0];

	return (
		<div className="flex flex-col gap-3 p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
			<div className="text-xs font-bold text-[var(--ink)] flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-1.5">
					<Wrench size={14} className="text-[var(--primary)]" />
					<span>Имплантационная система и параметры изделия:</span>
				</div>
				{selectedTeeth && selectedTeeth.length > 1 && (
					<span className="text-[11px] font-medium text-[var(--primary)]">
						Настройка зуба #{activeToothFdi ?? selectedTeeth[0]}
					</span>
				)}
			</div>
			{selectedTeeth && selectedTeeth.length > 1 && onSelectActiveTooth && (
				<div className="flex items-center gap-1.5 flex-wrap" data-testid="implant-per-tooth-tabs">
					{selectedTeeth.map((t) => {
						const spec = perToothSpecs?.[t];
						const isActive = (activeToothFdi ?? selectedTeeth[0]) === t;
						const sizeBadge = spec ? `Ø${spec.diameterMm}×${spec.lengthMm}` : `Ø${diameterMm}×${lengthMm}`;
						return (
							<button
								key={t}
								type="button"
								onClick={() => onSelectActiveTooth(t)}
								className={`min-h-[36px] h-9 px-2.5 text-xs font-medium rounded-lg border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
									isActive
										? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
								}`}
								data-testid={`implant-tooth-tab-${t}`}
							>
								<span className="font-mono font-bold">#{t}</span>
								<span className="text-[11px] opacity-90">{sizeBadge}</span>
							</button>
						);
					})}
				</div>
			)}
			<div className="flex items-center gap-1.5 flex-wrap">
				{SURGERY_IMPLANT_SYSTEMS.map((sys) => (
					<button
						key={sys.id}
						type="button"
						onClick={() => onSelectBrand(sys.brandName)}
						className={`min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center whitespace-nowrap ${
							selectedBrand === sys.brandName
								? "bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)] font-semibold shadow-xs"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper)]/80"
						}`}
						data-testid={`brand-${sys.id}`}
					>
						{sys.brandName}
					</button>
				))}
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
				<div className="flex flex-col gap-1">
					<span className="text-[11px] font-semibold text-[var(--muted)]">Диаметр (мм):</span>
					<div className="flex items-center gap-1 flex-wrap sm:flex-nowrap">
						{availableDiameters.map((d) => (
							<button
								key={d}
								type="button"
								onClick={() => onSelectDiameter(d)}
								className={`flex-1 min-h-[44px] sm:min-h-[36px] sm:h-9 px-1 text-xs font-bold rounded-xl border whitespace-nowrap overflow-hidden transition-all flex items-center justify-center cursor-pointer ${
									diameterMm === d
										? "bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)] font-semibold shadow-xs"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
								data-testid={`diameter-${d}`}
							>
								Ø {d}
							</button>
						))}
					</div>
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-[11px] font-semibold text-[var(--muted)]">Длина (мм):</span>
					<div className="flex items-center gap-1 flex-wrap sm:flex-nowrap">
						{availableLengths.map((l) => (
							<button
								key={l}
								type="button"
								onClick={() => onSelectLength(l)}
								className={`flex-1 min-h-[44px] sm:min-h-[36px] sm:h-9 px-1 text-xs font-bold rounded-xl border whitespace-nowrap overflow-hidden transition-all flex items-center justify-center cursor-pointer ${
									lengthMm === l
										? "bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)] font-semibold shadow-xs"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
								data-testid={`length-${l}`}
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
										? "bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)] font-semibold shadow-xs"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
								data-testid={`torque-${t}`}
							>
								{`${t} Н·см`}
							</button>
						))}
					</div>
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between text-[11px] font-semibold text-[var(--muted)]">
						<span>Стабильность ISQ:</span>
						<span className="text-[var(--primary)] font-bold">{isqValue > 0 ? isqValue : "—"}</span>
					</div>
					<div className="flex items-center gap-1">
						{[60, 68, 74, 78].map((val) => (
							<button
								key={val}
								type="button"
								onClick={() => onSelectIsq?.(val)}
								className={`flex-1 min-h-[44px] sm:min-h-[36px] sm:h-9 px-1 text-xs font-bold rounded-xl border whitespace-nowrap overflow-hidden transition-all flex items-center justify-center cursor-pointer ${
									isqValue === val
										? "bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)] font-semibold shadow-xs"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
								data-testid={`isq-preset-${val}`}
								title={`ISQ ${val}`}
							>
								{val}
							</button>
						))}
						<input
							type="number"
							min={30}
							max={90}
							value={isqValue > 0 ? isqValue : ""}
							placeholder="74"
							onChange={(e) => {
								const num = Number(e.target.value);
								if (!Number.isNaN(num) && num >= 30 && num <= 90) {
									onSelectIsq?.(num);
								}
							}}
							className="w-14 min-h-[44px] sm:min-h-[36px] sm:h-9 px-1 text-xs font-mono font-bold text-center rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
							data-testid="input-isq-value"
							aria-label="Значение ISQ (30-90)"
						/>
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
							? "bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)] font-semibold shadow-xs"
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
							? "bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)] font-semibold shadow-xs"
							: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
					data-testid="cap-plug"
				>
					Винт-заглушка (наглухо)
				</button>
			</div>

			<div className="flex flex-col gap-2 pt-2 border-t border-[var(--line)]" data-testid="guided-surgery-controls">
				<div className="flex items-center justify-between">
					<div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Compass size={14} className="text-[var(--primary)]" />
						<span>Навигационная хирургия (хирургический шаблон):</span>
					</div>
					<label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--ink)]">
						<input
							type="checkbox"
							checked={Boolean(isGuidedSurgery)}
							onChange={(e) => onToggleGuidedSurgery?.(e.target.checked)}
							className="rounded accent-[var(--primary)] cursor-pointer w-4 h-4"
							data-testid="checkbox-guided-surgery"
						/>
						<span>По шаблону</span>
					</label>
				</div>
				{Boolean(isGuidedSurgery) && (
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
						<div className="flex flex-col gap-1">
							<span className="text-[11px] font-semibold text-[var(--muted)]">Ø Втулки шаблона (мм):</span>
							<div className="flex items-center gap-1">
								{[4.0, 5.0, 5.5].map((s) => (
									<button
										key={s}
										type="button"
										onClick={() => onSelectGuidedSleeveDiameter?.(s)}
										className={`flex-1 min-h-[36px] h-9 px-1 text-xs font-bold rounded-xl border whitespace-nowrap transition-all flex items-center justify-center cursor-pointer ${
											guidedSleeveDiameterMm === s
												? "bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)] font-semibold shadow-xs"
												: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
										}`}
										data-testid={`sleeve-diameter-${s}`}
									>
										Ø {s}
									</button>
								))}
							</div>
						</div>
						<div className="flex flex-col gap-1">
							<span className="text-[11px] font-semibold text-[var(--muted)]">Оффсет втулки (мм):</span>
							<div className="flex items-center gap-1">
								{[1.0, 2.0, 3.5].map((o) => (
									<button
										key={o}
										type="button"
										onClick={() => onSelectGuidedSleeveOffset?.(o)}
										className={`flex-1 min-h-[36px] h-9 px-1 text-xs font-bold rounded-xl border whitespace-nowrap transition-all flex items-center justify-center cursor-pointer ${
											guidedSleeveOffsetMm === o
												? "bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)] font-semibold shadow-xs"
												: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
										}`}
										data-testid={`sleeve-offset-${o}`}
									>
										+{o} мм
									</button>
								))}
							</div>
						</div>
						<div className="flex flex-col gap-1">
							<span className="text-[11px] font-semibold text-[var(--muted)]">ID шаблона / CAD-файла:</span>
							<input
								type="text"
								value={surgicalGuideTemplateId || ""}
								onChange={(e) => onChangeSurgicalGuideTemplateId?.(e.target.value)}
								placeholder="SG-2026-T46"
								className="w-full min-h-[36px] h-9 px-2 text-xs font-mono rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
								data-testid="input-surgical-guide-template-id"
							/>
						</div>
					</div>
				)}
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
				<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
					<div className="text-[10px] text-[var(--muted)]">Артикул (REF)</div>
					<div className="font-mono font-bold">{catalogArticle || "—"}</div>
				</div>
				<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
					<label htmlFor="implant-lot-input" className="block text-[10px] text-[var(--muted)]">Партия (LOT)</label>
					{onChangeLotNumber ? (
						<input
							id="implant-lot-input"
							type="text"
							value={lotNumber}
							onChange={(e) => onChangeLotNumber(e.target.value)}
							placeholder="LOT-..."
							className="w-full h-7 px-1.5 mt-0.5 text-xs font-mono font-bold rounded border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
							data-testid="input-implant-lot"
						/>
					) : (
						<div className="font-mono font-bold">{lotNumber || "—"}</div>
					)}
				</div>
				<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
					<label htmlFor="implant-serial-input" className="block text-[10px] text-[var(--muted)]">Серийный номер (SN)</label>
					{onChangeSerialNumber ? (
						<input
							id="implant-serial-input"
							type="text"
							value={serialNumber}
							onChange={(e) => onChangeSerialNumber(e.target.value)}
							placeholder="SN-..."
							className="w-full h-7 px-1.5 mt-0.5 text-xs font-mono font-bold rounded border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
							data-testid="input-implant-serial"
						/>
					) : (
						<div className="font-mono font-bold">{serialNumber}</div>
					)}
				</div>
			</div>
		</div>
	);
};
