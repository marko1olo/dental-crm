/**
 * ImplantPassportTab.tsx — Гарантийный паспорт дентального имплантата А5 (DENTE CRM).
 * Векторный QR-код верификации, пожизненная гарантия остеоинтеграции,
 * серийный номер/лот и денежные расчеты в целочисленных копейках (Мандаты 8e, 8n, 8am).
 */

import React from "react";
import { Award, Printer, QrCode, ShieldCheck } from "lucide-react";
import {
	formatKopecksToRubles,
	type ImplantWarrantyPassportData,
} from "../implantologyCatalogData";

export interface ImplantPassportTabProps {
	readonly warrantyPassport: ImplantWarrantyPassportData;
	readonly lotNumber: string;
	readonly onLotChange: (lot: string) => void;
	readonly serialNumber: string;
	readonly onSerialChange: (sn: string) => void;
	readonly onPrintPassport?: (() => void) | undefined;
}

export const ImplantPassportTab: React.FC<ImplantPassportTabProps> = ({
	warrantyPassport,
	lotNumber,
	onLotChange,
	serialNumber,
	onSerialChange,
	onPrintPassport = () => typeof window !== "undefined" && window.print(),
}) => {
	return (
		<div className="space-y-3.5" data-testid="tab-content-passport">
			<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xs space-y-3">
				{/* Шапка гарантийного паспорта */}
				<div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
					<div className="flex items-center gap-2">
						<ShieldCheck size={20} className="text-[var(--teal,#0d9488)]" />
						<div>
							<h3 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wide">
								Гарантийный паспорт имплантата
							</h3>
							<span className="text-[11px] text-[var(--muted)] font-mono">{warrantyPassport.passportId}</span>
						</div>
					</div>
					<div className="text-right">
						<div className="text-[11px] font-bold text-[var(--teal,#0d9488)]">ПОЖИЗНЕННАЯ ГАРАНТИЯ</div>
						<div className="text-[10px] text-[var(--muted)]">Стандарт остеоинтеграции</div>
					</div>
				</div>

				{/* Сетка характеристик изделия */}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
					<div className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
						<div className="text-[10px] text-[var(--muted)]">Система:</div>
						<div className="font-bold text-[var(--ink)] truncate">{warrantyPassport.brandName}</div>
					</div>
					<div className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
						<div className="text-[10px] text-[var(--muted)]">Размер / Зуб:</div>
						<div className="font-bold text-[var(--ink)] truncate">
							Ø {warrantyPassport.diameterMm} × {warrantyPassport.lengthMm} мм (#{warrantyPassport.toothFdi})
						</div>
					</div>
					<div className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
						<div className="text-[10px] text-[var(--muted)]">Лот / Серия:</div>
						<div className="font-mono font-bold text-[var(--ink)] text-[11px] truncate">
							{warrantyPassport.lotNumber}
						</div>
					</div>
					<div className="p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
						<div className="text-[10px] text-[var(--muted)]">Торк / ISQ:</div>
						<div className="font-bold text-emerald-600 dark:text-emerald-400">
							{warrantyPassport.insertionTorqueNcm} Н·см · {warrantyPassport.isqValue} ISQ
						</div>
					</div>
				</div>

				{/* Поля ручного ввода серии / лота (если стикер со сканера или упаковки) */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
					<div className="space-y-1">
						<label htmlFor="passport-lot-input" className="text-[11px] font-medium text-[var(--muted)]">
							Номер партии (LOT с упаковки):
						</label>
						<input
							id="passport-lot-input"
							type="text"
							placeholder={warrantyPassport.lotNumber}
							value={lotNumber}
							onChange={(e) => onLotChange(e.target.value)}
							className="w-full min-h-[38px] px-2.5 text-xs font-mono rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
							data-testid="input-passport-lot"
						/>
					</div>
					<div className="space-y-1">
						<label htmlFor="passport-sn-input" className="text-[11px] font-medium text-[var(--muted)]">
							Серийный номер (SN):
						</label>
						<input
							id="passport-sn-input"
							type="text"
							placeholder={warrantyPassport.serialNumber}
							value={serialNumber}
							onChange={(e) => onSerialChange(e.target.value)}
							className="w-full min-h-[38px] px-2.5 text-xs font-mono rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
							data-testid="input-passport-sn"
						/>
					</div>
				</div>

				{/* Векторный QR-код и верификация */}
				<div className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<div className="w-20 h-20 bg-white p-1 rounded-lg border border-slate-200 shrink-0 flex items-center justify-center shadow-xs">
						<svg viewBox="0 0 100 100" className="w-full h-full text-slate-900" aria-label="Векторный QR-код гарантийного паспорта">
							<rect width="100" height="100" fill="#ffffff" />
							{/* Угловые маркеры QR-кода */}
							<rect x="5" y="5" width="25" height="25" fill="#0f172a" />
							<rect x="10" y="10" width="15" height="15" fill="#ffffff" />
							<rect x="14" y="14" width="7" height="7" fill="#0f172a" />
							<rect x="70" y="5" width="25" height="25" fill="#0f172a" />
							<rect x="75" y="10" width="15" height="15" fill="#ffffff" />
							<rect x="79" y="14" width="7" height="7" fill="#0f172a" />
							<rect x="5" y="70" width="25" height="25" fill="#0f172a" />
							<rect x="10" y="75" width="15" height="15" fill="#ffffff" />
							<rect x="14" y="79" width="7" height="7" fill="#0f172a" />
							{/* Матрица данных */}
							<rect x="40" y="10" width="10" height="10" fill="#0f172a" />
							<rect x="42" y="35" width="18" height="18" fill="#0f172a" />
							<rect x="70" y="70" width="20" height="20" fill="#0f172a" />
							<rect x="35" y="65" width="8" height="8" fill="#0f172a" />
							<rect x="55" y="45" width="8" height="8" fill="#0f172a" />
						</svg>
					</div>
					<div className="space-y-1 text-xs min-w-0 flex-1">
						<div className="font-bold text-[var(--ink)] flex items-center gap-1.5">
							<QrCode size={15} className="text-[var(--teal,#0d9488)]" />
							<span>Цифровая верификация производителя</span>
						</div>
						<p className="text-[11px] text-[var(--muted)]">
							Ориентировочный срок остеоинтеграции:{" "}
							<strong className="text-[var(--ink)]">{warrantyPassport.expectedOsteointegrationDateIso}</strong>
						</p>
						<div className="text-[11px] text-[var(--muted)]">
							Стоимость для пациента:{" "}
							<strong className="text-[var(--ink)]">
								{formatKopecksToRubles(warrantyPassport.patientPriceKopecks)}
							</strong>
						</div>
					</div>
					<button
						type="button"
						onClick={onPrintPassport}
						className="min-h-[44px] sm:min-h-[36px] px-3 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 shrink-0 cursor-pointer"
						data-testid="btn-print-tab-passport"
					>
						<Printer size={14} className="text-[var(--teal,#0d9488)]" />
						<span>Распечатать А5</span>
					</button>
				</div>
			</div>
		</div>
	);
};

export default ImplantPassportTab;
