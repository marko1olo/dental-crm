/**
 * diagnosticRegistry.ts — Statutory Nomenclature for Diagnostics, Anesthesia, Ortho & Pediatric.
 * Strictly <= 120 lines.
 */

import type { StatutoryNomenclatureEntry } from "../../types.js";

export const DIAGNOSTIC_STATUTORY_REGISTRY: readonly StatutoryNomenclatureEntry[] = [
	{
		code: "A06.07.007", title: "Внутриротовая рентгенография (прицельный снимок / визиограф)",
		category: "diagnostics", specialty: "radiologist",
		primaryKeywords: [/прицельн.*снимок/i, /визиограф/i, /\brvg\b/i, /радиовизиограф/i, /внутриротов.*рентген/i, /дентальн.*снимок/i],
		secondaryKeywords: [/рентген.*зуб/i],
		defaultPriceRub: 600,
	},
	{
		code: "A06.07.010", title: "Панорамная рентгенография челюстей (ОПТГ)", category: "diagnostics", specialty: "radiologist",
		primaryKeywords: [/\bоптг\b/i, /панорамн.*снимок/i, /ортопантомограмм/i, /обзорн.*снимок/i],
		secondaryKeywords: [/челюст/i],
		defaultPriceRub: 1500,
	},
	{
		code: "A06.07.013", title: "Компьютерная томография челюстно-лицевой области (КЛКТ / КТ)",
		category: "diagnostics", specialty: "radiologist",
		primaryKeywords: [/\bклкт\b/i, /\bкт\b.*челюст/i, /компьютерн.*томограф/i, /3d[-\s]?снимок/i, /томографи.*чло/i],
		secondaryKeywords: [/dicom/i, /сегмент/i],
		defaultPriceRub: 3500,
	},
	{
		code: "B01.065.001", title: "Прием (осмотр, консультация) врача-стоматолога первичный",
		category: "consultation", specialty: "therapist",
		primaryKeywords: [/первичн.*консультац/i, /осмотр.*стоматолог/i, /консультаци.*врач/i, /первичный.*прием/i, /план.*лечени/i],
		secondaryKeywords: [/анкета/i, /составление.*план/i],
		defaultPriceRub: 1000,
	},
	{
		code: "B01.065.002", title: "Прием (осмотр, консультация) врача-стоматолога повторный",
		category: "consultation", specialty: "therapist",
		primaryKeywords: [/повторн.*консультац/i, /повторн.*осмотр/i, /повторный.*прием/i],
		secondaryKeywords: [/контрольн.*осмотр/i],
		defaultPriceRub: 500,
	},
	{
		code: "B01.003.004.005", title: "Инфильтрационная анестезия", category: "anesthesia", specialty: "anesthesiologist",
		primaryKeywords: [/инфильтрационн.*анестези/i, /ультракаин/i, /септанест/i, /убистезин/i, /артикаин/i, /карпул/i],
		secondaryKeywords: [/обезболиван/i],
		defaultPriceRub: 800,
	},
	{
		code: "B01.003.004.004", title: "Проводниковая анестезия", category: "anesthesia", specialty: "anesthesiologist",
		primaryKeywords: [/проводников.*анестези/i, /торусальн.*анестези/i, /мандибулярн.*анестези/i, /мандибулярк/i],
		secondaryKeywords: [/блокад/i],
		defaultPriceRub: 950,
	},
	{
		code: "B01.003.004.001", title: "Аппликационная анестезия", category: "anesthesia", specialty: "anesthesiologist",
		primaryKeywords: [/аппликационн.*анестези/i, /гель.*обезболив/i, /лидокаин.*спрей/i, /дисилан/i],
		secondaryKeywords: [/смазывание/i],
		defaultPriceRub: 400,
	},
	{
		code: "A16.07.048", title: "Ортодонтическая коррекция с применением брекет-систем",
		category: "orthodontics", specialty: "orthodontist",
		primaryKeywords: [/брекет/i, /элайнер/i, /ортодонтическ.*пластинк/i, /активаци.*дуг/i, /фиксаци.*брекет/i, /снятие.*брекет/i, /ретейнер/i, /ортодонт/i],
		secondaryKeywords: [/каппа.*исправлен/i, /трейнер/i],
		defaultPriceRub: 35000,
	},
	{
		code: "A16.07.002.009", title: "Лечение кариеса временного (молочного) зуба",
		category: "pediatric", specialty: "pediatric",
		primaryKeywords: [/детск.*стоматолог/i, /молочн.*зуб/i, /временн.*зуб.*пломб/i, /лечение.*кариес.*дет/i, /серебрение/i, /цветн.*пломб/i],
		secondaryKeywords: [/адаптационный.*прием/i],
		defaultPriceRub: 3000,
	},
];
