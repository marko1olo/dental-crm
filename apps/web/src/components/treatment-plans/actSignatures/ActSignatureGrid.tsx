import React from "react";
import { Stamp } from "lucide-react";
import type { CompletedWorksActAndWriteOffData } from "../types.js";
import type { DocumentBrandColorPalette } from "../../../store/documentBrandingStore.js";

export interface ActSignatureGridProps {
	readonly actData: CompletedWorksActAndWriteOffData;
	readonly palette: DocumentBrandColorPalette;
	readonly legalName: string;
	readonly patientPassport?: string | null | undefined;
	readonly showDoctorStampFrame: boolean;
}

export const ActSignatureGrid: React.FC<ActSignatureGridProps> = ({
	actData,
	palette,
	legalName,
	patientPassport,
	showDoctorStampFrame,
}) => {
	return (
		<div className="w-full grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-8 items-start">
			{/* Left: Clinic / Doctor Signature & Stamp */}
			<div className="space-y-4">
				<div>
					<div className="text-xs font-black uppercase tracking-wider" style={{ color: palette.primaryDark }}>
						От Исполнителя (Клиника):
					</div>
					<div className="text-[11px] text-slate-600 mt-0.5">
						{legalName} • Врач: {actData.doctorFullName || "______________________"}
					</div>
				</div>

				<div className="pt-2">
					<div className="text-xs font-semibold text-slate-800">
						Врач-стоматолог: ______________________ / {actData.doctorFullName || "______________________"} /
					</div>
					<div className="text-[10px] text-slate-500 italic mt-0.5">
						(личная подпись и расшифровка лечащего врача)
					</div>
				</div>

				{showDoctorStampFrame && (
					<div className="pt-2 flex items-center gap-4">
						<div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-400 flex flex-col items-center justify-center text-center p-1 text-slate-500 shrink-0">
							<Stamp className="w-4 h-4 text-slate-400 mb-0.5" />
							<span className="font-extrabold text-[10px] uppercase tracking-wider">М.П.</span>
							<span className="text-[8px] leading-tight mt-0.5">Для медицинских документов</span>
						</div>
						<div className="text-[10px] text-slate-500 leading-tight">
							Место оттиска печати<br />
							медицинской организации<br />
							Дата: «____» ____________ 2026 г.
						</div>
					</div>
				)}
			</div>

			{/* Right: Patient Signature */}
			<div className="space-y-4">
				<div>
					<div className="text-xs font-black uppercase tracking-wider text-slate-900">
						От Заказчика (Пациент):
					</div>
					<div className="text-[11px] text-slate-600 mt-0.5">
						ФИО: {actData.patientName || "______________________"} • Паспорт: {patientPassport ? "проверен" : "предъявлен"}
					</div>
				</div>

				<div className="pt-2">
					<div className="text-xs font-semibold text-slate-800">
						Пациент: ______________________ / {actData.patientName || "______________________"} /
					</div>
					<div className="text-[10px] text-slate-500 italic mt-0.5">
						(услуги принял в полном объеме, претензий не имею)
					</div>
				</div>

				<div className="pt-4 text-[10px] text-slate-500 leading-tight">
					Подтверждаю согласие с объемом и стоимостью оказанных услуг.<br />
					Дата подписания: «____» ____________ 2026 г.
				</div>
			</div>
		</div>
	);
};
