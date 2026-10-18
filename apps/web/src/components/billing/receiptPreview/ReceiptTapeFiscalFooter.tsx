/**
 * apps/web/src/components/billing/receiptPreview/ReceiptTapeFiscalFooter.tsx
 *
 * 54-FZ Fiscal requisites footer and FNS QR verification code.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React, { useMemo } from "react";
import { generateQrCodeSvg } from "@dental/shared/fiscal";

interface ReceiptTapeFiscalFooterProps {
	readonly fnSerial?: string | undefined;
	readonly fiscalDocumentNumber?: string | undefined;
	readonly fiscalSign?: string | undefined;
	readonly kktRegNumber?: string | undefined;
	readonly ofdName?: string | undefined;
	readonly ofdUrl?: string | undefined;
	readonly fnsUrl?: string | undefined;
	readonly totalDueRub: number;
	readonly isPrecheck: boolean;
}

export const ReceiptTapeFiscalFooter: React.FC<ReceiptTapeFiscalFooterProps> = ({
	fnSerial = "9960440300123456",
	fiscalDocumentNumber,
	fiscalSign,
	kktRegNumber = "0001234567012345",
	ofdName = "Платформа ОФД",
	ofdUrl = "https://check.ofd.ru",
	fnsUrl = "nalog.gov.ru",
	totalDueRub,
	isPrecheck,
}) => {
	const qrSvg = useMemo(() => {
		if (isPrecheck) return null;
		try {
			const qrText = `t=${new Date().toISOString()}&s=${totalDueRub.toFixed(2)}&fn=${fnSerial}&i=${fiscalDocumentNumber || "1"}&fp=${fiscalSign || "12345678"}&n=1`;
			return generateQrCodeSvg(qrText, { size: 120, margin: 1 });
		} catch {
			return null;
		}
	}, [isPrecheck, totalDueRub, fnSerial, fiscalDocumentNumber, fiscalSign]);

	if (isPrecheck) {
		return (
			<div className="pt-2 text-center font-mono text-[10px] text-slate-600">
				<div>*** НЕ ЯВЛЯЕТСЯ ФИСКАЛЬНЫМ ЧЕКОМ ***</div>
				<div>Спасибо за визит в нашу клинику!</div>
			</div>
		);
	}

	return (
		<div className="pt-2 space-y-1.5 text-center font-mono text-[10px] text-slate-800">
			<div className="text-left space-y-0.5 border-b border-slate-200 pb-1.5">
				<div>РН ККТ: <span>{kktRegNumber}</span></div>
				<div>ФН №: <span>{fnSerial}</span></div>
				<div>ФД №: <span>{fiscalDocumentNumber}</span></div>
				<div>ФПД: <span>{fiscalSign}</span></div>
				<div>ОФД: <span>{ofdName}</span> ({ofdUrl})</div>
				<div>Сайт ФНС: <span>{fnsUrl}</span></div>
			</div>

			{qrSvg && (
				<div className="py-1 flex flex-col items-center justify-center">
					<div
						className="w-[120px] h-[120px] bg-white p-1 border border-slate-200 rounded flex items-center justify-center"
						dangerouslySetInnerHTML={{ __html: qrSvg }}
						data-testid="fns-receipt-verification-qr"
					/>
					<span className="text-[9px] text-slate-500 pt-0.5">
						Проверка чека в ФНС России
					</span>
				</div>
			)}

			<div className="text-[10px] text-slate-600 pt-1 border-t border-slate-200">
				<div>Спасибо за доверие к нашей клинике!</div>
				<div>Будьте здоровы и улыбайтесь чаще!</div>
			</div>
		</div>
	);
};
