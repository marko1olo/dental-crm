import React from "react";
import { QrCode, AlertTriangle } from "lucide-react";
import type { FastImplantPassportData } from "../presets/implantPresetTypes";

export const ImplantPassportWarrantySection: React.FC<{
	readonly data: FastImplantPassportData;
	readonly displayDoctor: string;
	readonly barcodeSummary: string;
}> = ({ data, displayDoctor, barcodeSummary }) => {
	return (
		<div className="space-y-3">
			<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
				<div className="flex flex-col justify-between space-y-1">
					<span className="text-[11px] font-black uppercase tracking-wider text-[var(--muted)]">
						Штрихкод идентификации изделия (GS1 / REF):
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
					<span className="text-[9px] text-[var(--muted)] mt-1">Вклейте оригинальный клейкий стикер производителя (REF, LOT, SN)</span>
				</div>
			</div>

			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[11px] leading-relaxed text-[var(--muted)]">
				<strong className="text-[var(--ink)] font-black block mb-1">Гарантийные обязательства клиники и производителя:</strong>
				<span>Производитель гарантирует остеоинтеграцию и целостность имплантата при соблюдении профилактических осмотров (1 раз в 6 месяцев) и гигиены полости рта.</span>
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
