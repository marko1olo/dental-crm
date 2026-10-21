import React from "react";
import type {
	FastClinicalPrintEngineProps,
	FastPrintClinicInfo,
	FastPrintDoctorInfo,
	FastPrintPatientInfo,
	FastPrintServiceItem,
} from "../FastClinicalPrintEngine";
import { FastPrintServicesTable } from "./FastPrintServicesTable";
import { FastPrintSignGrid } from "./FastPrintSignGrid";
import { getEffectiveClinic, getEffectiveDoctor } from "./helpers";
import { RenderFiscalCalculationBox } from "./RenderFiscalCalculationBox";

export function RenderActAndReceipt({
	clinic,
	doctor,
	patient,
	services,
	fiscalData,
}: {
	clinic: FastPrintClinicInfo;
	doctor?: FastPrintDoctorInfo | undefined;
	patient: FastPrintPatientInfo;
	services?: FastPrintServiceItem[] | undefined;
	totalAmount: number;
	fiscalData?: FastClinicalPrintEngineProps["fiscalData"];
}): React.JSX.Element {
	const todayStr = new Date().toLocaleDateString("ru-RU");
	const effClinic = getEffectiveClinic(clinic);
	const effDoctor = getEffectiveDoctor(doctor);
	const effectiveServices: FastPrintServiceItem[] =
		services && services.length > 0
			? services
			: [
					{
						code: "A16.07.002.001",
						name: "Восстановление зуба пломбой (глубокий кариес)",
						tooth: "16",
						quantity: 1,
						price: 3800,
						amount: 3800,
					},
					{
						code: "B01.064.004",
						name: "Местная анестезия инфильтрационная (Артикаин)",
						tooth: "16",
						quantity: 1,
						price: 650,
						amount: 650,
					},
					{
						code: "A16.07.091",
						name: "Применение коффердама (изоляция поля)",
						tooth: "16",
						quantity: 1,
						price: 350,
						amount: 350,
					},
				];
	const computedTotal = effectiveServices.reduce(
		(s, i) => s + (i.amount || i.price * i.quantity),
		0,
	);

	return (
		<div>
			<div className="fast-print-doc-header">
				<div>
					<div className="fast-print-clinic-title">{effClinic.name}</div>
					<div className="fast-print-sub">
						Исполнитель: {effClinic.legalName} · ИНН {effClinic.inn} / ОГРН{" "}
						{effClinic.ogrn}
					</div>
					<div className="fast-print-sub">
						Лицензия: {effClinic.licenseNumber}
					</div>
				</div>
				<div className="text-right fast-print-sub">
					<div>Приложение к Договору ПМУ</div>
					<div className="font-bold">Акт выполненных работ</div>
					<div>от {todayStr}</div>
				</div>
			</div>

			<div className="fast-print-doc-title">
				Акт сдачи-приемки оказанных медицинских услуг №{" "}
				{fiscalData?.receiptNumber || "А-1049"}
			</div>

			<div style={{ marginBottom: 10, fontSize: 11 }}>
				<strong>Заказчик (Пациент):</strong> {patient.fullName}, тел.{" "}
				{patient.phone}
			</div>

			<FastPrintServicesTable
				effectiveServices={effectiveServices}
				computedTotal={computedTotal}
			/>

			<RenderFiscalCalculationBox fiscalData={fiscalData} />

			<div style={{ fontSize: 10, color: "#374151", margin: "8px 0" }}>
				Вышеперечисленные услуги оказаны в полном объеме, надлежащего качества и
				в установленный срок. Пациент претензий по объему, качеству и стоимости
				оказанных услуг не имеет.
			</div>

			<FastPrintSignGrid
				clinicName={effClinic.name}
				doctorFullName={effDoctor.fullName}
				doctorSpecialty={effDoctor.specialty}
				patientFullName={patient.fullName}
			/>
		</div>
	);
}
