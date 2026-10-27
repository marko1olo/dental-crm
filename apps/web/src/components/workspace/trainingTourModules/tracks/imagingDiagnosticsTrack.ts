import type { QuestStep } from "../trainingTourTypes";

export const IMAGING_DIAGNOSTICS_TRACK_STEPS: readonly QuestStep[] = [
	{
		id: "imaging_open",
		stepNumber: 1,
		title: "Открытие снимка визиографа или КТ",
		badge: "Рентген и КТ",
		description:
			"Нажмите F7 для быстрого снимка с датчика или выберите исследование в галерее. Снимок открывается менее чем за 50 миллисекунд.",
		clinicalTip:
			"Мгновенный просмотр без задержек: никакой обязательной блокировки на тяжелые нейросети.",
		shortcutBadge: "F7 — снимок визиографа • 0 мс задержки",
		targetSelector: '[data-tour="imaging-nav"], [data-tour="visiograph-open"], a[href="#imaging"]',
		fallbackTargetSelector: 'a[href="#imaging"]',
		viewTarget: "imaging",
		actionLabel: "Открыть снимки",
		rewardBadge: "+1 к четкости диагностики",
		arrowDirection: "right",
		actionTrigger: {
			type: "keyboard",
			key: "F7",
		},
	},
	{
		id: "imaging_mpr",
		stepNumber: 2,
		title: "Мультипланарная реконструкция MPR",
		badge: "3D Срезы",
		description:
			"Переключайтесь между аксиальным, сагиттальным и корональным срезами. Контрастность настраивается пресетом «Кость / Зуб».",
		clinicalTip:
			"Тёмная тема рентген-кабинета (WCAG AAA): фон slate-950 бережёт глаза при оценке снимков.",
		shortcutBadge: "Колесо мыши — прокрутка срезов",
		targetSelector: '[data-tour="mpr-presets"], [data-tour="imaging-filter"], #dicom-mpr-toolbar',
		fallbackTargetSelector: 'a[href="#imaging"]',
		viewTarget: "imaging",
		actionLabel: "Срезы томограммы",
		rewardBadge: "+1 к 3D-навигации",
		arrowDirection: "down",
		actionTrigger: {
			type: "click",
		},
	},
	{
		id: "imaging_measure",
		stepNumber: 3,
		title: "Калиброванная линейка и замер гребня",
		badge: "Линейка",
		description:
			"Выберите инструмент измерения для замера высоты и ширины альвеолярного гребня перед имплантацией с точностью до десятой доли миллиметра.",
		clinicalTip:
			"Безопасная имплантология: расчет дистанции до нижнечелюстного канала и гайморовой пазухи.",
		shortcutBadge: "Линейка / Замер костного объема",
		targetSelector: '[data-tour="dicom-ruler"], [data-tour="imaging-measure"], #dicom-ruler-btn',
		fallbackTargetSelector: 'a[href="#imaging"]',
		viewTarget: "imaging",
		actionLabel: "Инструмент линейка",
		rewardBadge: "+1 к точности имплантации",
		arrowDirection: "left",
		actionTrigger: {
			type: "click",
		},
	},
];
