import type { ClinicalMaterialOption, CompositeMaterial } from "../../../store/doctorPreferencesStore";

export const COMPOSITE_OPTIONS: readonly ClinicalMaterialOption<CompositeMaterial>[] = [
	{
		id: "filtek_ultimate", key: "filtek_ultimate", name: "Filtek Ultimate / Z250 / Z550 (3M ESPE)",
		title: "Filtek Ultimate / Z250 / Z550 (3M ESPE)", manufacturer: "3M ESPE (США)",
		description: "Наногибрид, универсал для всех групп зубов с высокой прочностью и стойким блеском",
		popularityRank: 1, isFavoriteDefault: false, category: "Наногибрид универсал",
	},
	{
		id: "estelite_asteria", key: "estelite_asteria", name: "Estelite Asteria / Sigma Quick (Tokuyama Dental)",
		title: "Estelite Asteria / Sigma Quick", manufacturer: "Tokuyama Dental (Япония)",
		description: "Субмикронный сферический наполнитель, непревзойденный эффект хамелеона",
		popularityRank: 2, isFavoriteDefault: true, category: "Субмикронный хамелеон",
	},
	{
		id: "gradia_direct", key: "gradia_direct", name: "Gradia Direct / G-aenial (GC)",
		title: "Gradia Direct / G-aenial (GC)", manufacturer: "GC (Япония)",
		description: "Микрогибридный композит с опалесценцией, естественная эстетика живого зуба",
		popularityRank: 3, isFavoriteDefault: false, category: "Микрогибрид",
	},
	{
		id: "harmonize", key: "harmonize", name: "Harmonize / Herculite Ultra (Kerr)",
		title: "Harmonize наногибридный (Kerr)", manufacturer: "Kerr (США)",
		description: "Наногибридный композит с технологией адаптивного отклика частиц ART",
		popularityRank: 4, isFavoriteDefault: false, category: "Наногибрид адаптивный",
	},
	{
		id: "charisma_classic", key: "charisma_classic", name: "Charisma Classic / Diamond (Kulzer)",
		title: "Charisma Classic / Diamond (Kulzer)", manufacturer: "Kulzer (Германия)",
		description: "Микрогибрид второго поколения Microglass II, высокая надежность и полируемость",
		popularityRank: 5, isFavoriteDefault: false, category: "Микрогибрид",
	},
	{
		id: "ceram_x_sphere_tec", key: "ceram_x_sphere_tec", name: "Ceram.x SphereTEC one / SDR Plus (Dentsply Sirona)",
		title: "Ceram.X SphereTEC One (Dentsply Sirona)", manufacturer: "Dentsply Sirona (Германия)",
		description: "Гранулированный сферический наполнитель SphereTEC, идеальная адаптация без прилипания",
		popularityRank: 6, isFavoriteDefault: false, category: "Сферический наполнитель",
	},
	{
		id: "brilliant_everglow", key: "brilliant_everglow", name: "Brilliant EverGlow (Coltene)",
		title: "Brilliant EverGlow (Coltene)", manufacturer: "Coltene (Швейцария)",
		description: "Субмикронный гибрид с легким моделированием и длительным сохранением зеркального блеска",
		popularityRank: 7, isFavoriteDefault: false, category: "Субмикронный гибрид",
	},
	{
		id: "tetric_n_ceram", key: "tetric_n_ceram", name: "Tetric N-Ceram / EvoCeram (Ivoclar Vivadent)",
		title: "Tetric N-Ceram / EvoCeram (Ivoclar)", manufacturer: "Ivoclar Vivadent (Лихтенштейн)",
		description: "Наногибрид с нано-оптимизированной матрицей для высокопрочных реставраций",
		popularityRank: 8, isFavoriteDefault: false, category: "Наногибрид",
	},
	{
		id: "omnichroma", key: "omnichroma", name: "Omnichroma (Tokuyama Dental)",
		title: "Omnichroma (Tokuyama Dental)", manufacturer: "Tokuyama Dental (Япония)",
		description: "Структурный цвет без добавления химических пигментов, один оттенок на все зубы",
		popularityRank: 9, isFavoriteDefault: false, category: "Структурный цвет",
	},
	{
		id: "esthet_x_hd", key: "esthet_x_hd", name: "Esthet-X HD (Dentsply Sirona)",
		title: "Esthet-X HD (Dentsply Sirona)", manufacturer: "Dentsply Sirona (США)",
		description: "Микроматричный композит высокой плотности для высокохудожественных реставраций",
		popularityRank: 10, isFavoriteDefault: false, category: "Микроматричный",
	},
	{
		id: "grandio_admira", key: "grandio_admira", name: "Grandio / Admira Fusion (Voco)",
		title: "Grandio / Admira Fusion (Voco)", manufacturer: "Voco (Германия)",
		description: "Ормокер на основе чистого кремния, наногибрид со сверхнизкой полимеризационной усадкой",
		popularityRank: 11, isFavoriteDefault: false, category: "Ормокер / Наногибрид",
	},
	{
		id: "enamel_plus_hri", key: "enamel_plus_hri", name: "Enamel Plus HRi (Micerium)",
		title: "Enamel Plus HRi (Micerium)", manufacturer: "Micerium (Италия)",
		description: "Высокоэстетичный композит со светопреломлением, строго идентичным натуральной эмали зуба",
		popularityRank: 12, isFavoriteDefault: false, category: "Эмалево-преломляющий",
	},
	{
		id: "clearfil_majesty_es2", key: "clearfil_majesty_es2", name: "Clearfil Majesty ES-2 (Kuraray Noritake)",
		title: "Clearfil Majesty ES-2 (Kuraray)", manufacturer: "Kuraray Noritake (Япония)",
		description: "Наногибридная точность подбора оттенков по шкале VITA с технологией светорассеяния",
		popularityRank: 13, isFavoriteDefault: false, category: "Наногибрид VITA",
	},
	{
		id: "spectrum_tph3", key: "spectrum_tph3", name: "Spectrum TPH3 (Dentsply Sirona)",
		title: "Spectrum TPH3 (Dentsply Sirona)", manufacturer: "Dentsply Sirona (Германия)",
		description: "Проверенный субмикронный гибридный композит для реставрации всех полостей I–V",
		popularityRank: 14, isFavoriteDefault: false, category: "Субмикронный гибрид",
	},
	{
		id: "dentlight", key: "dentlight", name: "ДентЛайт (ВладМиВа)",
		title: "ДентЛайт (ВладМиВа)", manufacturer: "ВладМиВа (Россия)",
		description: "Отечественный светоотверждаемый микрогибридный композит высокой прочности и рентгеноконтрастности",
		popularityRank: 15, isFavoriteDefault: false, category: "Микрогибрид РФ",
	},
	{
		id: "sdr_plus_bulk_fill", key: "sdr_plus_bulk_fill", name: "SDR Plus Bulk-Fill Flow (Dentsply Sirona)",
		title: "SDR Plus Bulk-Fill Flow", manufacturer: "Dentsply Sirona (Германия)",
		description: "Текучий базовый композит объемного внесения до 4 мм с эффектом самовыравнивания",
		popularityRank: 16, isFavoriteDefault: false, category: "Bulk-Fill Flow",
	},
];
