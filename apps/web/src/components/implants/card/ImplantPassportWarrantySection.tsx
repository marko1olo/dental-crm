import React from "react";
import { QrCode, AlertTriangle, ShieldCheck } from "lucide-react";
import type { FastImplantPassportData } from "../presets/implantPresetTypes";

export const ImplantPassportWarrantySection: React.FC<{
	readonly data: FastImplantPassportData;
	readonly displayDoctor: string;
	readonly barcodeSummary: string;
}> = ({ data, displayDoctor, barcodeSummary }) => {
	return (
		<div className="space-y-3 pt-2">
			<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
				<div className="flex flex-col justify-between space-y-1">
					<span className="text-[11px] font-black uppercase tracking-wider text-[var(--muted)]">
						Идентификация изделия (REF / LOT / SN):
					</span>
					<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] font-mono text-center">
						<svg className="passport-barcode-svg w-full h-8 text-[var(--ink)]" data-testid="passport-barcode-svg" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
							{[true, false, true, true, false, true, false, true, true, false, true, true, true, false, true, false, false, true, true, false, true, false, true, true, false, true, false, true, true, false, true, true, false, false, true, true, true, false, true, false, true, false, true, true, true, false, true, false].map((isBar, idx) => (
								isBar ? <rect key={idx} x={idx * 2 + 2} y="0" width={idx % 5 === 0 ? "1.6" : "1.0"} height="24" fill="currentColor" /> : null
							))}
						</svg>
						<span className="text-[10px] tracking-widest text-[var(--muted)] block mt-0.5 truncate">{barcodeSummary}</span>
					</div>
				</div>
				<div className="border-2 border-dashed border-[var(--line-strong,#94a3b8)] rounded-xl p-3 flex flex-col items-center justify-center text-center bg-[var(--paper)]">
					<span className="text-[10px] font-black uppercase text-[var(--muted)] tracking-wider">Место для наклейки со стерильной упаковки</span>
					<span className="text-[9px] text-[var(--muted)] mt-1">Оригинальный стерильный стикер производителя (REF, LOT, SN)</span>
				</div>
			</div>

			<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[11px] leading-relaxed text-[var(--muted)] space-y-2">
				<div className="flex items-center gap-2 text-[var(--ink)] font-bold text-xs">
					<ShieldCheck size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span>Гарантийные обязательства клиники и производителя:</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
					<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line-subtle)]">
						<strong className="text-[var(--ink)] block mb-0.5">Пожизненная гарантия производителя:</strong>
						<span>Гарантия на титановую структуру и целостность имплантата {data.brand} от завода-изготовителя.</span>
					</div>
					<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line-subtle)]">
						<strong className="text-[var(--ink)] block mb-0.5">Клиническая гарантия остеоинтеграции (10 лет):</strong>
						<span>Предоставляется клиникой при условии регулярных профилактических визитов и профгигиены 1 раз в 6 месяцев.</span>
					</div>
				</div>
				<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line-subtle)] text-[11px] flex items-center justify-between flex-wrap gap-2" data-testid="passport-osteointegration-notice">
					<div className="flex items-center gap-1.5 min-w-0">
						<strong className="text-[var(--ink)]">Контроль остеоинтеграции:</strong>
						<span className="font-bold text-[var(--teal,#0d9488)]" data-testid="passport-osteo-date">{data.osteointegrationExpectedDate || "через 3-4 месяца"}</span>
					</div>
					<span className="text-[10px] text-[var(--muted)]">Контрольная визиография / прицельный снимок</span>
				</div>
				<div className="text-[10px] text-[var(--muted)] pt-1 border-t border-[var(--line-subtle)] flex items-center justify-between flex-wrap gap-2">
					<span>Медицинская организация: ООО «ДЕНТЕ Клиник» (Лицензия ЛО-77-01-018924)</span>
					<span>Телефон регистратуры: +7 (495) 212-03-03</span>
				</div>
			</div>

			<div className="pt-3 border-t border-dashed border-[var(--line)] flex items-center justify-between gap-4 text-xs text-[var(--muted)] flex-wrap">
				<div className="flex items-center gap-4 flex-wrap min-w-0">
					<div className="min-w-0"><span>Врач: </span><strong className="text-[var(--ink)] truncate">{displayDoctor}</strong></div>
					<div className="min-w-0"><span>Плотность кости: </span><strong className="text-[var(--ink)]">{data.boneDensity || "D2"} (Misch)</strong></div>
					<div><span>Подпись хирурга-имплантолога: ______________________ </span></div>
					<div><span>Подпись пациента: ______________________ </span><span className="font-bold text-[var(--ink)] ml-2">М.П.</span></div>
				</div>
				<div className="flex items-center gap-2 p-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] shrink-0" title="QR-код верификации" data-testid="passport-qr-verification">
					<QrCode size={26} className="text-[var(--teal,#0d9488)] shrink-0" />
					<div className="text-[10px] leading-tight font-mono">
						<span className="font-bold text-[var(--ink)] block">QR VERIFIED</span>
						<span className="text-[var(--muted)] truncate block max-w-[120px]">{data.passportId || "PASSPORT"}</span>
					</div>
				</div>
			</div>

			{data.isWarehouseOverdraft && (
				<div className="p-2.5 rounded-lg bg-[var(--amber-surface,rgba(245,158,11,0.1))] text-xs text-[var(--ink)] flex items-center gap-2">
					<AlertTriangle size={15} className="shrink-0 text-[var(--amber,#f59e0b)]" />
					<span>Списание зафиксировано в мягкий овердрафт склада до проведения накладной.</span>
				</div>
			)}
		</div>
	);
};

export default ImplantPassportWarrantySection;
