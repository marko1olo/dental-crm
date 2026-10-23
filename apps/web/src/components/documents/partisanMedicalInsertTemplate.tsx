import React from "react";
import { Scissors } from "lucide-react";
import {
	type InsertCutLayout,
	type PartisanInsert043uProps,
	calculateAge,
	PartisanInsertHeader,
	PartisanMetaTable,
	PartisanClinicalTable,
	PartisanSignatures,
} from "./partisanInsert/index";

export type { InsertCutLayout, PartisanInsert043uProps };

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
				<div className="partisan-glue-margin" title="Поле для вклейки в амбулаторную карту">
					<span className="partisan-glue-label">Зона вклейки в медицинскую карту (15 мм)</span>
				</div>

				<div className="partisan-insert-content">
					<PartisanInsertHeader clinic={clinic} />
					<PartisanMetaTable
						patient={patient}
						todayDateStr={todayDateStr}
						todayTimeStr={todayTimeStr}
						ageStr={ageStr}
					/>
					<PartisanClinicalTable
						toothDisplay={toothDisplay}
						cavityLocalization={cavityLocalization}
						diagnosisText={diagnosisText}
						complaintsText={complaintsText}
						objectiveText={objectiveText}
						treatmentText={treatmentText}
						recommendationsText={recommendationsText}
						warrantyText={warrantyText}
					/>
					<PartisanSignatures doctor={doctor} patient={patient} />
				</div>
			</div>

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
