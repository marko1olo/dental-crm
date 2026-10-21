export interface ColorShadeOption {
	code: string;
	groupRu: string;
	hex: string;
	descriptionRu?: string;
}

export const VITA_CLASSICAL_SHADES: ColorShadeOption[] = [
	{ code: 'A1', groupRu: 'A: Красновато-коричневые', hex: '#EDE8D5', descriptionRu: 'Светлый теплый оттенок' },
	{ code: 'A2', groupRu: 'A: Красновато-коричневые', hex: '#E5DDC3', descriptionRu: 'Самый частый естественный оттенок (60% пациентов)' },
	{ code: 'A3', groupRu: 'A: Красновато-коричневые', hex: '#DCceA8', descriptionRu: 'Насыщенный теплый тон' },
	{ code: 'A3.5', groupRu: 'A: Красновато-коричневые', hex: '#D2BE90', descriptionRu: 'Темный теплый тон для пришеечной зоны' },
	{ code: 'A4', groupRu: 'A: Красновато-коричневые', hex: '#C4AB77', descriptionRu: 'Интенсивно пигментированный тон' },
	{ code: 'B1', groupRu: 'B: Красновато-желтоватые', hex: '#F0EBD6', descriptionRu: 'Яркий светлый природный тон' },
	{ code: 'B2', groupRu: 'B: Красновато-желтоватые', hex: '#E7DEC2', descriptionRu: 'Светлый желтоватый оттенок' },
	{ code: 'B3', groupRu: 'B: Красновато-желтоватые', hex: '#DCCEA4', descriptionRu: 'Желтовато-коричневый оттенок' },
	{ code: 'B4', groupRu: 'B: Красновато-желтоватые', hex: '#CDB988', descriptionRu: 'Насыщенный желтый тон' },
	{ code: 'C1', groupRu: 'C: Сероватые тона', hex: '#E0DDD2', descriptionRu: 'Светлый холодный сероватый оттенок' },
	{ code: 'C2', groupRu: 'C: Сероватые тона', hex: '#D4CEBF', descriptionRu: 'Средне-серый холодный оттенок' },
	{ code: 'C3', groupRu: 'C: Сероватые тона', hex: '#C4BCA8', descriptionRu: 'Темно-серый тон' },
	{ code: 'C4', groupRu: 'C: Сероватые тона', hex: '#B3A992', descriptionRu: 'Интенсивный серо-коричневый тон' },
	{ code: 'D2', groupRu: 'D: Красновато-серые', hex: '#E1D9CA', descriptionRu: 'Светлый красно-серый тон' },
	{ code: 'D3', groupRu: 'D: Красновато-серые', hex: '#D4C7B1', descriptionRu: 'Средний красно-серый тон' },
	{ code: 'D4', groupRu: 'D: Красновато-серые', hex: '#C4B49C', descriptionRu: 'Темный красно-серый тон' }
];

export const VITA_BLEACH_SHADES: ColorShadeOption[] = [
	{ code: 'BL1', groupRu: 'Bleach: Экстра-белые', hex: '#FAF9F5', descriptionRu: 'Ультра-белый голливудский оттенок' },
	{ code: 'BL2', groupRu: 'Bleach: Экстра-белые', hex: '#F5F3EB', descriptionRu: 'Яркий отбеленный тон' },
	{ code: 'BL3', groupRu: 'Bleach: Экстра-белые', hex: '#F0ECE0', descriptionRu: 'Умеренно отбеленный тон' },
	{ code: 'BL4', groupRu: 'Bleach: Экстра-белые', hex: '#EBE6D5', descriptionRu: 'Мягкий светлый переходный тон к A1' },
	{ code: 'OM1', groupRu: 'Bleach: VITA 3D Bleach', hex: '#FCFBFA', descriptionRu: 'Экстра-белый 3D Bleach OM1 (0M1)' },
	{ code: 'OM2', groupRu: 'Bleach: VITA 3D Bleach', hex: '#F9F7F1', descriptionRu: 'Светлый 3D Bleach OM2 (0M2)' },
	{ code: 'OM3', groupRu: 'Bleach: VITA 3D Bleach', hex: '#F6F2E8', descriptionRu: 'Натуральный 3D Bleach OM3 (0M3)' },
	{ code: '0M1', groupRu: 'Bleach: VITA 3D Bleach', hex: '#FCFBFA', descriptionRu: 'Экстра-белый 3D Bleach 0M1 (OM1)' },
	{ code: '0M2', groupRu: 'Bleach: VITA 3D Bleach', hex: '#F9F7F1', descriptionRu: 'Светлый 3D Bleach 0M2 (OM2)' },
	{ code: '0M3', groupRu: 'Bleach: VITA 3D Bleach', hex: '#F6F2E8', descriptionRu: 'Натуральный 3D Bleach 0M3 (OM3)' }
];

