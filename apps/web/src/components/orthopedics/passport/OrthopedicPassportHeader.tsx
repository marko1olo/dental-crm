import React from "react";
import { Building2 } from "lucide-react";
import { buildWarrantyPortalUrl } from "../../../lib/publicPortalRoute.js";
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
	const qrVerificationUrl = buildWarrantyPortalUrl(passportNumber);
	const qrCodeSvg = generateQrCodeSvg(
		qrVerificationUrl,
		{ size: 72, margin: 1 },
	);

	return (
		<div className="border-b-2 border-[var(--primary)] pb-3.5 mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5 text-[var(--primary)] font-bold text-xs tracking-wider mb-1">
					<Building2 size={14} />
					<span>{clinicName}</span>
				</div>
				<h1 className="text-base sm:text-xl font-extrabold text-[var(--ink)] leading-tight">
					Паспорт ортопедической конструкции
				</h1>
				<h2 className="text-xs sm:text-sm font-semibold text-[var(--ink-muted)] mt-0.5">
					Сертификат гарантийных обязательств № <span className="font-mono text-[var(--primary)]">{passportNumber}</span>
				</h2>
			</div>

			<div className="flex items-center gap-2.5 shrink-0">
				<div className="text-left sm:text-right text-xs shrink-0 font-mono text-[var(--ink-muted)] border border-[var(--line)] rounded-lg p-2 bg-[var(--paper-soft)] flex flex-col justify-between">
					<div>Дата выдачи: <strong className="text-[var(--ink)]">{issueDate}</strong></div>
					<div>Статус: <strong className="text-[var(--primary)]">Постоянная фиксация</strong></div>
					<div className="text-[10px] text-[var(--ink-muted)] mt-0.5">LOT: <strong className="font-mono text-[var(--ink)]">{batchLot}</strong></div>
				</div>
				<div
					className="w-[68px] h-[68px] p-1 bg-white dark:bg-white border border-[var(--line)] rounded-lg flex flex-col items-center justify-center shrink-0 shadow-2xs"
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
