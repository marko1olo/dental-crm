import React from "react";
import type {
	FastPrintClinicInfo,
	FastPrintDoctorInfo,
	FastPrintPatientInfo,
	FastPrintServiceItem,
	FastPrintPlanStage,
	FastClinicalPrintEngineProps,
} from "./FastClinicalPrintEngine";

function getEffectiveClinic(clinic?: FastPrintClinicInfo): Required<FastPrintClinicInfo> {
	return {
		name: clinic?.name || "Стоматологическая клиника «DENTE»",
		legalName: clinic?.legalName || 'ООО "ДЕНТЕ МЕДИКАЛ ГРУПП"',
		inn: clinic?.inn || "7704123456",
		ogrn: clinic?.ogrn || "1237700123456",
		address: clinic?.address || "г. Москва, ул. Стоматологическая, д. 24, корп. 1",
		phone: clinic?.phone || "+7 (495) 777-88-99",
		licenseNumber: clinic?.licenseNumber || "ЛО41-01137-77/00368421 от 14.02.2023 г.",
	};
}

function getEffectiveDoctor(doctor?: FastPrintDoctorInfo): Required<FastPrintDoctorInfo> {
	return {
		fullName: doctor?.fullName || "Смирнова Елена Александровна",
		specialty: doctor?.specialty || "Врач-стоматолог терапевт",
	};
}

// ── 1. Векторный рендер Формы 043/у ──
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
	const effDoctor = getEffectiveDoctor(doctor);
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

