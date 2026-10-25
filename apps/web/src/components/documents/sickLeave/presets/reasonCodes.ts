import type { IncapacityReasonCode, IncapacityReasonMeta } from "./types";

export const INCAPACITY_REASON_CODES: Record<IncapacityReasonCode, IncapacityReasonMeta> = {
	'01': {
		code: '01',
		titleRu: '01 - Заболевание',
		descriptionRu: 'Заболевание челюстно-лицевой области, одонтогенная инфекция, периостит, пульпит с интоксикацией',
		isDentalCommon: true
	},
	'02': {
		code: '02',
		titleRu: '02 - Травма',
		descriptionRu: 'Травма ЧЛО, перелом челюсти или альвеолярного отростка, вывих зуба, ранение мягких тканей',
		isDentalCommon: true
	},
	'03': {
		code: '03',
		titleRu: '03 - Карантин',
		descriptionRu: 'Карантинные мероприятия и изоляция контактных лиц',
		isDentalCommon: false
	},
	'05': {
		code: '05',
		titleRu: '05 - Отпуск по беременности и родам',
		descriptionRu: 'Дородовый и послеродовый период',
		isDentalCommon: false
	},
	'08': {
		code: '08',
		titleRu: '08 - Долечивание в санаторно-курортных организациях',
		descriptionRu: 'Направление на долечивание в специализированных учреждениях',
		isDentalCommon: false
	},
	'09': {
		code: '09',
		titleRu: '09 - Уход за больным членом семьи',
		descriptionRu: 'Уход за ребенком или взрослым членом семьи при амбулаторном лечении',
		isDentalCommon: false
	},
	'10': {
		code: '10',
		titleRu: '10 - Иное состояние',
		descriptionRu: 'Отравление, проведение сложных инвазивных амбулаторных манипуляций',
		isDentalCommon: false
	},
	'11': {
		code: '11',
		titleRu: '11 - Заболевание вследствие опьянения',
		descriptionRu: 'Заболевание или травма, наступившие в результате токсического опьянения',
		isDentalCommon: false
	}
};
