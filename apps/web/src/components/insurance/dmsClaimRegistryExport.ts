/**
 * dmsClaimRegistryExport.ts — Финансово-математические генераторы реестров ДМС
 * (XML ЕГИСЗ/ДМС-2026, RFC 4180 CSV с UTF-8 BOM, печатный бланк А4) и справочные контракты.
 *
 * Инварианты:
 * 1. Копеечная точность расчетов (целочисленная арифметика без дрейфа IEEE-754).
 * 2. 1-клик экспорт реестра в XML, CSV/Excel и печать счета-реестра А4.
 * 3. 100% покрытие типов TypeScript без 'any'.
 */

export interface DmsInsuranceContractRecord {
	readonly id: string;
	readonly insurerKey: string;
	readonly insurerShortName: string;
	readonly insurerFullName: string;
	readonly inn: string;
	readonly ogrn: string;
	readonly kpp: string;
	readonly contractNumber: string;
	readonly contractDate: string; // YYYY-MM-DD
	readonly validUntil: string; // YYYY-MM-DD
	readonly defaultFranchisePct: number; // 0..100%
	readonly curatorFullName: string;
	readonly curatorPhone: string;
	readonly curatorEmail: string;
	readonly portalUrl: string;
	readonly slaHours: number;
	readonly status: "active" | "expiring_soon" | "suspended" | "draft";
	readonly notes?: string | undefined;
}

export interface DmsRegistryItemRecord {
	readonly id: string;
	readonly visitId: string;
	readonly visitDate: string; // YYYY-MM-DD
	readonly patientFullName: string;
	readonly policyNumber: string;
	readonly guaranteeLetterNumber?: string | undefined;
	readonly insurerKey: string;
	readonly insurerName: string;
	readonly serviceCode804n: string;
	readonly serviceName: string;
	readonly toothNumber?: string | number | undefined;
	readonly diagnosisMkb10: string;
	readonly doctorFullName: string;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly totalPriceKopecks: number;
	readonly dmsCoveredKopecks: number;
	readonly patientPaidKopecks: number;
	readonly isExcluded: boolean;
	readonly status: "accepted" | "pending_expert" | "copay_required" | "rejected";
}

export interface ClinicLegalProfile {
	readonly legalName: string;
	readonly brandName: string;
	readonly inn: string;
	readonly ogrn: string;
	readonly kpp: string;
	readonly address: string;
	readonly phone: string;
	readonly licenseNumber: string;
	readonly licenseDate: string;
	readonly chiefDoctorFullName: string;
	readonly chiefAccountantFullName?: string | undefined;
	readonly bankName?: string | undefined;
	readonly bankBic?: string | undefined;
	readonly bankAccount?: string | undefined;
}

