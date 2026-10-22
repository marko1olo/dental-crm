import React from "react";
import type {
	FastClinicalPrintEngineProps,
	FastPrintClinicInfo,
	FastPrintDoctorInfo,
	FastPrintPatientInfo,
} from "../FastClinicalPrintEngine";
import { getEffectiveClinic, getEffectiveDoctor } from "./helpers";
import { RenderForm043uVisitTable } from "./RenderForm043uVisitTable";

export function RenderForm043u({
	clinic,
	doctor,
	patient,
	visitData,
}: {
	clinic: FastPrintClinicInfo;
	doctor?: FastPrintDoctorInfo | undefined;
	patient: FastPrintPatientInfo;
	visitData?: FastClinicalPrintEngineProps["visitData"];
}): React.JSX.Element {
	const todayStr = new Date().toLocaleDateString("ru-RU");
	const effClinic = getEffectiveClinic(clinic);
	const effDoctor = getEffectiveDoctor(doctor);

	return (
		<div>
			<div className="fast-print-doc-header">
				<div>
					<div className="fast-print-clinic-title">{effClinic.name}</div>
					<div className="fast-print-sub">
						{effClinic.legalName} · ОГРН {effClinic.ogrn} · ИНН {effClinic.inn}
					</div>
					<div className="fast-print-sub">
						Лицензия: {effClinic.licenseNumber}
					</div>
					<div className="fast-print-sub">
						Адрес: {effClinic.address} · Тел: {effClinic.phone}
					</div>
				</div>
				<div className="text-right fast-print-sub">
					<div>Медицинская документация</div>
					<div className="font-bold">Медицинская карта приёма</div>
					<div>Электронная медицинская карта</div>
				</div>
			</div>

			<div className="fast-print-doc-title">
				Медицинская карта приёма стоматологического пациента № {patient.cardNumber}
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
						<td>
							{patient.address} · {patient.phone}
						</td>
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

			<div
				style={{
					marginTop: 14,
					fontWeight: 700,
					textTransform: "uppercase",
					fontSize: 12,
				}}
			>
				Дневник стоматологического приёма (первичный осмотр)
			</div>

			<RenderForm043uVisitTable todayStr={todayStr} visitData={visitData} />

			<div className="fast-print-sign-grid">
				<div>
					<div className="fast-print-sub">Лечащий врач:</div>
					<div className="font-bold">
						{effDoctor.fullName} ({effDoctor.specialty})
					</div>
					<div className="fast-print-sign-line" />
					<div className="fast-print-sub text-center">
						(подпись врача / личная печать)
					</div>
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
