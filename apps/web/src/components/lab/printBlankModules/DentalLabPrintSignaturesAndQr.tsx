import React from "react";
import { money } from "../../../AppHelpers";
import { generateBarcodeSvg, generateQrCodeSvg } from "../labMath";

export interface DentalLabPrintSignaturesAndQrProps {
	totalLabPriceRub?: number | undefined;
	secureToken: string;
	portalUrl: string;
	formDoctorName: string;
	doctorPhone?: string | undefined;
	clinicPhone?: string | undefined;
	deliveryTimeSlot: string;
}

export function DentalLabPrintSignaturesAndQr({
	totalLabPriceRub,
	secureToken,
	portalUrl,
	formDoctorName,
	doctorPhone,
	clinicPhone,
	deliveryTimeSlot,
}: DentalLabPrintSignaturesAndQrProps): React.JSX.Element {
	return (
		<>
			{/* Disinfection & Authorization Mark */}
			<div
				className="p-2.5 border border-dashed border-slate-300 print:border-black rounded text-xs flex justify-between items-center text-slate-600 print:text-black flex-wrap gap-2 break-inside-avoid print:break-inside-avoid"
				style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
			>
				<span>
					Оттиски и материалы дезинфицированы в клинике • Срок плана лечения (&gt;30 дн.) не блокирует наряды ЗТЛ • Наряд авторизован лечащим врачом
				</span>
				{totalLabPriceRub != null && totalLabPriceRub > 0 && (
					<span className="font-bold text-slate-900 print:text-black">
						Стоимость наряда: {money(totalLabPriceRub)}
					</span>
				)}
			</div>

			{/* Barcode & QR Code Section */}
			<div
				className="flex justify-between items-center pt-2 border-t border-dashed border-slate-300 print:border-black break-inside-avoid print:break-inside-avoid"
				style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
			>
				<div className="w-1/2">
					<div className="text-xs uppercase font-bold text-slate-500 print:text-black mb-1">
						Штрихкод наряда
					</div>
					<div
						className="w-48 text-slate-900"
						dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(secureToken) }}
					/>
				</div>

				<div className="flex items-center gap-3 text-right">
					<div>
						<div className="text-xs uppercase font-bold text-slate-600 print:text-black">
							Портал техника (QR)
						</div>
						<div className="text-xs text-slate-500 print:text-black">
							Сканируйте для онлайн-статуса
						</div>
					</div>
					<div
						className="text-slate-900 flex-shrink-0"
						dangerouslySetInnerHTML={{ __html: generateQrCodeSvg(portalUrl) }}
					/>
				</div>
			</div>

			{/* Signatures & Courier Handover Slip */}
			<div
				className="grid grid-cols-3 gap-6 pt-3 text-xs break-inside-avoid print:break-inside-avoid"
				style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
			>
				<div className="border-t border-slate-400 print:border-black pt-1 space-y-0.5">
					<div className="font-semibold text-slate-700 print:text-black">Врач-ортопед:</div>
					<div className="font-bold">/ {formDoctorName} /</div>
					<div className="text-[10px] text-slate-500 print:text-black">Тел: {doctorPhone || clinicPhone}</div>
				</div>
				<div className="border-t border-slate-400 print:border-black pt-1 text-center space-y-0.5">
					<div className="font-semibold text-slate-700 print:text-black">Курьер ЗТЛ (передача):</div>
					<div className="font-bold">Слот: {deliveryTimeSlot}</div>
					<div className="text-[10px] text-slate-500 print:text-black">Подпись: ___________________</div>
				</div>
				<div className="border-t border-slate-400 print:border-black pt-1 text-right space-y-0.5">
					<div className="font-semibold text-slate-700 print:text-black">Прием лабораторией ЗТЛ:</div>
					<div className="font-bold">Техник: ___________________</div>
					<div className="text-[10px] text-slate-500 print:text-black">Дата/время: ________________</div>
				</div>
			</div>
		</>
	);
}