/** Предустановленные договоры с топ-6 страховыми компаниями РФ */
export const DEFAULT_STATUTORY_INSURANCE_CONTRACTS: readonly DmsInsuranceContractRecord[] = [
	{
		id: "cnt-sogaz-2026",
		insurerKey: "sogaz",
		insurerShortName: "АО «СОГАЗ»",
		insurerFullName: "Акционерное общество «Страховое общество газовой промышленности»",
		inn: "7736035485",
		ogrn: "1027739820921",
		kpp: "770801001",
		contractNumber: "СГЗ-2026/ДМС-881",
		contractDate: "2026-01-10",
		validUntil: "2026-12-31",
		defaultFranchisePct: 0,
		curatorFullName: "Смирнова Елена Викторовна",
		curatorPhone: "8 (800) 333-08-88 доб. 114",
		curatorEmail: "dms-expert@sogaz.ru",
		portalUrl: "https://b2b.sogaz.ru",
		slaHours: 24,
		status: "active",
		notes: "100% покрытие терапии и хирургии. Эндодонтия по согласованию с прицельным снимком.",
	},
	{
		id: "cnt-alfa-2026",
		insurerKey: "alfastrakhovanie",
		insurerShortName: "АО «АльфаСтрахование»",
		insurerFullName: "Акционерное общество «АльфаСтрахование»",
		inn: "7713056834",
		ogrn: "1027739795909",
		kpp: "772501001",
		contractNumber: "АЛЬФА-МЕД-26/1042",
		contractDate: "2026-01-15",
		validUntil: "2026-12-31",
		defaultFranchisePct: 10,
		curatorFullName: "Михайлова Татьяна Анатольевна",
		curatorPhone: "8 (800) 333-0-999 доб. 208",
		curatorEmail: "curator_dms@alfastrah.ru",
		portalUrl: "https://dms.alfastrah.ru",
		slaHours: 24,
		status: "active",
		notes: "Цифровой B2B API шлюз. Базовая франшиза 10% на сложное эндодонтическое лечение.",
	},
	{
		id: "cnt-ingos-2026",
		insurerKey: "ingosstrakh",
		insurerShortName: "СПАО «Ингосстрах»",
		insurerFullName: "Страховое публичное акционерное общество «Ингосстрах»",
		inn: "7705042179",
		ogrn: "1027739362474",
		kpp: "770501001",
		contractNumber: "ИНГ-ДМС-2026/4120",
		contractDate: "2026-02-01",
		validUntil: "2027-01-31",
		defaultFranchisePct: 15,
		curatorFullName: "Воронов Михаил Петрович",
		curatorPhone: "8 (495) 956-55-55 доб. 881",
		curatorEmail: "med@ingos.ru",
		portalUrl: "https://med.ingos.ru",
		slaHours: 48,
		status: "active",
		notes: "Обязательное кодирование всех манипуляций строго по Номенклатуре 804н.",
	},
	{
		id: "cnt-reso-2026",
		insurerKey: "reso_garantiya",
		insurerShortName: "СПАО «РЕСО-Гарантия»",
		insurerFullName: "Страховое публичное акционерное общество «РЕСО-Гарантия»",
		inn: "7710045520",
		ogrn: "1027700042413",
		kpp: "771001001",
		contractNumber: "РЕСО-СТОМ-26/9011",
		contractDate: "2026-01-12",
		validUntil: "2026-12-31",
		defaultFranchisePct: 0,
		curatorFullName: "Алексеева Анна Сергеевна",
		curatorPhone: "8 (800) 234-18-02 доб. 504",
		curatorEmail: "dms-expert@reso.ru",
		portalUrl: "https://dms.reso.ru",
		slaHours: 24,
		status: "active",
		notes: "Кураторская экспертиза счетов. Лимит на терапевтическое лечение до 150 000 руб.",
	},
	{
		id: "cnt-vsk-2026",
		insurerKey: "vsk",
		insurerShortName: "САО «ВСК»",
		insurerFullName: "Страховое акционерное общество «ВСК»",
		inn: "7710026574",
		ogrn: "1027700186062",
		kpp: "773101001",
		contractNumber: "ВСК-МЕД-2026/0883",
		contractDate: "2026-01-20",
		validUntil: "2026-12-31",
		defaultFranchisePct: 20,
		curatorFullName: "Ковалев Дмитрий Игоревич",
		curatorPhone: "8 (800) 775-77-51 доб. 331",
		curatorEmail: "dms_claims@vsk.ru",
		portalUrl: "https://b2b.vsk.ru",
		slaHours: 48,
		status: "active",
		notes: "Франшиза 20% на хирургические вмешательства и профессиональную гигиену.",
	},
	{
		id: "cnt-soglasie-2026",
		insurerKey: "soglasie",
		insurerShortName: "ООО «СК «Согласие»",
		insurerFullName: "Общество с ограниченной ответственностью «Страховая Компания «Согласие»",
		inn: "7706070733",
		ogrn: "1027700032700",
		kpp: "772901001",
		contractNumber: "СОГЛ-2026/СТОМ-339",
		contractDate: "2026-02-15",
		validUntil: "2027-02-14",
		defaultFranchisePct: 0,
		curatorFullName: "Новиков Кирилл Сергеевич",
		curatorPhone: "8 (800) 755-00-01 доб. 720",
		curatorEmail: "dms-info@soglasie.ru",
		portalUrl: "https://lk.soglasie.ru",
		slaHours: 48,
		status: "active",
		notes: "Плановая терапия и купирование острой боли. Строгая проверка обоснований депульпирования.",
	},
];

