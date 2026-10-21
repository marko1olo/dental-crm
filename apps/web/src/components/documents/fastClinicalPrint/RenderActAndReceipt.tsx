import React from "react";
import type {
	FastPrintClinicInfo,
	FastPrintDoctorInfo,
	FastPrintPatientInfo,
	FastPrintServiceItem,
	FastClinicalPrintEngineProps,
} from "../FastClinicalPrintEngine";
import { getEffectiveClinic, getEffectiveDoctor } from "./helpers";

export function RenderActAndReceipt({
	clinic,
	doctor,
	patient,
	services,
	totalAmount: _totalAmount,
	fiscalData,
}: {
	clinic: FastPrintClinicInfo;
	doctor?: FastPrintDoctorInfo | undefined;
	patient: FastPrintPatientInfo;
	services?: FastPrintServiceItem[] | undefined;
	totalAmount: number;
	fiscalData?: FastClinicalPrintEngineProps["fiscalData"];
}) {
	const todayStr = new Date().toLocaleDateString("ru-RU");
	const effClinic = getEffectiveClinic(clinic);
	const effDoctor = getEffectiveDoctor(doctor);
	const effectiveServices: FastPrintServiceItem[] = (services && services.length > 0)
		? services
		: [
			{ code: "A16.07.002.001", name: "Восстановление зуба пломбой с нарушением формы (глубокий кариес)", tooth: "16", quantity: 1, price: 3800, amount: 3800 },
			{ code: "B01.064.004", name: "Местная анестезия инфильтрационная (Артикаин 1:100000)", tooth: "16", quantity: 1, price: 650, amount: 650 },
			{ code: "A16.07.091", name: "Применение коффердама (раббердама) изоляция операционного поля", tooth: "16", quantity: 1, price: 350, amount: 350 },
		];
	const computedTotal = effectiveServices.reduce((s, i) => s + (i.amount || i.price * i.quantity), 0);

	return (
		<div>
			<div className="fast-print-doc-header">
				<div>
					<div className="fast-print-clinic-title">{effClinic.name}</div>
					<div className="fast-print-sub">Исполнитель: {effClinic.legalName} · ИНН {effClinic.inn} / ОГРН {effClinic.ogrn}</div>
					<div className="fast-print-sub">Лицензия: {effClinic.licenseNumber}</div>
				</div>
				<div className="text-right fast-print-sub">
					<div>Приложение к Договору ПМУ</div>
					<div className="font-bold">ПП РФ № 736</div>
					<div>от {todayStr}</div>
				</div>
			</div>

			<div className="fast-print-doc-title">
				Акт сдачи-приемки оказанных медицинских услуг № {fiscalData?.receiptNumber || "А-1049"}
			</div>

			<div style={{ marginBottom: 10, fontSize: 11 }}>
				<strong>Заказчик (Пациент):</strong> {patient.fullName}, тел. {patient.phone}
			</div>

			<table className="fast-print-table">
				<thead>
					<tr>
						<th style={{ width: "5%" }}>№</th>
						<th style={{ width: "15%" }}>Код (804н)</th>
						<th style={{ width: "45%" }}>Наименование медицинской услуги</th>
						<th style={{ width: "8%" }}>Зуб</th>
						<th style={{ width: "7%" }}>Кол.</th>
						<th style={{ width: "10%" }}>Цена (₽)</th>
						<th style={{ width: "10%" }}>Сумма (₽)</th>
					</tr>
				</thead>
				<tbody>
					{effectiveServices.map((item, idx) => (
						<tr key={item.code || item.name || idx}>
							<td style={{ textAlign: "center" }}>{idx + 1}</td>
							<td style={{ fontSize: 10 }}>{item.code || "—"}</td>
							<td>{item.name}</td>
							<td style={{ textAlign: "center" }}>{item.tooth || "—"}</td>
							<td style={{ textAlign: "center" }}>{item.quantity}</td>
							<td style={{ textAlign: "right" }}>{item.price.toLocaleString("ru-RU")}</td>
							<td style={{ textAlign: "right", fontWeight: 600 }}>{(item.amount || item.price * item.quantity).toLocaleString("ru-RU")}</td>
						</tr>
					))}
					<tr className="fast-print-total-row">
						<td colSpan={6} style={{ textAlign: "right" }}>ИТОГО К ОПЛАТЕ:</td>
						<td style={{ textAlign: "right" }}>{computedTotal.toLocaleString("ru-RU")} ₽</td>
					</tr>
				</tbody>
			</table>

			<div style={{ border: "1px dashed #000000", padding: 8, margin: "12px 0", fontSize: 10.5 }}>
				<div style={{ fontWeight: 700, marginBottom: 4 }}>СПРАВКА О ФИСКАЛЬНОМ РАСЧЕТЕ ПО 54-ФЗ:</div>
				<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
					<div>Признак расчета: <strong>Приход (Полный расчет)</strong></div>
					<div>Форма оплаты: <strong>{fiscalData?.paymentType === "sbp" ? "Безналичными (СБП)" : fiscalData?.paymentType === "cash" ? "Наличными" : "Банковская карта (POS)"}</strong></div>
					<div>СНО: <strong>УСН Доходы (без НДС)</strong></div>
					<div>ФПД / Фискальный признак: <strong>{fiscalData?.fiscalSign || "3892019482"}</strong></div>
				</div>
			</div>

			<div style={{ fontSize: 10, color: "#374151", margin: "8px 0" }}>
				Вышеперечисленные услуги оказаны в полном объеме, надлежащего качества и в установленный срок.
				Пациент претензий по объему, качеству и стоимости оказанных услуг не имеет.
			</div>

			<div className="fast-print-sign-grid">
				<div>
					<div className="fast-print-sub">Исполнитель: {effClinic.name}</div>
					<div className="font-bold">{effDoctor.fullName} ({effDoctor.specialty})</div>
					<div className="fast-print-sign-line" />
					<div className="fast-print-sub text-center">(подпись / М.П.)</div>
				</div>
				<div>
					<div className="fast-print-sub">Заказчик (Пациент):</div>
					<div className="font-bold">{patient.fullName}</div>
					<div className="fast-print-sign-line" />
					<div className="fast-print-sub text-center">(подпись)</div>
				</div>
			</div>
		</div>
	);
}
