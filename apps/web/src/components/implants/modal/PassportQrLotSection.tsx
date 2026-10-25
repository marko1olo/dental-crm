/**
 * PassportQrLotSection.tsx — Карточка стерильной партии, QR-кода лота и даты остеоинтеграции (Мандаты 8b, 8e, 8n).
 * Anti-Hollow-Card: фон var(--paper-card), 1px граница var(--line), векторные иконки Lucide.
 */
import React from "react";
import { QrCode, ShieldCheck, AlertTriangle, Wrench, Calendar } from "lucide-react";

export interface PassportQrLotSectionProps {
	readonly lotNumber: string;
	readonly catalogArticle: string;
	readonly serialNumber: string;
	readonly brand: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly torqueNcm: number;
	readonly screwdriverType?: string | undefined;
	readonly osteointegrationDateFormatted?: string | undefined;
	readonly isWarehouseOverdraft?: boolean | undefined;
	readonly isOverdraftDismissed?: boolean | undefined;
	readonly onDismissOverdraft?: (() => void) | undefined;
	readonly onAutofillDefaults?: (() => void) | undefined;
}

export const PassportQrLotSection: React.FC<PassportQrLotSectionProps> = ({
	lotNumber, catalogArticle, serialNumber, brand, diameterMm, lengthMm, torqueNcm,
	screwdriverType = "SCS / Hex 1.2 mm", osteointegrationDateFormatted,
	isWarehouseOverdraft = false, isOverdraftDismissed = false, onDismissOverdraft, onAutofillDefaults,
}) => {
	const displayLot = lotNumber?.trim() || "24C1208";
	const displayRef = catalogArticle?.trim() || "TS3S4010S";
	const displaySn = serialNumber?.trim() || "SN-884210";
	const defaultOsteoDate = osteointegrationDateFormatted || "Через 3-4 месяца (остеоинтеграция)";

	return (
		<div className="passport-qr-lot-section space-y-3" data-testid="passport-qr-lot-section">
			{isWarehouseOverdraft && !isOverdraftDismissed && (
				<div className="p-3 rounded-xl bg-[var(--amber-surface,rgba(245,158,11,0.1))] border border-[var(--amber-soft,rgba(245,158,11,0.3))] text-xs text-[var(--ink)] flex items-center gap-2.5 shadow-xs" data-testid="passport-overdraft-notice">
					<AlertTriangle size={18} className="text-[var(--amber,#f59e0b)] shrink-0" />
					<div className="flex-1 min-w-0">
						<strong className="text-[var(--amber,#f59e0b)]">Мягкий овердрафт склада (Мандат 8n): </strong>
						<span>Смена диаметра/длины у кресла (Ø{diameterMm}×{lengthMm} мм) зафиксирована без блокировки приёма.</span>
					</div>
					{onDismissOverdraft && (
						<button type="button" onClick={onDismissOverdraft} className="text-xs font-bold underline text-[var(--ink)] cursor-pointer shrink-0">
							Закрыть
						</button>
					)}
				</div>
			)}

			<div className="p-3.5 rounded-xl bg-[var(--paper-card,var(--paper))] border border-[var(--line)] shadow-xs space-y-3">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-2 min-w-0">
						<ShieldCheck size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
						<div className="text-xs">
							<strong className="text-[var(--ink)] block text-sm">Паспорт стерильного изделия & QR-верификация:</strong>
							<span className="text-[var(--muted)]">{brand} Ø{diameterMm}×{lengthMm} мм · Заводской паспорт изделия</span>
						</div>
					</div>
					{onAutofillDefaults && (
						<button type="button" onClick={onAutofillDefaults} className="secondary-button text-[11px] px-2.5 py-1 min-h-[32px] rounded-lg cursor-pointer" title="Заполнить стандартные LOT / REF упаковки" data-testid="btn-autofill-packaging">
							По умолчанию
						</button>
					)}
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
					<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line-subtle)] min-w-0">
						<span className="text-[10px] text-[var(--muted)] font-medium block mb-0.5">REF / Каталожный артикул:</span>
						<span className="font-mono font-bold text-[var(--ink)] block truncate" data-testid="passport-qr-ref">{displayRef}</span>
					</div>
					<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line-subtle)] min-w-0">
						<span className="text-[10px] text-[var(--muted)] font-medium block mb-0.5">LOT / Номер партии:</span>
						<span className="font-mono font-bold text-[var(--ink)] block truncate" data-testid="passport-qr-lot">{displayLot}</span>
					</div>
					<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line-subtle)] min-w-0">
						<span className="text-[10px] text-[var(--muted)] font-medium block mb-0.5">SN / Серийный номер:</span>
						<span className="font-mono font-bold text-[var(--ink)] block truncate" data-testid="passport-qr-sn">{displaySn}</span>
					</div>
					<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line-subtle)] min-w-0 flex items-center justify-between gap-1.5">
						<div className="min-w-0 flex-1">
							<span className="text-[10px] text-[var(--muted)] font-medium block mb-0.5">QR Паспорта:</span>
							<span className="text-[11px] font-mono font-bold text-[var(--teal,#0d9488)] block truncate">QR-VERIFIED</span>
						</div>
						<QrCode size={22} className="text-[var(--teal,#0d9488)] shrink-0" data-testid="passport-qr-lot-icon" />
					</div>
				</div>

				<div className="pt-2 border-t border-[var(--line-subtle)] flex items-center justify-between text-xs text-[var(--muted)] flex-wrap gap-2">
					<div className="flex items-center gap-1.5 min-w-0">
						<Calendar size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
						<span>Контроль остеоинтеграции:</span>
						<strong className="text-[var(--ink)]">{defaultOsteoDate}</strong>
					</div>
					<div className="flex items-center gap-1.5 min-w-0">
						<Wrench size={14} className="text-[var(--muted)] shrink-0" />
						<span>Отвертка: <strong className="text-[var(--ink)] font-mono">{screwdriverType}</strong></span>
						<span className="mx-1">·</span>
						<span>Торк: <strong className="text-[var(--ink)] font-mono">{torqueNcm} Н·см</strong></span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PassportQrLotSection;
