import React from "react";
import { AlertTriangle, Check } from "lucide-react";

export interface EmkPrintableForm043Props {
	clinicSettings?: any;
	activePatient?: any;
	activeVisit?: any;
	isSignedVisit: boolean;
	doctorName: string;
	visitNoteForm: Record<string, any>;
}

export function EmkPrintableForm043({
	clinicSettings,
	activePatient,
	activeVisit,
	isSignedVisit,
	doctorName,
	visitNoteForm,
}: EmkPrintableForm043Props) {
	return (
		<div id="visit-emk-print-a4" className="print-layer hidden print:block font-sans text-slate-900 bg-white p-6">
			{/* Шапка клиники */}
			<div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-start justify-between gap-4">
				<div>
					<div className="text-base font-black text-slate-900 uppercase tracking-tight">
						{clinicSettings?.profile?.brandName || "Стоматологическая клиника «DENTE»"}
					</div>
					<div className="text-xs font-semibold text-slate-700">
						{clinicSettings?.profile?.legalName || clinicSettings?.profile?.brandName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}
						{clinicSettings?.profile?.medicalLicenseNumber
							? ` • Лицензия № ${clinicSettings.profile.medicalLicenseNumber}`
							: ""}
					</div>
					<div className="text-[11px] text-slate-500">
						{[
							clinicSettings?.profile?.address,
							clinicSettings?.profile?.phone ? `Тел: ${clinicSettings.profile.phone}` : "",
						]
							.filter(Boolean)
							.join(" • ")}
					</div>
					<h1 className="text-lg font-black tracking-tight text-slate-950 uppercase mt-2">
						МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА (Форма № 043/у)
					</h1>
					<p className="text-xs font-semibold text-slate-600">
						Дневник приёма и протокол лечения • Утверждена Приказом Минздрава России от 15.12.2014 № 834н
					</p>
				</div>
				<div className="text-right text-xs shrink-0">
					<div className="font-bold text-slate-900">
						№ Карты:{" "}
						{activePatient?.cardNumber ||
							activePatient?.medicalCardNumber ||
							activePatient?.id?.slice(0, 8) ||
							"СТ-2026-0843"}
					</div>
					<div className="text-slate-600">
						Дата приёма: {activeVisit?.date || new Date().toLocaleDateString("ru-RU")}
					</div>
					<div className="text-slate-600">
						Время: {activeVisit?.time || new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
					</div>
					{isSignedVisit ? (
						<div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 border-2 border-emerald-700 rounded text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50">
							<Check className="w-3.5 h-3.5 stroke-[3]" />
							<span>ПОДПИСАНО ВРАЧОМ</span>
						</div>
					) : (
						<div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 border-2 border-amber-600 rounded text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-50">
							<AlertTriangle className="w-3.5 h-3.5" />
							<span>ЧЕРНОВИК • НЕ ПОДПИСАНО</span>
						</div>
					)}
				</div>
			</div>

			{!isSignedVisit && (
				<div className="mb-3 py-1.5 px-3 bg-amber-50 border border-amber-300 rounded text-[11px] text-amber-900 font-semibold flex items-center justify-between">
					<span className="flex items-center gap-1.5">
						<AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
						<span>СТАТУС ДОКУМЕНТА: ЧЕРНОВИК (ПРИЁМ НЕ ЗАКРЫТ).</span>
					</span>
					<span className="text-[10px] text-amber-700">Юридической силы без подписи врача не имеет</span>
				</div>
			)}

			{/* Таблица паспортных данных */}
			<table
				className="w-full border-collapse text-left text-xs border border-slate-300 mb-4"
				style={{ pageBreakInside: "avoid", breakInside: "avoid" }}
			>
				<tbody>
					<tr className="border-b border-slate-300">
						<td className="py-1.5 px-2 font-bold bg-slate-100 border-r border-slate-300 w-1/4">Пациент (ФИО):</td>
						<td className="py-1.5 px-2 font-bold text-slate-950 border-r border-slate-300 w-1/4">
							{activePatient?.fullName || "—"}
						</td>
						<td className="py-1.5 px-2 font-bold bg-slate-100 border-r border-slate-300 w-1/4">
							Дата рождения / Возраст:
						</td>
						<td className="py-1.5 px-2 border-slate-300 w-1/4">
							{activePatient?.birthDate || "—"}{" "}
							{activePatient?.gender ? `(${activePatient.gender === "female" ? "Жен." : "Муж."})` : ""}
						</td>
					</tr>
					<tr className="border-b border-slate-300">
						<td className="py-1.5 px-2 font-bold bg-slate-100 border-r border-slate-300">СНИЛС:</td>
						<td className="py-1.5 px-2 border-r border-slate-300">
							{activePatient?.administrativeProfile?.snils || activePatient?.snils || "—"}
						</td>
						<td className="py-1.5 px-2 font-bold bg-slate-100 border-r border-slate-300">Полис ОМС / ДМС:</td>
						<td className="py-1.5 px-2 border-slate-300">
							{activePatient?.administrativeProfile?.omsPolis || activePatient?.omsPolis || "—"}
						</td>
					</tr>
					<tr className="border-b border-slate-300">
						<td className="py-1.5 px-2 font-bold bg-slate-100 border-r border-slate-300">Контактный телефон:</td>
						<td className="py-1.5 px-2 border-r border-slate-300">{activePatient?.phone || "—"}</td>
						<td className="py-1.5 px-2 font-bold bg-slate-100 border-r border-slate-300">Лечащий врач:</td>
						<td className="py-1.5 px-2 font-bold text-slate-900 border-slate-300">{doctorName}</td>
					</tr>
				</tbody>
			</table>

			{/* Структурированная таблица протокола 043/у */}
			<div className="space-y-3" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
				{/* I. Жалобы и анамнез */}
				<div className="border border-slate-300 rounded-md overflow-hidden" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
					<div className="bg-slate-100 px-3 py-1.5 font-bold text-xs uppercase tracking-wide border-b border-slate-300 text-blue-900 flex items-center gap-1.5">
						<span>I. Жалобы и анамнез заболевания</span>
					</div>
					<div className="p-2.5 text-xs text-slate-900 space-y-1.5">
						<div>
							<strong>Жалобы:</strong>{" "}
							{visitNoteForm?.complaint || "Жалоб на момент осмотра активно не предъявляет (плановый осмотр)."}
						</div>
						{visitNoteForm?.anamnesis && (
							<div>
								<strong>Анамнез заболевания и жизни (Anamnesis morbi & vitae):</strong>{" "}
								{visitNoteForm.anamnesis}
							</div>
						)}
					</div>
				</div>

				{/* II. Объективный статус */}
				<div className="border border-slate-300 rounded-md overflow-hidden" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
					<div className="bg-slate-100 px-3 py-1.5 font-bold text-xs uppercase tracking-wide border-b border-slate-300 text-purple-900 flex items-center gap-1.5">
						<span>II. Данные объективного исследования (Status localis)</span>
					</div>
					<div className="p-2.5 text-xs text-slate-900 whitespace-pre-wrap">
						{visitNoteForm?.objectiveStatus ||
							"Слизистая оболочка полости рта физиологической окраски, влажная. Регионарные лимфатические узлы не увеличены, безболезненны при пальпации. Прикус ортогнатический."}
					</div>
				</div>

				{/* III. Диагноз */}
				<div className="border border-slate-300 rounded-md overflow-hidden" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
					<div className="bg-slate-100 px-3 py-1.5 font-bold text-xs uppercase tracking-wide border-b border-slate-300 text-amber-900 flex items-center gap-1.5">
						<span>III. Диагноз по МКБ-10</span>
					</div>
					<div className="p-2.5 text-xs text-slate-900 font-bold">
						{visitNoteForm?.diagnosis || "Z01.2 Стоматологическое обследование"}
					</div>
				</div>

				{/* IV. Дневник лечения */}
				<div className="border border-slate-300 rounded-md overflow-hidden" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
					<div className="bg-slate-100 px-3 py-1.5 font-bold text-xs uppercase tracking-wide border-b border-slate-300 text-slate-900 flex items-center gap-1.5">
						<span>IV. Дневник лечения и рекомендации</span>
					</div>
					<div className="p-2.5 text-xs text-slate-900 whitespace-pre-wrap">
						{visitNoteForm?.treatmentPlan ||
							"Проведен осмотр полости рта, консультация, составлен предварительный план терапевтического лечения. Даны рекомендации по гигиене."}
					</div>
				</div>
			</div>

			{/* Блок подписи врача и печати */}
			<div
				className="mt-8 pt-4 border-t-2 border-slate-300 flex items-end justify-between text-xs text-slate-800"
				style={{ pageBreakInside: "avoid", breakInside: "avoid" }}
			>
				<div className="space-y-1">
					<div>
						Врач-стоматолог: _________________________ / <strong>{doctorName}</strong>
					</div>
					<div className="text-[10px] text-slate-500">(подпись и личная печать врача)</div>
				</div>

				{/* Круглая печать («М.П. Клиники») */}
				<div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-400 flex flex-col items-center justify-center text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
					<span>М.П.</span>
					<span className="text-[8px] font-normal">Клиники</span>
				</div>

				<div className="space-y-1 text-right">
					<div>
						Пациент: _________________________ / <strong>{activePatient?.fullName || "_________________________"}</strong>
					</div>
					<div className="text-[10px] text-slate-500">(с диагнозом и объемом оказанной помощи ознакомлен)</div>
				</div>
			</div>

			{!isSignedVisit ? (
				<div className="mt-4 text-[10px] text-amber-800 italic border-t border-amber-300 pt-2 text-center">
					Документ распечатан в статусе «ЧЕРНОВИК». Окончательный юридический статус наступает после завершения приёма и подписания карты врачом.
				</div>
			) : (
				<div className="mt-4 text-[10px] text-emerald-800 font-medium border-t border-emerald-300 pt-2 text-center">
					Документ подписан лечащим врачом в медицинской информационной системе клиники.
				</div>
			)}
		</div>
	);
}