/** Демонстрационный ежемесячный реестр оказанных услуг по ДМС */
export const DEFAULT_MONTHLY_DMS_REGISTRY_RECORDS: readonly DmsRegistryItemRecord[] = [
	{
		id: "reg-rec-001",
		visitId: "vis-8801",
		visitDate: "2026-08-04",
		patientFullName: "Иванов Сергей Алексеевич",
		policyNumber: "СГЗ-77-991283",
		guaranteeLetterNumber: "ГП-СОГАЗ-2026-8812",
		insurerKey: "sogaz",
		insurerName: "АО «СОГАЗ»",
		serviceCode804n: "A16.07.002.001",
		serviceName: "Восстановление зуба пломбой световой I класс по Блэку",
		toothNumber: "1.6",
		diagnosisMkb10: "K02.1",
		doctorFullName: "Петров А.В.",
		quantity: 1,
		unitPriceKopecks: 450000,
		totalPriceKopecks: 450000,
		dmsCoveredKopecks: 450000,
		patientPaidKopecks: 0,
		isExcluded: false,
		status: "accepted",
	},
	{
		id: "reg-rec-002",
		visitId: "vis-8801",
		visitDate: "2026-08-04",
		patientFullName: "Иванов Сергей Алексеевич",
		policyNumber: "СГЗ-77-991283",
		guaranteeLetterNumber: "ГП-СОГАЗ-2026-8812",
		insurerKey: "sogaz",
		insurerName: "АО «СОГАЗ»",
		serviceCode804n: "A11.07.010",
		serviceName: "Инъекционное введение анестетика (инфильтрационная анестезия)",
		toothNumber: "1.6",
		diagnosisMkb10: "K02.1",
		doctorFullName: "Петров А.В.",
		quantity: 1,
		unitPriceKopecks: 95000,
		totalPriceKopecks: 95000,
		dmsCoveredKopecks: 95000,
		patientPaidKopecks: 0,
		isExcluded: false,
		status: "accepted",
	},
	{
		id: "reg-rec-003",
		visitId: "vis-8802",
		visitDate: "2026-08-08",
		patientFullName: "Смирнова Елена Викторовна",
		policyNumber: "ИНГ-902-11487",
		guaranteeLetterNumber: "ИНГОС-МЕД-26-44091",
		insurerKey: "ingosstrakh",
		insurerName: "СПАО «Ингосстрах»",
		serviceCode804n: "A16.07.030.001",
		serviceName: "Инструментальная и медикаментозная обработка 2 каналов",
		toothNumber: "2.4",
		diagnosisMkb10: "K04.0",
		doctorFullName: "Кузнецова М.И.",
		quantity: 2,
		unitPriceKopecks: 210000,
		totalPriceKopecks: 420000,
		dmsCoveredKopecks: 357000,
		patientPaidKopecks: 63000,
		isExcluded: false,
		status: "copay_required",
	},
	{
		id: "reg-rec-004",
		visitId: "vis-8802",
		visitDate: "2026-08-08",
		patientFullName: "Смирнова Елена Викторовна",
		policyNumber: "ИНГ-902-11487",
		guaranteeLetterNumber: "ИНГОС-МЕД-26-44091",
		insurerKey: "ingosstrakh",
		insurerName: "СПАО «Ингосстрах»",
		serviceCode804n: "A16.07.008.002",
		serviceName: "Пломбирование 2 корневых каналов гуттаперчей",
		toothNumber: "2.4",
		diagnosisMkb10: "K04.0",
		doctorFullName: "Кузнецова М.И.",
		quantity: 2,
		unitPriceKopecks: 240000,
		totalPriceKopecks: 480000,
		dmsCoveredKopecks: 408000,
		patientPaidKopecks: 72000,
		isExcluded: false,
		status: "copay_required",
	},
	{
		id: "reg-rec-005",
		visitId: "vis-8803",
		visitDate: "2026-08-11",
		patientFullName: "Петров Василий Николаевич",
		policyNumber: "РЕСО-994-0012",
		guaranteeLetterNumber: "РЕСО-ГАРАНТ-88210",
		insurerKey: "reso_garantiya",
		insurerName: "СПАО «РЕСО-Гарантия»",
		serviceCode804n: "A16.07.051",
		serviceName: "Профессиональная гигиена полости рта и зубов (комплекс УЗ + AirFlow)",
		diagnosisMkb10: "K05.1",
		doctorFullName: "Петров А.В.",
		quantity: 1,
		unitPriceKopecks: 550000,
		totalPriceKopecks: 550000,
		dmsCoveredKopecks: 550000,
		patientPaidKopecks: 0,
		isExcluded: false,
		status: "accepted",
	},
	{
		id: "reg-rec-006",
		visitId: "vis-8804",
		visitDate: "2026-08-15",
		patientFullName: "Ковалева Анна Сергеевна",
		policyNumber: "АЛЬФА-551029",
		guaranteeLetterNumber: "АЛЬФА-ГП-9031",
		insurerKey: "alfastrakhovanie",
		insurerName: "АО «АльфаСтрахование»",
		serviceCode804n: "A16.07.001.002",
		serviceName: "Удаление ретинированного зуба мудрости сложное",
		toothNumber: "3.8",
		diagnosisMkb10: "K01.1",
		doctorFullName: "Соколов В.Д.",
		quantity: 1,
		unitPriceKopecks: 850000,
		totalPriceKopecks: 850000,
		dmsCoveredKopecks: 765000,
		patientPaidKopecks: 85000,
		isExcluded: false,
		status: "copay_required",
	},
	{
		id: "reg-rec-007",
		visitId: "vis-8805",
		visitDate: "2026-08-19",
		patientFullName: "Николаев Роман Павлович",
		policyNumber: "ВСК-8812903",
		insurerKey: "vsk",
		insurerName: "САО «ВСК»",
		serviceCode804n: "A06.07.004",
		serviceName: "Ортопантомография челюстей (панорамный снимок ОПТГ)",
		diagnosisMkb10: "K04.5",
		doctorFullName: "Михайлов К.Е.",
		quantity: 1,
		unitPriceKopecks: 180000,
		totalPriceKopecks: 180000,
		dmsCoveredKopecks: 144000,
		patientPaidKopecks: 36000,
		isExcluded: false,
		status: "copay_required",
	},
	{
		id: "reg-rec-008",
		visitId: "vis-8806",
		visitDate: "2026-08-22",
		patientFullName: "Григорьев Максим Юрьевич",
		policyNumber: "СОГЛ-99018",
		insurerKey: "soglasie",
		insurerName: "ООО «СК «Согласие»",
		serviceCode804n: "A16.07.004",
		serviceName: "Наложение девитализирующей пасты (неотложная помощь)",
		toothNumber: "4.7",
		diagnosisMkb10: "K04.0",
		doctorFullName: "Кузнецова М.И.",
		quantity: 1,
		unitPriceKopecks: 150000,
		totalPriceKopecks: 150000,
		dmsCoveredKopecks: 150000,
		patientPaidKopecks: 0,
		isExcluded: false,
		status: "accepted",
	},
];

