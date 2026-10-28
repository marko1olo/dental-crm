import React from "react";

export interface OdontogramPrintHeaderProps {
	isPediatricMode: boolean;
	activePatient?: any | undefined;
}

export const OdontogramPrintHeader: React.FC<OdontogramPrintHeaderProps> = ({
	isPediatricMode,
	activePatient,
}) => {
	const cardNum =
		activePatient?.cardNumber ||
		activePatient?.medicalCardNumber ||
		activePatient?.id?.slice(0, 8) ||
		"СТ-2026-0843";

	return (
		<div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-start justify-between gap-4">
			<div>
				<div className="text-base font-black text-slate-900 uppercase tracking-tight">
					Стоматологическая клиника «DENTE»
				</div>
				<div className="text-xs font-semibold text-slate-700">
					ООО «ДЕНТЕ МЕДИКАЛ ГРУПП» • Лицензия № ЛО41-01137-77/00368421 от 14.02.2023 г.
				</div>
				<div className="text-[11px] text-slate-500">
					119048, г. Москва, ул. Стоматологическая, д. 24, корп. 1 • Тел: +7 (495) 777-88-99 • dente-clinic.ru
				</div>
				<h1 className="text-lg font-black tracking-tight text-slate-950 uppercase mt-2">
					Клиническая зубная формула (Медицинская карта приёма)
				</h1>
				<p className="text-xs font-semibold text-slate-600">
					Прикус: {isPediatricMode ? "Детский / сменный (зубы 51–85)" : "Постоянный взрослый (зубы 11–48)"}
				</p>
			</div>
			<div className="text-right text-xs shrink-0">
				<div className="font-bold text-slate-900">
					Пациент: {activePatient?.fullName || "—"}
				</div>
				<div className="text-slate-600">
					Дата рожд.: {activePatient?.birthDate || "—"}
				</div>
				<div className="text-slate-600">
					№ Медкарты: {cardNum}
				</div>
				<div className="font-semibold text-slate-800 mt-1">
					Дата печати: {new Date().toLocaleDateString("ru-RU")}
				</div>
			</div>
		</div>
	);
};
