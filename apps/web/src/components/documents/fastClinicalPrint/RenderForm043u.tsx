import React from "react";
import type {
	FastPrintClinicInfo,
	FastPrintDoctorInfo,
	FastPrintPatientInfo,
	FastClinicalPrintEngineProps,
} from "../FastClinicalPrintEngine";
import { getEffectiveClinic, getEffectiveDoctor } from "./helpers";

export function RenderForm043u({
	clinic,
	doctor,
	patient,
	visitData,
}: {
	clinic: FastPrintClinicInfo;
	doctor: FastPrintDoctorInfo;
	patient: FastPrintPatientInfo;
	visitData?: FastClinicalPrintEngineProps["visitData"];
}) {
	const todayStr = new Date().toLocaleDateString("ru-RU");
	const effClinic = getEffectiveClinic(clinic);

	return (
		<div>
			<div className="fast-print-doc-header">
				<div>
					<div className="fast-print-clinic-title">{effClinic.name}</div>
					<div className="fast-print-sub">{effClinic.legalName} · ОГРН {effClinic.ogrn} · ИНН {effClinic.inn}</div>
					<div className="fast-print-sub">Лицензия: {effClinic.licenseNumber}</div>
					<div className="fast-print-sub">Адрес: {effClinic.address} · Тел: {effClinic.phone}</div>
				</div>
				<div className="text-right fast-print-sub">
					<div>Медицинская документация</div>
					<div className="font-bold">Форма № 043/у</div>
					<div>Утв. приказом Минздрава СССР №1030</div>
				</div>
			</div>

			<div className="fast-print-doc-title">
				Медицинская карта стоматологического больного № {patient.cardNumber}
			</div>

			<table className="fast-print-table">
				<tbody>
					<tr>
						<td style={{ width: "25%", fontWeight: 700 }}>Ф.И.О. пациента:</td>
						<td style={{ width: "45%" }}>{patient.fullName}</td>
						<td style={{ width: "15%", fontWeight: 700 }}>Дата рожд.:</td>
						<td style={{ width: "15%" }}>{patient.birthDate}</td>
					</tr>
					<tr>
						<td style={{ fontWeight: 700 }}>Адрес / Телефон:</td>
						<td>{patient.address} · {patient.phone}</td>
						<td style={{ fontWeight: 700 }}>Дата карты:</td>
						<td>{todayStr}</td>
					</tr>
					<tr>
						<td style={{ fontWeight: 700 }}>Аллергоанамнез:</td>
						<td colSpan={3}>{patient.allergies}</td>
					</tr>
					<tr>
						<td style={{ fontWeight: 700 }}>Соматический статус:</td>
						<td colSpan={3}>{patient.somaticNotes}</td>
					</tr>
				</tbody>
			</table>

			<div style={{ marginTop: 14, fontWeight: 700, textTransform: "uppercase", fontSize: 12 }}>
				Дневник стоматологического приёма (первичный осмотр)
			</div>

			<table className="fast-print-table">
				<tbody>
					<tr>
						<td style={{ width: "25%", fontWeight: 700 }}>Дата и время:</td>
						<td>{visitData?.date || todayStr}</td>
						<td style={{ width: "20%", fontWeight: 700 }}>Зуб / Сегмент:</td>
						<td>{visitData?.toothNumber ? `Зуб №${visitData.toothNumber}` : "Санация полости рта"}</td>
					</tr>
					<tr>
						<td style={{ fontWeight: 700 }}>Жалобы:</td>
						<td colSpan={3}>{visitData?.complaints || "На кратковременные боли от температурных раздражителей (холодное), попадание пищи."}</td>
					</tr>
					<tr>
						<td style={{ fontWeight: 700 }}>Объективные данные:</td>
						<td colSpan={3}>{visitData?.objective || "Слизистая оболочка бледно-розовая, умеренно увлажнена. Глубокая кариозная полость, зондирование болезненно по дну."}</td>
					</tr>
					<tr>
						<td style={{ fontWeight: 700 }}>Диагноз (МКБ-10):</td>
						<td colSpan={3}><strong>{visitData?.diagnosis || "K02.1 Кариес дентина (хронический глубокий кариес)"}</strong></td>
					</tr>
					<tr>
						<td style={{ fontWeight: 700 }}>Проведённое лечение:</td>
						<td colSpan={3}>{visitData?.treatment || "Препарирование кариозной полости под водяным охлаждением. Изоляция раббердамом. Медобработка 2% хлоргексидином. Лечебная прокладка Life, изолирующая прокладка СИЦ. Послойная реставрация нанокомпозитом Filtek Ultimate. Шлифовка, полировка."}</td>
					</tr>
					<tr>
						<td style={{ fontWeight: 700 }}>Рекомендации:</td>
						<td colSpan={3}>{visitData?.recommendations || "Воздержаться от красящей пищи 2 часа. Гигиена полости рта 2 раза в день. Контрольный осмотр через 6 месяцев."}</td>
					</tr>
				</tbody>
			</table>

			<div className="fast-print-sign-grid">
				<div>
					<div className="fast-print-sub">Лечащий врач:</div>
					<div className="font-bold">{doctor.fullName} ({doctor.specialty})</div>
					<div className="fast-print-sign-line" />
					<div className="fast-print-sub text-center">(подпись врача / личная печать)</div>
				</div>
				<div>
					<div className="fast-print-sub">Пациент:</div>
					<div className="font-bold">{patient.fullName}</div>
					<div className="fast-print-sign-line" />
					<div className="fast-print-sub text-center">(подпись ознакомлен)</div>
				</div>
			</div>
		</div>
	);
}