export const DEFAULT_CLINIC_PROFILE: ClinicLegalProfile = {
	legalName: "ООО «Стоматологический Центр «ДЕНТЕ»",
	brandName: "Стоматологическая клиника DENTE",
	inn: "7701984210",
	ogrn: "1157746890123",
	kpp: "770101001",
	address: "107078, г. Москва, ул. Большая Спасская, д. 12, стр. 1",
	phone: "+7 (495) 789-20-20",
	licenseNumber: "ЛО41-01137-77/00589123",
	licenseDate: "15.03.2021",
	chiefDoctorFullName: "Д-р Смирнов Константин Владимирович",
	chiefAccountantFullName: "Васильева Ольга Николаевна",
	bankName: "ПАО СБЕРБАНК г. Москва",
	bankBic: "044525225",
	bankAccount: "40702810438000012345",
};

/** Форматирование копеек в рубли с разделителями тысяч */
export function formatKopecksToRub(kopecks: number): string {
	const rub = Math.round(kopecks) / 100;
	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(rub);
}

/** Форматирование рублей без копеек */
export function formatRubInt(kopecks: number): string {
	const rub = Math.round(kopecks / 100);
	return new Intl.NumberFormat("ru-RU").format(rub) + " ₽";
}

function escapeXml(unsafe: string): string {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/** Генератор XML-реестра ДМС по формату ЕГИСЗ / ДМС-2026 */
export function generateDmsRegistryXml(
	records: readonly DmsRegistryItemRecord[],
	clinic: ClinicLegalProfile,
	selectedInsurer: DmsInsuranceContractRecord | undefined,
	periodStr: string,
	registryNumber: string,
): string {
	const nowIso = new Date().toISOString();
	const totalBillKop = records.reduce((acc, r) => acc + r.totalPriceKopecks, 0);
	const totalDmsKop = records.reduce((acc, r) => acc + r.dmsCoveredKopecks, 0);
	const totalPatientKop = records.reduce((acc, r) => acc + r.patientPaidKopecks, 0);
	const uniquePatients = new Set(records.map((r) => r.patientFullName)).size;

	const itemsXml = records
		.map((r, idx) => {
			const toothTag = r.toothNumber ? `\n      <ToothFdi>${r.toothNumber}</ToothFdi>` : "";
			const letterTag = r.guaranteeLetterNumber
				? `\n      <GuaranteeLetterNumber>${escapeXml(r.guaranteeLetterNumber)}</GuaranteeLetterNumber>`
				: "";

			return `    <Item index="${idx + 1}">
      <VisitId>${escapeXml(r.visitId)}</VisitId>
      <VisitDate>${r.visitDate}</VisitDate>
      <Patient>
        <FullName>${escapeXml(r.patientFullName)}</FullName>
        <PolicyNumber>${escapeXml(r.policyNumber)}</PolicyNumber>${letterTag}
      </Patient>
      <Insurer>
        <Key>${escapeXml(r.insurerKey)}</Key>
        <Name>${escapeXml(r.insurerName)}</Name>
      </Insurer>
      <ClinicalData>
        <ServiceCode804n>${escapeXml(r.serviceCode804n)}</ServiceCode804n>
        <ServiceName>${escapeXml(r.serviceName)}</ServiceName>${toothTag}
        <DiagnosisMkb10>${escapeXml(r.diagnosisMkb10)}</DiagnosisMkb10>
        <AttendingDoctor>${escapeXml(r.doctorFullName)}</AttendingDoctor>
      </ClinicalData>
      <FinancialData>
        <Quantity>${r.quantity}</Quantity>
        <UnitPriceKopecks>${r.unitPriceKopecks}</UnitPriceKopecks>
        <TotalPriceKopecks>${r.totalPriceKopecks}</TotalPriceKopecks>
        <DmsCoveredKopecks>${r.dmsCoveredKopecks}</DmsCoveredKopecks>
        <PatientPaidKopecks>${r.patientPaidKopecks}</PatientPaidKopecks>
        <DmsCoveredRubles>${(r.dmsCoveredKopecks / 100).toFixed(2)}</DmsCoveredRubles>
        <PatientPaidRubles>${(r.patientPaidKopecks / 100).toFixed(2)}</PatientPaidRubles>
        <VatExemption>пп. 2 п. 2 ст. 149 НК РФ</VatExemption>
      </FinancialData>
      <Status>${r.status}</Status>
    </Item>`;
		})
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<DmsReconciliationRegistry version="2.0" timestamp="${nowIso}" xmlns="urn:dental-crm:dms:registry:2026">
  <Header>
    <RegistryNumber>${escapeXml(registryNumber)}</RegistryNumber>
    <CreationDate>${nowIso.slice(0, 10)}</CreationDate>
    <Period>${escapeXml(periodStr)}</Period>
    <Clinic>
      <LegalName>${escapeXml(clinic.legalName)}</LegalName>
      <BrandName>${escapeXml(clinic.brandName)}</BrandName>
      <INN>${escapeXml(clinic.inn)}</INN>
      <OGRN>${escapeXml(clinic.ogrn)}</OGRN>
      <KPP>${escapeXml(clinic.kpp)}</KPP>
      <Address>${escapeXml(clinic.address)}</Address>
      <Phone>${escapeXml(clinic.phone)}</Phone>
      <License>${escapeXml(clinic.licenseNumber)} от ${escapeXml(clinic.licenseDate)}</License>
      <ChiefDoctor>${escapeXml(clinic.chiefDoctorFullName)}</ChiefDoctor>
    </Clinic>
    <TargetInsurer>
      <Key>${escapeXml(selectedInsurer?.insurerKey || "all")}</Key>
      <Name>${escapeXml(selectedInsurer?.insurerShortName || "Сводный реестр (все компании)")}</Name>
      <INN>${escapeXml(selectedInsurer?.inn || "")}</INN>
      <ContractNumber>${escapeXml(selectedInsurer?.contractNumber || "По соглашению")}</ContractNumber>
      <ContractDate>${escapeXml(selectedInsurer?.contractDate || "")}</ContractDate>
    </TargetInsurer>
  </Header>
  <Summary>
    <TotalServicesCount>${records.length}</TotalServicesCount>
    <UniquePatientsCount>${uniquePatients}</UniquePatientsCount>
    <GrandTotalBillKopecks>${totalBillKop}</GrandTotalBillKopecks>
    <GrandTotalBillRubles>${(totalBillKop / 100).toFixed(2)}</GrandTotalBillRubles>
    <GrandTotalDmsCoveredKopecks>${totalDmsKop}</GrandTotalDmsCoveredKopecks>
    <GrandTotalDmsCoveredRubles>${(totalDmsKop / 100).toFixed(2)}</GrandTotalDmsCoveredRubles>
    <GrandTotalPatientPaidKopecks>${totalPatientKop}</GrandTotalPatientPaidKopecks>
    <GrandTotalPatientPaidRubles>${(totalPatientKop / 100).toFixed(2)}</GrandTotalPatientPaidRubles>
    <IntegrityInvariantVerified>${totalBillKop === totalDmsKop + totalPatientKop}</IntegrityInvariantVerified>
    <VatExemptionLaw>Без НДС (пп. 2 п. 2 ст. 149 Налогового кодекса РФ)</VatExemptionLaw>
  </Summary>
  <Items count="${records.length}">
${itemsXml}
  </Items>
</DmsReconciliationRegistry>`;
}

/** Генератор CSV-реестра (RFC 4180 с UTF-8 BOM для 1C/Excel) */
export function generateDmsRegistryCsv(
	records: readonly DmsRegistryItemRecord[],
	clinic: ClinicLegalProfile,
	selectedInsurerTitle: string,
	periodStr: string,
): string {
	const headers = [
		"№ п/п",
		"Дата визита",
		"Ф.И.О. Застрахованного",
		"Номер полиса ДМС",
		"Гарантийное письмо",
		"Страховая компания",
		"Код услуги (804н)",
		"Наименование медицинской услуги",
		"Зуб (FDI)",
		"Диагноз (МКБ-10)",
		"Лечащий врач",
		"Кол-во",
		"Тариф (руб)",
		"Сумма по прейскуранту (руб)",
		"К оплате ДМС (руб)",
		"Сооплата пациента (руб)",
		"Ставка НДС",
		"Статус",
	];

	const rows: string[] = [headers.join(";")];

	records.forEach((r, idx) => {
		const row = [
			(idx + 1).toString(),
			r.visitDate,
			`"${r.patientFullName.replace(/"/g, '""')}"`,
			`"${r.policyNumber.replace(/"/g, '""')}"`,
			`"${(r.guaranteeLetterNumber || "").replace(/"/g, '""')}"`,
			`"${r.insurerName.replace(/"/g, '""')}"`,
			r.serviceCode804n,
			`"${r.serviceName.replace(/"/g, '""')}"`,
			r.toothNumber ? r.toothNumber.toString() : "",
			r.diagnosisMkb10,
			`"${r.doctorFullName.replace(/"/g, '""')}"`,
			r.quantity.toString(),
			(r.unitPriceKopecks / 100).toFixed(2),
			(r.totalPriceKopecks / 100).toFixed(2),
			(r.dmsCoveredKopecks / 100).toFixed(2),
			(r.patientPaidKopecks / 100).toFixed(2),
			"Без НДС (пп. 2 п. 2 ст. 149 НК РФ)",
			r.status === "accepted" ? "Принято" : r.status === "copay_required" ? "Франшиза/Доплата" : "На экспертизе",
		];
		rows.push(row.join(";"));
	});

	// Итоговые суммы
	const totalBill = records.reduce((acc, r) => acc + r.totalPriceKopecks, 0) / 100;
	const totalDms = records.reduce((acc, r) => acc + r.dmsCoveredKopecks, 0) / 100;
	const totalPatient = records.reduce((acc, r) => acc + r.patientPaidKopecks, 0) / 100;

	rows.push(
		[
			"ИТОГО ПО РЕЕСТРУ",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			records.length.toString(),
			"",
			totalBill.toFixed(2),
			totalDms.toFixed(2),
			totalPatient.toFixed(2),
			"",
			"",
		].join(";"),
	);

	return `\uFEFF${rows.join("\r\n")}`;
}

