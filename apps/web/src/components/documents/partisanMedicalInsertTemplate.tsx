import React from "react";
import { Scissors, ShieldCheck, Stethoscope } from "lucide-react";
import type {
	FastPrintClinicInfo,
	FastPrintDoctorInfo,
	FastPrintPatientInfo,
	FastClinicalPrintEngineProps,
} from "./FastClinicalPrintEngine";

export type InsertCutLayout = "a4_cut" | "a5_direct";

export interface PartisanInsert043uProps {
	clinic: FastPrintClinicInfo;
	doctor?: FastPrintDoctorInfo | undefined;
	patient: FastPrintPatientInfo;
	visitData?: FastClinicalPrintEngineProps["visitData"];
	cutLayout?: InsertCutLayout;
}

function calculateAge(birthDateStr?: string | null): string {
	if (!birthDateStr) return "37 лет";
	const parts = birthDateStr.split(".");
	if (parts.length === 3) {
		const year = parseInt(parts[2] ?? "", 10);
		if (!isNaN(year) && year > 1900) {
			const age = new Date().getFullYear() - year;
			return `${age} лет`;
		}
	}
	return "37 лет";
}

export function RenderPartisanInsert043u({
	clinic,
	doctor,
	patient,
	visitData,
	cutLayout = "a4_cut",
}: PartisanInsert043uProps) {
	const todayDateStr = visitData?.date || new Date().toLocaleDateString("ru-RU");
	const todayTimeStr = visitData?.time || "14:30";
	const ageStr = calculateAge(patient.birthDate);

	const complaintsText =
		visitData?.complaints ||
		"Кратковременные боли от термических раздражителей (холодное), застревание пищи в межзубном промежутке.";

	const objectiveText =
		visitData?.objective ||
		"Прикус ортогнатический. Слизистая бледно-розовая, влажная. Зуб #46: на жевательно-медиальной поверхности глубокая кариозная полость с размягченным дентином. Зондирование болезненно по дну. Термопроба положительна (3–5 сек). Перкуссия безболезненна. ЭОД — 8 мкА.";

	const toothDisplay = visitData?.toothNumber
		? `#${visitData.toothNumber} (FDI ${visitData.toothNumber})`
		: "#46 (FDI 46)";
	const cavityLocalization =
		visitData?.cavityLocalization || "Окклюзионно-медиальная (MOD / Класс II по Блэку)";
	const diagnosisText =
		visitData?.diagnosis || "K02.1 Кариес дентина (хронический глубокий кариес)";

	const treatmentText =
		visitData?.treatment ||
		"1. Анестезия: проводниковая (торусальная) Sol. Articaini 4% (1:100 000) — 1.7 мл. 2. Изоляция: коффердам (OptiDam, кламп W8A). 3. Препарирование: некрэктомия под водяным охлаждением до плотного дентина, фальц эмали. 4. Антисептика: 2% р-р хлоргексидина биглюконата. 5. Прокладка: лечебная Life (Ca(OH)2), изолирующая СИЦ Vitrebond. 6. Адгезив: травление эмали 37% H3PO4 15 с, OptiBond FL, свет 20 с. 7. Пломба: послойная реставрация нанокомпозитом Filtek Ultimate (A3B/A3E). 8. Финиш: коррекция по прикусу (копирка 40 мкм), шлифовка, полировка Sof-Lex и Prisma Gloss.";

	const recommendationsText =
		visitData?.recommendations ||
		"Воздержаться от приёма пищи 1.5–2 часа (до окончания действия анестезии). Ограничить красящие продукты на 24 часа. Контрольный осмотр через 6 месяцев.";

	const warrantyText =
		visitData?.warrantyPeriod || "12 месяцев (1 год) при соблюдении гигиены и профосмотров";

	return (
		<div
			className={`partisan-insert-container ${cutLayout === "a5_direct" ? "layout-a5-direct" : "layout-a4-cut"}`}
			data-testid="partisan-medical-insert-043u"
		>
			<div className="partisan-insert-sheet">
				{/* Левое поле подшивки / вклейки 15 мм */}
				<div className="partisan-glue-margin" title="Поле для вклейки в амбулаторную карту">
					<span className="partisan-glue-label">Зона вклейки в медицинскую карту (15 мм)</span>
				</div>

				<div className="partisan-insert-content">
					{/* Юридическая шапка с реквизитами клиники-арендодателя */}
					<div className="partisan-header-row">
						<div className="partisan-clinic-requisites">
							<div className="partisan-clinic-name">{clinic.name}</div>
							<div className="partisan-clinic-sub">
								{clinic.legalName} · ИНН {clinic.inn} · ОГРН {clinic.ogrn}
							</div>
							<div className="partisan-clinic-sub">
								Лицензия: {clinic.licenseNumber} · {clinic.address} · {clinic.phone}
							</div>
						</div>
						<div className="partisan-legal-badge">
							<div className="partisan-badge-minzdrav">Минздрав РФ</div>
							<div className="partisan-badge-form">Медицинская карта приёма</div>
							<div className="partisan-badge-order">Стандарты СтАР</div>
						</div>
					</div>

					{/* Заголовок вкладыша */}
					<div className="partisan-document-title">
						ВКЛАДЫШ В МЕДИЦИНСКУЮ КАРТУ СТОМАТОЛОГИЧЕСКОГО БОЛЬНОГО
					</div>

					{/* Паспортная и анамнестическая таблица */}
					<table className="partisan-meta-table">
						<tbody>
							<tr>
								<td className="partisan-cell-label">Пациент (Ф.И.О.):</td>
								<td className="partisan-cell-val">
									<strong>{patient.fullName}</strong>
								</td>
								<td className="partisan-cell-label">Дата рожд.:</td>
								<td className="partisan-cell-val">
									{patient.birthDate} ({ageStr})
								</td>
							</tr>
							<tr>
								<td className="partisan-cell-label">Карта / ID:</td>
								<td className="partisan-cell-val">
									<strong>№ {patient.cardNumber}</strong>
								</td>
								<td className="partisan-cell-label">Дата и время:</td>
								<td className="partisan-cell-val">
									<strong>
										{todayDateStr}, {todayTimeStr}
									</strong>
								</td>
							</tr>
							<tr>
								<td className="partisan-cell-label">Аллергоанамнез:</td>
								<td colSpan={3} className="partisan-cell-val partisan-allergy-text">
									{patient.allergies ||
										"Не отягощен (непереносимость местных анестетиков и антибиотиков отрицает)"}
								</td>
							</tr>
							<tr>
								<td className="partisan-cell-label">Соматический анамнез:</td>
								<td colSpan={3} className="partisan-cell-val">
									{patient.somaticNotes ||
										"Соматически здоров, хронические заболевания в стадии компенсации"}
								</td>
							</tr>
						</tbody>
					</table>

					{/* Клинический дневник приёма (SOAP) */}
					<div className="partisan-section-bar">
						<Stethoscope size={12} className="partisan-section-icon" />
						<span>ПРОТОКОЛ СТОМАТОЛОГИЧЕСКОГО ПРИЁМА (SOAP / 834н)</span>
					</div>

					<table className="partisan-meta-table">
						<tbody>
							<tr>
								<td className="partisan-cell-label">Зуб (FDI):</td>
								<td className="partisan-cell-val">
									<span className="partisan-fdi-badge">{toothDisplay}</span>
								</td>
								<td className="partisan-cell-label">Поверхность:</td>
								<td className="partisan-cell-val">
									<strong>{cavityLocalization}</strong>
								</td>
							</tr>
							<tr>
								<td className="partisan-cell-label">Диагноз (МКБ-10):</td>
								<td colSpan={3} className="partisan-cell-val">
									<div className="partisan-diagnosis-box">
										<strong>{diagnosisText}</strong>
									</div>
								</td>
							</tr>
							<tr>
								<td className="partisan-cell-label">Жалобы (S):</td>
								<td colSpan={3} className="partisan-cell-val">
									{complaintsText}
								</td>
							</tr>
							<tr>
								<td className="partisan-cell-label">Status Localis (O):</td>
								<td colSpan={3} className="partisan-cell-val">
									{objectiveText}
								</td>
							</tr>
							<tr>
								<td className="partisan-cell-label">Проведённое лечение (P):</td>
								<td colSpan={3} className="partisan-cell-val">
									{treatmentText}
								</td>
							</tr>
							<tr>
								<td className="partisan-cell-label">Рекомендации:</td>
								<td colSpan={3} className="partisan-cell-val">
									{recommendationsText}
								</td>
							</tr>
							<tr>
								<td className="partisan-cell-label">Гарантийный срок:</td>
								<td colSpan={3} className="partisan-cell-val">
									<div className="partisan-warranty-row">
										<ShieldCheck size={12} className="partisan-warranty-icon" />
										<strong>{warrantyText}</strong>
									</div>
								</td>
							</tr>
						</tbody>
					</table>

					{/* Подписи лечащего врача и пациента */}
					<div className="partisan-signature-row">
						<div className="partisan-sign-block">
							<div className="partisan-sign-role">
								Лечащий врач: <strong>{doctor.fullName}</strong> ({doctor.specialty})
							</div>
							<div className="partisan-sign-line" />
							<div className="partisan-sign-caption">(подпись / личная печать врача)</div>
						</div>
						<div className="partisan-sign-block">
							<div className="partisan-sign-role">
								Пациент (с планом и лечением ознакомлен): <strong>{patient.fullName}</strong>
							</div>
							<div className="partisan-sign-line" />
							<div className="partisan-sign-caption">(личная подпись пациента)</div>
						</div>
					</div>
				</div>
			</div>

			{/* Линия отреза ножницами для вклейки в бумажную карту 043/у */}
			{cutLayout === "a4_cut" && (
				<div className="fast-print-cut-line" data-testid="cut-line-indicator">
					<Scissors size={13} className="cut-icon" />
					<span className="cut-text">
						---------------- Линия отреза для вклейки в медицинскую карту ----------------
					</span>
					<Scissors size={13} className="cut-icon" />
				</div>
			)}
		</div>
	);
}
