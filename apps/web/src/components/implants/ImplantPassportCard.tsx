import React from "react";
import { ShieldCheck, Calendar, Activity, Copy, Check, QrCode } from "lucide-react";
import { showToast } from "../GlobalToast";
import type { FastImplantPassportData } from "./implantQuickPresets";
import "./implants.css";

export interface ImplantPassportCardProps {
	readonly data: FastImplantPassportData;
	readonly className?: string;
	readonly onCopySummary?: () => void;
}

export const ImplantPassportCard: React.FC<ImplantPassportCardProps> = ({
	data,
	className = "",
	onCopySummary,
}) => {
	const formattedDate = new Date(data.dateIso).toLocaleDateString("ru-RU");

	const handleCopy = () => {
		const text =
			`ПАСПОРТ ИМПЛАНТАТА (FDI #${data.toothFdi})\n` +
			`Пациент: ${data.patientName} (${data.patientId})\n` +
			`Система: ${data.brand} ${data.model}\n` +
			`Размер: Ø ${data.diameterMm} x ${data.lengthMm} мм\n` +
			`Торк стабилизации: ${data.torqueNcm} Н/см\n` +
			`Плотность кости: ${data.boneDensity}\n` +
			`LOT: ${data.lotNumber} | SN: ${data.serialNumber}\n` +
			`Дата операции: ${formattedDate} · Врач: ${data.doctorName}`;

		navigator.clipboard?.writeText(text);
		onCopySummary?.();
		showToast(`Паспорт имплантата #${data.toothFdi} скопирован`, "success");
	};

	return (
		<div
			className={`implant-passport-display-card space-y-4 ${className}`.trim()}
			data-testid="implant-passport-card"
		>
			<div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] flex items-center justify-center">
						<ShieldCheck size={20} />
					</div>
					<div>
						<h4 className="text-sm font-black text-[var(--ink)]">
							Паспорт имплантата DENTE
						</h4>
						<span className="text-[11px] font-mono text-[var(--muted)]">
							{data.passportId}
						</span>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<span className="px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]">
						Зуб FDI #{data.toothFdi}
					</span>
					<button
						type="button"
						onClick={handleCopy}
						className="p-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
						title="Скопировать данные паспорта"
						data-testid="btn-copy-passport-card"
					>
						<Copy size={14} />
					</button>
				</div>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
				<div>
					<span className="text-[11px] text-[var(--muted)] block">Пациент:</span>
					<strong className="font-extrabold text-[var(--ink)]">{data.patientName}</strong>
				</div>

				<div>
					<span className="text-[11px] text-[var(--muted)] block">Имплантационная система:</span>
					<strong className="font-extrabold text-[var(--teal,#0d9488)]">
						{data.brand} {data.model}
					</strong>
				</div>

				<div>
					<span className="text-[11px] text-[var(--muted)] block">Размер платформы:</span>
					<strong className="font-mono font-extrabold text-[var(--ink)]">
						{`Ø ${data.diameterMm} × ${data.lengthMm} мм`}
					</strong>
				</div>

				<div>
					<span className="text-[11px] text-[var(--muted)] block">Торк первичной стабильности:</span>
					<strong className="font-mono font-extrabold text-[var(--teal-dark,#0f766e)]">
						{`${data.torqueNcm} Н/см`}
					</strong>
				</div>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-[var(--line)]">
				<div>
					<span className="text-[11px] text-[var(--muted)] block">LOT / Партия:</span>
					<span className="font-mono font-bold text-[var(--ink)]">{data.lotNumber}</span>
				</div>

				<div>
					<span className="text-[11px] text-[var(--muted)] block">Серийный номер:</span>
					<span className="font-mono font-bold text-[var(--ink)]">{data.serialNumber}</span>
				</div>

				<div>
					<span className="text-[11px] text-[var(--muted)] block">Плотность кости:</span>
					<span className="font-bold text-[var(--ink)]">{data.boneDensity} (Misch)</span>
				</div>

				<div>
					<span className="text-[11px] text-[var(--muted)] block">Дата операции:</span>
					<span className="font-bold text-[var(--ink)]">{formattedDate}</span>
				</div>
			</div>

			{data.isWarehouseOverdraft && (
				<div className="p-2.5 rounded-lg bg-[var(--amber-surface,rgba(245,158,11,0.1))] text-xs text-[var(--amber-dark,#b45309)]">
					⚠️ Списание зафиксировано в мягкий овердрафт склада до проведения накладной.
				</div>
			)}
		</div>
	);
};

export default ImplantPassportCard;