export const VITA_3D_MASTER_SHADES: ColorShadeOption[] = [
	{ code: '1M1', groupRu: 'Группа 1: Светлые', hex: '#F2EDE0' },
	{ code: '1M2', groupRu: 'Группа 1: Светлые', hex: '#EDE6D4' },
	{ code: '2L1.5', groupRu: 'Группа 2: Желтоватые', hex: '#ECE3CE' },
	{ code: '2M1', groupRu: 'Группа 2: Нейтральные', hex: '#E9DFC8' },
	{ code: '2M2', groupRu: 'Группа 2: Нейтральные', hex: '#E5D9BE' },
	{ code: '2M3', groupRu: 'Группа 2: Нейтральные', hex: '#DFD1B1' },
	{ code: '2R1.5', groupRu: 'Группа 2: Красноватые', hex: '#E5D6C1' },
	{ code: '2R2.5', groupRu: 'Группа 2: Красноватые', hex: '#DECBB3' },
	{ code: '3L1.5', groupRu: 'Группа 3: Желтоватые', hex: '#E2D3B8' },
	{ code: '3M1', groupRu: 'Группа 3: Нейтральные', hex: '#DECDB0' },
	{ code: '3M2', groupRu: 'Группа 3: Нейтральные', hex: '#D8C5A4' },
	{ code: '3M3', groupRu: 'Группа 3: Нейтральные', hex: '#D0BA95' },
	{ code: '3R2.5', groupRu: 'Группа 3: Красноватые', hex: '#D3BDA4' },
	{ code: '4M1', groupRu: 'Группа 4: Насыщенные', hex: '#CEBA98' },
	{ code: '4M2', groupRu: 'Группа 4: Насыщенные', hex: '#C5AF8A' },
	{ code: '4M3', groupRu: 'Группа 4: Насыщенные', hex: '#BCA37C' },
	{ code: '5M1', groupRu: 'Группа 5: Темные', hex: '#BAA27E' },
	{ code: '5M2', groupRu: 'Группа 5: Темные', hex: '#B19770' },
	{ code: '5M3', groupRu: 'Группа 5: Темные', hex: '#A88C64' }
];

export const STUMP_SHADES_ND: ColorShadeOption[] = [
	{ code: 'ND1', groupRu: 'Natural Die Material (IPS e.max)', hex: '#EFEADB', descriptionRu: 'Светлая витальная культя (соответствует A1/B1)' },
	{ code: 'ND2', groupRu: 'Natural Die Material (IPS e.max)', hex: '#E6DCBF', descriptionRu: 'Естественная витальная культя (A2)' },
	{ code: 'ND3', groupRu: 'Natural Die Material (IPS e.max)', hex: '#DCcca0', descriptionRu: 'Теплая культя средней насыщенности (A3)' },
	{ code: 'ND4', groupRu: 'Natural Die Material (IPS e.max)', hex: '#D0B984', descriptionRu: 'Темная культя / девитализированный дентин (A3.5/A4)' },
	{ code: 'ND5', groupRu: 'Natural Die Material (IPS e.max)', hex: '#E2DCB8', descriptionRu: 'Светлая сероватая культя (C1/D2)' },
	{ code: 'ND6', groupRu: 'Natural Die Material (IPS e.max)', hex: '#D1C89F', descriptionRu: 'Серовато-желтая культя (C2/C3)' },
	{ code: 'ND7', groupRu: 'Natural Die Material (IPS e.max)', hex: '#B8AB7F', descriptionRu: 'Темно-серая девитализированная культя (C4)' },
	{ code: 'ND8', groupRu: 'Natural Die Material (IPS e.max)', hex: '#9E8D68', descriptionRu: 'Сильно дисколорированная культя (резорцин-формалин)' },
	{ code: 'ND9', groupRu: 'Natural Die Material (IPS e.max)', hex: '#7D7A73', descriptionRu: 'Металлическая культевая вкладка (Co-Cr / никель / золото)' }
];

export interface SurfaceTextureOption {
	id: 'high_gloss' | 'microtexture' | 'matte';
	nameRu: string;
	descriptionRu: string;
}

export const SURFACE_TEXTURES: SurfaceTextureOption[] = [
	{ id: 'high_gloss', nameRu: 'Глянцевая (Зеркальная)', descriptionRu: 'Максимальный зеркальный блеск, гладкая поверхность без перикимат.' },
	{ id: 'microtexture', nameRu: 'Естественная микротекстура', descriptionRu: 'Анатомические вертикальные борозды, мамелоны и горизонтальные линии роста эмали (перикиматы).' },
	{ id: 'matte', nameRu: 'Матовая (Сатиновая)', descriptionRu: 'Низкая степень блеска, матовый финиш для пациентов старшей возрастной группы.' }
];

export interface TranslucencyLevelOption {
	id: 'HT' | 'MT' | 'LT' | 'MO' | 'HO';
	nameRu: string;
	descriptionRu: string;
}

export const TRANSLUCENCY_LEVELS: TranslucencyLevelOption[] = [
	{ id: 'HT', nameRu: 'HT (High Translucency)', descriptionRu: 'Высокая прозрачность. Идеально для вкладок, накладок и виниров на светлой культе.' },
	{ id: 'MT', nameRu: 'MT (Medium Translucency)', descriptionRu: 'Средняя прозрачность. Универсально для коронок фронтальной и жевательной зоны.' },
	{ id: 'LT', nameRu: 'LT (Low Translucency)', descriptionRu: 'Низкая прозрачность. Высокая маскирующая способность для слегка измененных в цвете культей.' },
	{ id: 'MO', nameRu: 'MO (Medium Opacity)', descriptionRu: 'Средняя опаковость. Каркасы под нанесение керамики при дисколорите.' },
	{ id: 'HO', nameRu: 'HO (High Opacity)', descriptionRu: 'Высокая опаковость. Полное перекрытие металлических вкладок и темных штифтов (ND8/ND9).' }
];
