/**
 * apps/web/src/components/treatment-plans/actHeader/ActRequisitesTable.tsx
 *
 * Матрица реквизитов исполнителя и заказчика (клиника, пациент, врач).
 */

import React from "react";
import type { ActRequisitesTableProps } from "./types";

export const ActRequisitesTable: React.FC<ActRequisitesTableProps> = ({
	actData,
	legalName,
	inn,
	kpp,
	ogrn,
	license,
	patientDob,
	patientGenderText,
	patientPass,
	patientRegAddress,
	patientContactPhone,
	patientSnilsVal,
	patientOmsVal,
	patientMedCard,
	doctorSpec,
	doctorSnilsVal,
}) => {
	return (
		<div className="mb-5 print:mb-3 overflow-hidden rounded-xl border border-slate-300 text-xs">
			<table className="w-full border-collapse text-left">
				<tbody>
					<tr className="border-b border-slate-300">
						<td className="w-1/4 p-2.5 bg-slate-100 font-bold text-slate-800 border-r border-slate-300">
							Исполнитель (Клиника):
						</td>
						<td className="w-1/4 p-2.5 bg-white text-slate-900 border-r border-slate-300 leading-snug">
							<strong className="block text-slate-950 min-w-0 break-words">{legalName}</strong>
							<span className="text-[11px] text-slate-600 block mt-0.5">
								ИНН:&nbsp;{inn} / КПП:&nbsp;{kpp} • ОГРН:&nbsp;{ogrn}
							</span>
						</td>
						<td className="w-1/4 p-2.5 bg-slate-100 font-bold text-slate-800 border-r border-slate-300">
							Пациент (Заказчик):
						</td>
						<td className="w-1/4 p-2.5 bg-white text-slate-900 leading-snug">
							<strong className="block text-slate-950">{actData.patientName}</strong>
							<span className="text-[11px] text-slate-600 block mt-0.5">
								Дата рожд.: {patientDob} ({patientGenderText})
							</span>
						</td>
					</tr>
					<tr className="border-b border-slate-300">
						<td className="p-2.5 bg-slate-100 font-bold text-slate-800 border-r border-slate-300">
							Лицензия клиники:
						</td>
						<td className="p-2.5 bg-white text-slate-900 border-r border-slate-300 text-[11px] leading-snug">
							{license}
						</td>
						<td className="p-2.5 bg-slate-100 font-bold text-slate-800 border-r border-slate-300">
							Паспортные данные:
						</td>
						<td className="p-2.5 bg-white text-slate-900 text-[11px] leading-snug">
							{patientPass}
						</td>
					</tr>
					<tr className="border-b border-slate-300">
						<td className="p-2.5 bg-slate-100 font-bold text-slate-800 border-r border-slate-300">
							Лечащий врач (Исполнитель):
						</td>
						<td className="p-2.5 bg-white text-slate-900 border-r border-slate-300 leading-snug">
							<strong className="block text-slate-950">{actData.doctorFullName}</strong>
							<span className="text-[11px] text-slate-600 block mt-0.5">
								{doctorSpec} • СНИЛС: {doctorSnilsVal}
							</span>
						</td>
						<td className="p-2.5 bg-slate-100 font-bold text-slate-800 border-r border-slate-300">
							Полис ОМС / СНИЛС / Контакт:
						</td>
						<td className="p-2.5 bg-white text-slate-900 text-[11px] leading-snug">
							<div>{patientOmsVal} • СНИЛС: {patientSnilsVal}</div>
							<div className="text-slate-600 mt-0.5">
								Тел: {patientContactPhone} • {patientRegAddress}
							</div>
						</td>
					</tr>
					<tr>
						<td className="p-2.5 bg-slate-100 font-bold text-slate-800 border-r border-slate-300">
							Основание и этап лечения:
						</td>
						<td className="p-2.5 bg-white text-slate-900 border-r border-slate-300 leading-snug">
							Договор № <strong>{actData.contractNumber}</strong> • План лечения
						</td>
						<td className="p-2.5 bg-slate-100 font-bold text-slate-800 border-r border-slate-300">
							№ Медкарты / ID:
						</td>
						<td className="p-2.5 bg-white text-slate-900 font-mono font-bold leading-snug">
							{patientMedCard} (ID: {actData.patientId})
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	);
};
