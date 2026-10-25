import type { DentalClinicalPreset } from "./types";

export const DENTAL_CLINICAL_PRESETS: Record<string, DentalClinicalPreset> = {
	acute_purulent_periostitis: {
		id: 'acute_purulent_periostitis',
		titleRu: 'Острый гнойный периостит челюсти (одонтогенный абсцесс)',
		shortTitleRu: 'Периостит челюсти',
		icd10Code: 'K10.2',
		icd10TitleRu: 'Воспалительные заболевания челюстей (периостит)',
		reasonCode: '01',
		recommendedMinDays: 3, recommendedMaxDays: 6, defaultDays: 5, isVkMandatory: false,
		clinicalDescriptionRu: 'Острый гнойный одонтогенный периостит челюсти. Проведена периостотомия, дренирование резиновым выпускником, антисептическая обработка.',
		expertJustificationRu: 'Выраженный болевой синдром, отек мягких тканей лица, интоксикация, необходимость ежедневных перевязок.'
	},
	atypical_impacted_extraction: {
		id: 'atypical_impacted_extraction',
		titleRu: 'Сложное атипичное удаление ретинированного зуба с остеотомией',
		shortTitleRu: 'Атипичная экстракция',
		icd10Code: 'K01.1',
		icd10TitleRu: 'Ретинированные зубы (дистопия, полуретиненция)',
		reasonCode: '01',
		recommendedMinDays: 3, recommendedMaxDays: 5, defaultDays: 4, isVkMandatory: false,
		clinicalDescriptionRu: 'Атипичная операция удаления ретинированного и дистопированного зуба с остеотомией кортикальной пластинки, фрагментацией зуба.',
		expertJustificationRu: 'Послеоперационный реактивный отек, тризм жевательной мускулатуры 1-2 степени, выраженный болевой синдром.'
	},
	acute_alveolitis: {
		id: 'acute_alveolitis',
		titleRu: 'Острый альвеолит челюсти (воспаление лунки зуба после экстракции)',
		shortTitleRu: 'Альвеолит лунки',
		icd10Code: 'K10.3',
		icd10TitleRu: 'Альвеолит челюстей',
		reasonCode: '01',
		recommendedMinDays: 3, recommendedMaxDays: 6, defaultDays: 4, isVkMandatory: false,
		clinicalDescriptionRu: 'Острый альвеолит лунки зуба. Ревизия лунки под местной анестезией, удаление распада сгустка, антисептическая обработка.',
		expertJustificationRu: 'Интенсивный болевой синдром с иррадиацией по тройничному нерву, регионарный лимфаденит, нарушение трудоспособности.'
	},
	acute_pericoronitis: {
		id: 'acute_pericoronitis',
		titleRu: 'Острый перикоронит (воспаление десневого капюшона зуба мудрости)',
		shortTitleRu: 'Острый перикоронит',
		icd10Code: 'K05.2',
		icd10TitleRu: 'Острый перикоронит',
		reasonCode: '01',
		recommendedMinDays: 3, recommendedMaxDays: 5, defaultDays: 4, isVkMandatory: false,
		clinicalDescriptionRu: 'Острый перикоронит в области третьего моляра. Иссечение капюшона, эвакуация экссудата, дренирование.',
		expertJustificationRu: 'Боль при глотании, тризм жевательных мышц, отек ретромолярной области, затруднение приема пищи и речи.'
	},
	odontogenic_sinusitis_perforation: {
		id: 'odontogenic_sinusitis_perforation',
		titleRu: 'Одонтогенный гайморит / перфорация дна гайморовой пазухи с пластикой',
		shortTitleRu: 'Перфорация пазухи / Гайморит',
		icd10Code: 'T81.2',
		icd10TitleRu: 'Перфорация верхнечелюстной пазухи при стоматологическом вмешательстве',
		reasonCode: '01',
		recommendedMinDays: 7, recommendedMaxDays: 10, defaultDays: 8, isVkMandatory: false,
		clinicalDescriptionRu: 'Перфорация дна верхнечелюстной пазухи при удалении зуба, пластика ороантрального соустья слизисто-надкостничным лоскутом.',
		expertJustificationRu: 'Необходимость охранительного режима, исключение повышения внутриносового давления, ежедневная антибактериальная терапия.'
	},
	osteomyelitis_subacute_vk: {
		id: 'osteomyelitis_subacute_vk',
		titleRu: 'Подострый остеомиелит челюсти / тяжелый альвеолит (требует согласования)',
		shortTitleRu: 'Остеомиелит челюсти',
		icd10Code: 'K10.2',
		icd10TitleRu: 'Воспалительные заболевания челюстей (остеомиелит)',
		reasonCode: '01',
		recommendedMinDays: 16, recommendedMaxDays: 24, defaultDays: 18, isVkMandatory: true,
		clinicalDescriptionRu: 'Подострый одонтогенный остеомиелит челюсти. Вскрытие очагов, кюретаж лунки, антибактериальная терапия.',
		expertJustificationRu: 'Длительное течение воспалительного процесса, секвестрация костной ткани, превышение 15 дней. Требуется согласование с главным врачом.'
	},
	maxillofacial_trauma_fracture: {
		id: 'maxillofacial_trauma_fracture',
		titleRu: 'Травма ЧЛО: вывих зуба с шинированием / перелом альвеолярного отростка',
		shortTitleRu: 'Травма ЧЛО / Вывих зуба',
		icd10Code: 'S03.2',
		icd10TitleRu: 'Вывих зуба (травматический)',
		reasonCode: '02',
		recommendedMinDays: 10, recommendedMaxDays: 14, defaultDays: 12, isVkMandatory: false,
		clinicalDescriptionRu: 'Травматический вывих зубов, репозиция и фиксация назубной композитно-проволочной шиной.',
		expertJustificationRu: 'Наличие иммобилизирующей шины, нарушение функции жевания и речи, болевой синдром.'
	},
	acute_vincent_stomatitis: {
		id: 'acute_vincent_stomatitis',
		titleRu: 'Острый язвенно-некротический гингивостоматит Венсана',
		shortTitleRu: 'Стоматит Венсана',
		icd10Code: 'A69.1',
		icd10TitleRu: 'Другие инфекции Венсана (язвенно-некротический гингивостоматит)',
		reasonCode: '01',
		recommendedMinDays: 4, recommendedMaxDays: 7, defaultDays: 5, isVkMandatory: false,
		clinicalDescriptionRu: 'Острый язвенно-некротический гингивостоматит Венсана с лимфаденитом и общей интоксикацией.',
		expertJustificationRu: 'Выраженная интоксикация, резкая болезненность при приеме пищи и речи, регионарный лимфаденит.'
	},
	floor_mouth_phlegmon_rehab: {
		id: 'floor_mouth_phlegmon_rehab',
		titleRu: 'Флегмона околочелюстной области (амбулаторный этап реабилитации)',
		shortTitleRu: 'Околочелюстная флегмона (долечивание)',
		icd10Code: 'K12.2',
		icd10TitleRu: 'Флегмона и абсцесс полости рта',
		reasonCode: '01',
		recommendedMinDays: 10, recommendedMaxDays: 15, defaultDays: 14, isVkMandatory: false,
		clinicalDescriptionRu: 'Амбулаторное лечение и реабилитация после одонтогенного воспалительного процесса челюстно-лицевой области.',
		expertJustificationRu: 'Наличие дренированных послеоперационных ран, умеренный тризм, астенический синдром, необходимость регулярных перевязок.'
	}
};
