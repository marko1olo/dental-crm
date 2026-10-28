import type { DmsInsuranceCompany } from "./guaranteeTypes.js";

export const DMS_INSURANCE_COMPANIES_CATALOG: readonly DmsInsuranceCompany[] = [
	{
		id: "sogaz", shortNameRu: "АО «СОГАЗ»", fullNameRu: "Акционерное общество «Страховое общество газовой промышленности»",
		inn: "7736035485", ogrn: "1027739820921", kpp: "770801001", phone: "8 800 333-08-88", email: "dms@sogaz.ru",
		websiteUrl: "https://www.sogaz.ru", defaultFranchiseRates: [0, 10, 20, 30],
		descriptionRu: "Крупнейший страховщик ДМС в РФ. Обслуживает корпоративные программы Газпрома, РЖД, Роснефти.",
	},
	{
		id: "alfastrakhovanie", shortNameRu: "АО «АльфаСтрахование»", fullNameRu: "Акционерное общество «АльфаСтрахование»",
		inn: "7713056834", ogrn: "1027739431730", kpp: "772501001", phone: "8 800 333-09-99", email: "medcontrol@alfastrah.ru",
		websiteUrl: "https://www.alfastrah.ru", defaultFranchiseRates: [0, 10, 20, 30, 50],
		descriptionRu: "Федеральный страховщик ДМС. Цифровые гарантийные письма и кабинет застрахованного.",
	},
	{
		id: "ingosstrakh", shortNameRu: "СПАО «Ингосстрах»", fullNameRu: "Страховое публичное акционерное общество «Ингосстрах»",
		inn: "7705042179", ogrn: "1027739362474", kpp: "770501001", phone: "8 800 100-77-55", email: "dms-claims@ingos.ru",
		websiteUrl: "https://www.ingos.ru", defaultFranchiseRates: [0, 10, 20, 50, 80],
		descriptionRu: "Старейший страховщик РФ с сетью клиник Будь Здоров и широким портфелем ДМС.",
	},
	{
		id: "reso_garantiya", shortNameRu: "СПАО «РЕСО-Гарантия»", fullNameRu: "Страховое публичное акционерное общество «РЕСО-Гарантия»",
		inn: "7710045520", ogrn: "1027700042413", kpp: "771001001", phone: "8 800 234-18-02", email: "dms@reso.ru",
		websiteUrl: "https://www.reso.ru", defaultFranchiseRates: [0, 20, 30, 50],
		descriptionRu: "Лидер розничного и корпоративного медицинского страхования с развитой экспертизой.",
	},
	{
		id: "vsk", shortNameRu: "САО «ВСК»", fullNameRu: "Страховое акционерное общество «ВСК»",
		inn: "7710026574", ogrn: "1027700186062", kpp: "773101001", phone: "8 800 775-77-51", email: "dms@vsk.ru",
		websiteUrl: "https://www.vsk.ru", defaultFranchiseRates: [0, 10, 20, 30],
		descriptionRu: "Страховой дом ВСК. Крупный федеральный оператор программ ДМС корпораций.",
	},
	{
		id: "soglasie", shortNameRu: "ООО «СК «Согласие»", fullNameRu: "Общество с ограниченной ответственностью «Страховая Компания «Согласие»",
		inn: "7706070733", ogrn: "1027700032700", kpp: "772901001", phone: "8 800 755-00-01", email: "dms_expert@soglasie.ru",
		websiteUrl: "https://www.soglasie.ru", defaultFranchiseRates: [0, 10, 20, 50],
		descriptionRu: "Федеральная страховая компания с программами ДМС и стоматологии.",
	},
	{
		id: "rosgosstrakh", shortNameRu: "ПАО СК «Росгосстрах»", fullNameRu: "Публичное акционерное общество Страховая Компания «Росгосстрах»",
		inn: "7707067683", ogrn: "1027739049637", kpp: "502701001", phone: "8 800 200-09-00", email: "dms@rgs.ru",
		websiteUrl: "https://www.rgs.ru", defaultFranchiseRates: [0, 20, 30],
		descriptionRu: "Старейшая страховая организация России с филиальной сетью во всех субъектах РФ.",
	},
	{
		id: "kapital_life", shortNameRu: "ООО «Капитал Лайф Страхование Жизни»", fullNameRu: "ООО «Капитал Лайф Страхование Жизни»",
		inn: "7706548313", ogrn: "1047796614700", kpp: "772501001", phone: "8 800 200-68-86", email: "med@kaplife.ru",
		websiteUrl: "https://www.kaplife.ru", defaultFranchiseRates: [0, 10, 20],
		descriptionRu: "Специализированный страховщик жизни и здоровья со стоматологическими программами.",
	},
];

export function getDmsInsuranceCompanyById(id: string): DmsInsuranceCompany | undefined {
	return DMS_INSURANCE_COMPANIES_CATALOG.find((c) => c.id === id);
}

export function findDmsInsuranceCompanyByInn(inn: string): DmsInsuranceCompany | undefined {
	const cleaned = inn.trim().replace(/\D/g, "");
	return DMS_INSURANCE_COMPANIES_CATALOG.find((c) => c.inn === cleaned);
}