// ── 2. Векторный рендер Акта выполненных работ и кассового чека 54-ФЗ ──
export function RenderActAndReceipt({
	clinic,
	doctor,
	patient,
	services,
	totalAmount,
	fiscalData,
}: {
	clinic: FastPrintClinicInfo;
	doctor: FastPrintDoctorInfo;
	patient: FastPrintPatientInfo;
	services: FastPrintServiceItem[];
	totalAmount: number;
	fiscalData?: FastClinicalPrintEngineProps["fiscalData"];
}) {
	const todayStr = new Date().toLocaleDateString("ru-RU");
	const effClinic = getEffectiveClinic(clinic);
	const effDoctor = getEffectiveDoctor(doctor);
	const effectiveServices: FastPrintServiceItem[] = services.length > 0
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

			{/* Блок товарного чека по 54-ФЗ */}
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

// ── 3. Векторный рендер Сметы плана комплексного лечения ──
export function RenderTreatmentEstimate({
	clinic,
	doctor,
	patient,
	planStages,
	totalAmount,
}: {
	clinic: FastPrintClinicInfo;
	doctor: FastPrintDoctorInfo;
	patient: FastPrintPatientInfo;
	planStages: FastPrintPlanStage[];
	totalAmount: number;
}) {
	const todayStr = new Date().toLocaleDateString("ru-RU");
	const effClinic = getEffectiveClinic(clinic);
	const effDoctor = getEffectiveDoctor(doctor);
	const effectiveStages: FastPrintPlanStage[] = planStages.length > 0
		? planStages
		: [
			{
				title: "Этап 1: Неотложная санация и терапия",
				total: 12500,
				dueDate: "1-2 недели",
				services: [
					{ name: "Лечение глубокого кариеса зуба 16", tooth: "16", price: 4800 },
					{ name: "Эндодонтическое лечение периодонтита 26 (3 канала)", tooth: "26", price: 7700 },
				],
			},
			{
				title: "Этап 2: Профессиональная гигиена и пародонтология",
				total: 6500,
				dueDate: "3 неделя",
				services: [
					{ name: "Комплекс AirFlow + ультразвук обеих челюстей", tooth: "18-48", price: 6500 },
				],
			},
			{
				title: "Этап 3: Ортопедическое восстановление",
				total: 35000,
				dueDate: "4-6 недель",
				services: [
					{ name: "Коронка из диоксида циркония с фиксацией", tooth: "26", price: 35000 },
				],
			},
		];

	const planGrandTotal = effectiveStages.reduce((acc, st) => acc + st.total, 0);

	return (
		<div>
			<div className="fast-print-doc-header">
				<div>
					<div className="fast-print-clinic-title">{effClinic.name}</div>
					<div className="fast-print-sub">Приложение №1 к Договору об оказании медицинских услуг</div>
					<div className="fast-print-sub">Лицензия: {effClinic.licenseNumber}</div>
				</div>
				<div className="text-right fast-print-sub">
					<div>Врач-куратор:</div>
					<div className="font-bold">{effDoctor.fullName}</div>
					<div>Дата: {todayStr}</div>
				</div>
			</div>

			<div className="fast-print-doc-title">
				План комплексного стоматологического лечения и смета расходов
			</div>

			<div style={{ marginBottom: 12, fontSize: 11 }}>
				<strong>Пациент:</strong> {patient.fullName} · <strong>Карта №:</strong> {patient.cardNumber}
			</div>

			{effectiveStages.map((st, idx) => (
				<div key={st.title} className="fast-print-avoid-break" style={{ marginBottom: 12 }}>
					<div style={{ fontWeight: 700, fontSize: 11.5, background: "#f3f4f6", padding: "4px 8px", border: "1px solid #000000", borderBottom: "none" }}>
						{st.title} {st.dueDate ? `· (Плановый срок: ${st.dueDate})` : ""}
					</div>
					<table className="fast-print-table" style={{ margin: 0 }}>
						<thead>
							<tr>
								<th style={{ width: "6%" }}>№</th>
								<th style={{ width: "64%" }}>Процедура / Манипуляция</th>
								<th style={{ width: "10%" }}>Зуб</th>
								<th style={{ width: "20%" }}>Стоимость (₽)</th>
							</tr>
						</thead>
						<tbody>
							{st.services.map((srv, sIdx) => (
								<tr key={srv.name}>
									<td style={{ textAlign: "center" }}>{sIdx + 1}</td>
									<td>{srv.name}</td>
									<td style={{ textAlign: "center" }}>{srv.tooth || "—"}</td>
									<td style={{ textAlign: "right" }}>{srv.price.toLocaleString("ru-RU")} ₽</td>
								</tr>
							))}
							<tr className="fast-print-total-row">
								<td colSpan={3} style={{ textAlign: "right" }}>ИТОГО ЗА ЭТАП:</td>
								<td style={{ textAlign: "right" }}>{st.total.toLocaleString("ru-RU")} ₽</td>
							</tr>
						</tbody>
					</table>
				</div>
			))}

			<div style={{ border: "2px solid #000000", padding: "8px 12px", margin: "14px 0", fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<div style={{ fontWeight: 800 }}>ИТОГОВАЯ СТОИМОСТЬ ВСЕХ ЭТАПОВ ЛЕЧЕНИЯ:</div>
				<div style={{ fontSize: 14, fontWeight: 800 }}>{planGrandTotal.toLocaleString("ru-RU")} ₽</div>
			</div>

			<div style={{ fontSize: 10, color: "#374151", margin: "8px 0" }}>
				С планом лечения и финансовой сметой ознакомлен(а), согласен(на). Возможные альтернативные варианты,
				сроки гарантии и клинические риски разъяснены лечащим врачом в полном объеме.
			</div>

			<div className="fast-print-sign-grid">
				<div>
					<div className="fast-print-sub">Врач-куратор плана:</div>
					<div className="font-bold">{doctor.fullName}</div>
					<div className="fast-print-sign-line" />
					<div className="fast-print-sub text-center">(подпись)</div>
				</div>
				<div>
					<div className="fast-print-sub">Пациент:</div>
					<div className="font-bold">{patient.fullName}</div>
					<div className="fast-print-sign-line" />
					<div className="fast-print-sub text-center">(подпись согласовано)</div>
				</div>
			</div>
		</div>
	);
}
