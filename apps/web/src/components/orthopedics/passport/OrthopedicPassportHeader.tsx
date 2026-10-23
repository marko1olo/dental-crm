import React from "react";
import { Building2 } from "lucide-react";
import { generateQrCodeSvg } from "../../lab/labBarcodeQr.js";

export interface OrthopedicPassportHeaderProps {
	readonly clinicName: string;
	readonly passportNumber: string;
	readonly issueDate: string;
	readonly batchLot: string;
	readonly toothFdi: string;
}

export function OrthopedicPassportHeader({
	clinicName,
	passportNumber,
	issueDate,
	batchLot,
	toothFdi,
}: OrthopedicPassportHeaderProps) {
	const qrCodeSvg = generateQrCodeSvg(
		`https://dente.clinic/verify/passport?no=${encodeURIComponent(passportNumber)}&lot=${encodeURIComponent(batchLot)}&fdi=${encodeURIComponent(toothFdi)}`,
		{ size: 72, margin: 1 },
	);

	return (
		<div className="border-b-2 border-teal-600 pb-3.5 mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400 font-bold text-xs uppercase tracking-wider mb-1">
					<Building2 size={14} />
					<span>{clinicName}</span>
				</div>
				<h1 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
					ПАСПОРТ ОРТОПЕДИЧЕСКОЙ КОНСТРУКЦИИ
				</h1>
				<h2 className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
					И СЕРТИФИКАТ ГАРАНТИЙНЫХ ОБЯЗАТЕЛЬСТВ № <span className="font-mono text-teal-700 dark:text-teal-400">{passportNumber}</span>
				</h2>
			</div>

			<div className="flex items-center gap-2.5 shrink-0">
				<div className="text-left sm:text-right text-xs shrink-0 font-mono text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-800/60 flex flex-col justify-between">
					<div>Дата выдачи: <strong className="text-slate-900 dark:text-slate-100">{issueDate}</strong></div>
					<div>Статус: <strong className="text-emerald-600 dark:text-emerald-400">ПОСТОЯННАЯ ФИКСАЦИЯ</strong></div>
					<div className="text-[10px] text-slate-500 mt-0.5">LOT: <strong className="font-mono text-slate-700 dark:text-slate-300">{batchLot}</strong></div>
				</div>
				<div
					className="w-[68px] h-[68px] p-1 bg-white border border-slate-300 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center shrink-0 shadow-2xs"
					title="QR-код проверки подлинности гарантийного сертификата"
					data-testid="passport-qr-code"
				>
					<div
						className="w-full h-full flex items-center justify-center [&_svg]:w-full [&_svg]:h-full"
						dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
						aria-hidden="true"
					/>
				</div>
			</div>
		</div>
	);
}
