export const CONSTRUCTION_TYPES = [
	{ id: "single_crown", name: "Одиночная коронка", desc: "Анатомическая коронка (полная или с редукцией)", icon: "crown", category: "Несъемное" },
	{ id: "bridge", name: "Мостовидный протез", desc: "Конструкция с опорными коронками и промежутком", icon: "bridge", category: "Несъемное" },
	{ id: "veneer", name: "Керамический винир", desc: "Ультратонкая эстетическая накладка E.max / Feldspar", icon: "veneer", category: "Эстетика" },
	{ id: "inlay_onlay", name: "Вкладка / Накладка (Inlay/Onlay/Overlay)", desc: "Керамическая или композитная микропротезная реставрация", icon: "inlay", category: "Микропротезирование" },
	{ id: "all_on_4_6", name: "Тотальный протез All-on-4 / All-on-6", desc: "Балочный или винтовой условно-съемный протез на имплантатах", icon: "implant", category: "Имплантология" },
	{ id: "all_on_arch", name: "Тотальный протез на всю челюсть", desc: "Условно-съемный балочный/винтовой протез челюсти", icon: "arch", category: "Имплантология" },
	{ id: "implant_abutment", name: "Индивидуальный абатмент + коронка", desc: "Титановый / циркониевый абатмент на винтовой фиксации", icon: "abutment", category: "Имплантология" },
	{ id: "clasp_denture", name: "Бюгельный / Частично-съемный протез", desc: "Протез на замках (аттачменах) или кламмерах", icon: "denture", category: "Съемное" },
	{ id: "aligner_nightguard", name: "Элайнер / Окклюзионная сплинт-каппа", desc: "Ортодонтический или миорелаксирующий прозрачный сплинт", icon: "aligner", category: "Каппы" },
	{ id: "aligners_nightguard", name: "Элайнеры / Сплинт-шина", desc: "Окклюзионная защитная капа / ортодонтические элайнеры", icon: "guard", category: "Каппы" },
	{ id: "endocrown", name: "Эндокоронка", desc: "Монолитная коронка с фиксацией в пульповой камере", icon: "endocrown", category: "Микропротезирование" },
	{ id: "core_buildup_post", name: "Культевая вкладка (Штифтовая)", desc: "Культевая штифтовая вкладка (КХС / ZrO2)", icon: "post", category: "Несъемное" },
	{ id: "nightguard_bruxism", name: "Ночная каппа от бруксизма", desc: "Термоформованная каппа против стираемости", icon: "guard", category: "Каппы" },
	{ id: "occlusal_splint", name: "Разгрузочный окклюзионный сплинт", desc: "Миорелаксационный сплинт при дисфункции ВНЧС", icon: "aligner", category: "Каппы" },
	{ id: "sports_mouthguard", name: "Спортивная защитная каппа", desc: "Двухслойная защитная индивидуальная каппа", icon: "guard", category: "Каппы" },
	{ id: "bleaching_tray", name: "Каппы для домашнего отбеливания", desc: "Индивидуальные каппы с резервуарами", icon: "guard", category: "Каппы" },
	{ id: "full_denture", name: "Полный съемный пластиночный протез (ПСПП)", desc: "Акриловый пластиночный протез при полной адентии", icon: "denture", category: "Съемное" },
	{ id: "custom_impression_tray", name: "Индивидуальная ложка / прикусной шаблон", desc: "Индивидуальная ложка с восковыми валиками", icon: "denture", category: "Съемное" },
] as const;

export const IMPRESSION_TYPES = [
	{ id: "a_silicone", name: "А-силикон" },
	{ id: "c_silicone", name: "С-силикон" },
	{ id: "polyether", name: "Полиэфир" },
	{ id: "alginate", name: "Альгинат" },
	{ id: "digital_intraoral_scan", name: "3D-скан" },
] as const;

export function isJawWideConstruction(constructionId?: string | null): boolean {
	if (!constructionId) return false;
	return (
		constructionId === "aligner_nightguard" ||
		constructionId === "aligners_nightguard" ||
		constructionId === "all_on_4_6" ||
		constructionId === "all_on_arch" ||
		constructionId === "clasp_denture" ||
		constructionId === "nightguard_bruxism" ||
		constructionId === "occlusal_splint" ||
		constructionId === "sports_mouthguard" ||
		constructionId === "bleaching_tray" ||
		constructionId === "full_denture" ||
		constructionId === "custom_impression_tray"
	);
}