/** Генератор печатного бланка Счета-реестра и двустороннего Акта сдачи-приемки А4 */
export function generateDmsA4PrintableHtml(
	records: readonly DmsRegistryItemRecord[],
	clinic: ClinicLegalProfile,
	selectedContract: DmsInsuranceContractRecord | undefined,
	periodStr: string,
	registryNumber: string,
): string {
	const totalBillKop = records.reduce((acc, r) => acc + r.totalPriceKopecks, 0);
	const totalDmsKop = records.reduce((acc, r) => acc + r.dmsCoveredKopecks, 0);
	const totalPatientKop = records.reduce((acc, r) => acc + r.patientPaidKopecks, 0);
	const uniquePatients = new Set(records.map((r) => r.patientFullName)).size;
	const currentDateStr = new Date().toLocaleDateString("ru-RU");

	const insurerTitle = selectedContract
		? `${selectedContract.insurerShortName} (${selectedContract.insurerFullName})`
		: "Страховые компании ДМС (Сводный реестр)";
	const insurerInn = selectedContract?.inn || clinic.inn;
	const insurerKpp = selectedContract?.kpp || "770101001";
	const contractInfo = selectedContract
		? `по Договору ДМС № ${selectedContract.contractNumber} от ${selectedContract.contractDate}`
		: "по Договорам на оказание медицинских услуг ДМС";

	const tableRowsHtml = records
		.map((r, i) => {
			return `<tr>
        <td style="text-align: center;">${i + 1}</td>
        <td>${r.visitDate}</td>
        <td><strong>${escapeXml(r.patientFullName)}</strong><br><span style="font-size: 10px; color: #475569;">Полис: ${escapeXml(r.policyNumber)}</span></td>
        <td style="font-family: monospace; font-weight: 600;">${escapeXml(r.serviceCode804n)}</td>
        <td>${escapeXml(r.serviceName)}${r.toothNumber ? ` (Зуб ${r.toothNumber})` : ""}</td>
        <td style="text-align: center;">${escapeXml(r.diagnosisMkb10)}</td>
        <td style="text-align: center;">${r.quantity}</td>
        <td style="text-align: right;">${(r.totalPriceKopecks / 100).toFixed(2)}</td>
        <td style="text-align: right; font-weight: 700; color: #0284c7;">${(r.dmsCoveredKopecks / 100).toFixed(2)}</td>
        <td style="text-align: right; color: #d97706;">${(r.patientPaidKopecks / 100).toFixed(2)}</td>
      </tr>`;
		})
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Счет-реестр медицинских услуг по ДМС № ${registryNumber}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #0f172a; line-height: 1.4; margin: 0; padding: 24px; }
    .header-box { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
    .clinic-head { font-size: 14px; font-weight: 800; text-transform: uppercase; color: #0f172a; }
    .doc-main-title { font-size: 16px; font-weight: 800; text-align: center; text-transform: uppercase; margin: 16px 0 4px; letter-spacing: 0.5px; }
    .doc-sub { text-align: center; font-size: 11px; color: #475569; margin-bottom: 16px; }
    .parties-grid { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 14px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; font-size: 11px; }
    .party-col { width: 48%; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10.5px; }
    th, td { border: 1px solid #94a3b8; padding: 5px 7px; }
    th { background: #f1f5f9; font-weight: 700; text-align: left; }
    .totals-row { background: #f8fafc; font-weight: 800; font-size: 11px; }
    .act-section { margin-top: 28px; page-break-inside: avoid; }
    .act-title { font-size: 13px; font-weight: 800; text-align: center; text-transform: uppercase; margin-bottom: 8px; }
    .signatures { display: flex; justify-content: space-between; margin-top: 36px; page-break-inside: avoid; }
    .sig-col { width: 45%; }
    .sig-line { border-top: 1px solid #0f172a; margin-top: 32px; padding-top: 4px; font-size: 10px; text-align: center; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header-box">
    <div class="clinic-head">${clinic.legalName} (${clinic.brandName})</div>
    <div style="font-size: 10px; color: #475569;">
      ИНН: ${clinic.inn} | ОГРН: ${clinic.ogrn} | КПП: ${clinic.kpp} | Лицензия: ${clinic.licenseNumber} от ${clinic.licenseDate}<br>
      Адрес: ${clinic.address} | Тел: ${clinic.phone} | Р/с: ${clinic.bankAccount || "40702810438000012345"} в ${clinic.bankName || "ПАО Сбербанк"} (БИК: ${clinic.bankBic || "044525225"})
    </div>
  </div>

  <div class="doc-main-title">СЧЕТ-РЕЕСТР МЕДИЦИНСКИХ УСЛУГ ПО ДМС № ${registryNumber}</div>
  <div class="doc-sub">Период оказания услуг: <strong>${periodStr}</strong> | Дата формирования: «${currentDateStr}» г.</div>

  <div class="parties-grid">
    <div class="party-col">
      <strong>ИСПОЛНИТЕЛЬ (Медицинская организация):</strong><br>
      ${clinic.legalName}<br>
      ИНН/КПП: ${clinic.inn} / ${clinic.kpp}<br>
      Главный врач: ${clinic.chiefDoctorFullName}
    </div>
    <div class="party-col">
      <strong>ЗАКАЗЧИК (Страховая организация):</strong><br>
      ${insurerTitle}<br>
      ИНН/КПП: ${insurerInn} / ${insurerKpp}<br>
      Основание: ${contractInfo}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 25px; text-align: center;">№</th>
        <th style="width: 65px;">Дата</th>
        <th style="width: 140px;">Застрахованный / Полис</th>
        <th style="width: 80px;">Код 804н</th>
        <th>Наименование медицинской услуги</th>
        <th style="width: 50px; text-align: center;">МКБ</th>
        <th style="width: 35px; text-align: center;">Кол</th>
        <th style="width: 75px; text-align: right;">Всего (руб)</th>
        <th style="width: 80px; text-align: right;">ДМС (руб)</th>
        <th style="width: 75px; text-align: right;">Доплата (руб)</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
      <tr class="totals-row">
        <td colspan="7" style="text-align: right;">ИТОГО ПО РЕЕСТРУ:</td>
        <td style="text-align: right;">${(totalBillKop / 100).toFixed(2)}</td>
        <td style="text-align: right; color: #0284c7;">${(totalDmsKop / 100).toFixed(2)}</td>
        <td style="text-align: right; color: #d97706;">${(totalPatientKop / 100).toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-top: 10px; font-size: 11px;">
    <strong>ИТОГО К ОПЛАТЕ СТРАХОВЩИКОМ:</strong> <span style="font-size: 13px; font-weight: 800; color: #0284c7;">${formatKopecksToRub(totalDmsKop)}</span><br>
    <em>НДС не облагается на основании подпункта 2 пункта 2 статьи 149 Налогового кодекса Российской Федерации.</em><br>
    Обслужено застрахованных пациентов: <strong>${uniquePatients} чел.</strong> | Оказано медицинских услуг: <strong>${records.length} ед.</strong>
  </div>

  <div class="act-section">
    <div class="act-title">ДВУСТОРОННИЙ АКТ СДАЧИ-ПРИЕМКИ ОКАЗАННЫХ УСЛУГ</div>
    <div style="text-align: justify; text-indent: 18px; margin-bottom: 8px;">
      Мы, нижеподписавшиеся, представитель Исполнителя Главный врач <strong>${clinic.chiefDoctorFullName}</strong>, с одной стороны, и уполномоченный представитель Страховщика, с другой стороны, подтверждаем, что медицинские стоматологические услуги за отчетный период <strong>${periodStr}</strong> по Счёту-реестру № <strong>${registryNumber}</strong> оказаны в полном объеме, надлежащего качества и в установленный срок. Взаимных финансовых и медицинских претензий Стороны не имеют.
    </div>

    <div class="signatures">
      <div class="sig-col">
        <strong>ОТ ИСПОЛНИТЕЛЯ:</strong><br>
        Главный врач ${clinic.legalName}<br><br>
        _________________ / ${clinic.chiefDoctorFullName} /<br>
        <div class="sig-line">М.П. &nbsp;&nbsp;&nbsp;&nbsp; «___» ___________ 2026 г.</div>
      </div>
      <div class="sig-col">
        <strong>ОТ СТРАХОВЩИКА:</strong><br>
        Куратор направления ДМС<br><br>
        _________________ / _____________________ /<br>
        <div class="sig-line">М.П. &nbsp;&nbsp;&nbsp;&nbsp; «___» ___________ 2026 г.</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
