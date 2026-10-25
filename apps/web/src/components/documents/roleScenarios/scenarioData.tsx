import React from "react";
import {
	Building,
	FileCheck,
	FileText,
	Scissors,
	Stethoscope,
} from "lucide-react";
import { Autoclave, DentalForm043 } from "../../icons/DentalIcons";
import type { ScenarioDefinition } from "./types";

export const SCENARIO_ITEMS: ScenarioDefinition[] = [
	{
		id: "sick-leave-eln",
		testId: "scenario-sick-leave-eln-btn",
		title: "Больничный лист (ЭЛН)",
		tooltipTitle: "Оформление электронного листка нетрудоспособности и справки для работодателя",
		badge: "Освобождение",
		icon: <Stethoscope size={14} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />,
		getOnClick: (props) => () => {
			if (props.onOpenSickLeaveEln) {
				props.onOpenSickLeaveEln();
			} else {
				props.onOpenClinicalVisit();
			}
		},
	},
	{
		id: "tax-accounting",
		testId: "scenario-tax-accounting-btn",
		title: "Справка для налоговой (13%)",
		tooltipTitle: "Справка для налогового вычета 13% (НДФЛ)",
		badge: "Вычет 13%",
		icon: <Building size={14} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />,
		getOnClick: (props) => () => props.onOpenTaxAccounting(),
	},
	{
		id: "completed-works-act",
		testId: "scenario-completed-works-act-btn",
		title: "Акт выполненных работ",
		tooltipTitle: "Акт сдачи-приемки выполненных стоматологических работ и гарантийных обязательств",
		badge: "Акт закрытия лечения",
		icon: <FileCheck size={14} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />,
		getOnClick: (props) => () => {
			if (props.onSelectCompletedAct) {
				props.onSelectCompletedAct();
			} else {
				props.onOpenTaxAccounting();
			}
		},
	},
	{
		id: "attendance-cert",
		testId: "scenario-attendance-cert-btn",
		title: "Справка о посещении",
		tooltipTitle: "Справка о факте обращения в стоматологическую клинику для работодателя, учебного заведения, страховой или суда",
		badge: "Для суда / страховой / работы",
		icon: <FileText size={14} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />,
		getOnClick: (props) => () => {
			if (props.onSelectAttendanceCert) {
				props.onSelectAttendanceCert();
			} else {
				props.onOpenClinicalVisit();
			}
		},
	},
	{
		id: "clinical-visit",
		testId: "scenario-clinical-visit-btn",
		title: "Приём терапевта (мед. карта)",
		tooltipTitle: "Медицинская карта, дневник приёма и протокол осмотра",
		badge: "Медицинская карта",
		icon: <DentalForm043 size={14} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />,
		getOnClick: (props) => () => props.onOpenClinicalVisit(),
	},
	{
		id: "surgical-package",
		testId: "scenario-surgical-package-btn",
		title: "Хирургический пакет",
		tooltipTitle: "Пакет документов хирургического вмешательства: согласие на операцию, анестезия, хирургический протокол, памятка",
		badge: "Удаление / Имплантация",
		icon: <Scissors size={14} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />,
		getOnClick: (props) => () => {
			if (props.onOpenSurgicalPackage) {
				props.onOpenSurgicalPackage();
			} else {
				props.onOpenClinicalVisit();
			}
		},
	},
	{
		id: "sanpin-registry",
		testId: "scenario-sanpin-registry-btn",
		title: "Журнал автоклавирования",
		tooltipTitle: "Журнал контроля работы стерилизаторов (автоклавов) и предстерилизационной очистки",
		badge: "Стерилизация",
		icon: <Autoclave size={14} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />,
		getOnClick: (props) => () => props.onOpenSanpinRegistry(),
	},
];
