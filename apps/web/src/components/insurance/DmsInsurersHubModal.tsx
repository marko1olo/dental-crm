/**
 * DmsInsurersHubModal.tsx — Единый хаб управления ДМС, справочник страховых компаний РФ,
 * реестры счетов за месяц с номенклатурой 804н, 1-клик экспорт в XML/CSV и печать бланка А4.
 *
 * Инварианты:
 * 1. Копеечная точность расчетов (целочисленная арифметика без дрейфа IEEE-754).
 * 2. 1-клик экспорт реестра в XML (схема ЕГИСЗ/ДМС-2026), CSV/Excel (UTF-8 BOM) и печать счета-реестра А4.
 * 3. Поддержка дизайн-системы DENTE (var(--paper), var(--teal), var(--ink)) и Dark/Light тем.
 * 4. Медицинская плотность и тач-таргеты >= 44x44px.
 */

import {
	AlertCircle,
	Building2,
	Calendar,
	CheckCircle2,
	Download,
	Edit3,
	ExternalLink,
	Eye,
	FileCode2,
	FileSpreadsheet,
	FileText,
	Filter,
	Layers,
	Mail,
	Percent,
	Phone,
	Plus,
	Printer,
	Search,
	Shield,
	ShieldCheck,
	Sparkles,
	TrendingUp,
	Users,
	X,
} from "lucide-react";
import React, { useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast";
import "./dmsInsurance.css";

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

export interface DmsInsurersHubModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: "insurers" | "registry" | "analytics";
	readonly initialContracts?: readonly DmsInsuranceContractRecord[] | undefined;
	readonly initialRegistryRecords?: readonly DmsRegistryItemRecord[] | undefined;
	readonly clinicInfo?: ClinicLegalProfile | undefined;
	readonly onSaveContract?: ((contract: DmsInsuranceContractRecord) => void) | undefined;
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
		dmsCoveredKopecks: 357000, // 85% ДМС
		patientPaidKopecks: 63000, // 15% Франшиза
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
		dmsCoveredKopecks: 408000, // 85% ДМС
		patientPaidKopecks: 72000, // 15% Франшиза
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
		dmsCoveredKopecks: 765000, // 90% ДМС
		patientPaidKopecks: 85000, // 10% Франшиза
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
		dmsCoveredKopecks: 144000, // 80% ДМС
		patientPaidKopecks: 36000, // 20% Франшиза
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

function escapeXml(unsafe: string): string {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export function DmsInsurersHubModal({
	isOpen,
	onClose,
	initialTab = "registry",
	initialContracts = DEFAULT_STATUTORY_INSURANCE_CONTRACTS,
	initialRegistryRecords = DEFAULT_MONTHLY_DMS_REGISTRY_RECORDS,
	clinicInfo = DEFAULT_CLINIC_PROFILE,
	onSaveContract,
}: DmsInsurersHubModalProps) {
	const searchFilterInputId = useId();
	const insurerFilterSelectId = useId();
	const periodSelectId = useId();
	const statusFilterSelectId = useId();

	// Вкладки: "insurers" (справочник), "registry" (реестры), "analytics" (аналитика)
	const [activeTab, setActiveTab] = useState<"insurers" | "registry" | "analytics">(initialTab);

	// Состояние договоров и реестра
	const [contracts, setContracts] = useState<readonly DmsInsuranceContractRecord[]>(initialContracts);
	const [records, setRecords] = useState<readonly DmsRegistryItemRecord[]>(initialRegistryRecords);

	// Фильтры реестра
	const [selectedInsurerKey, setSelectedInsurerKey] = useState<string>("all");
	const [selectedPeriod, setSelectedPeriod] = useState<string>("2026-08");
	const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");

	// Редактирование договора страховой компании
	const [editingContract, setEditingContract] = useState<DmsInsuranceContractRecord | null>(null);
	const [isEditContractModalOpen, setIsEditContractModalOpen] = useState<boolean>(false);

	if (!isOpen) return null;

	// Отфильтрованные записи реестра
	const filteredRecords = useMemo(() => {
		return records.filter((r) => {
			if (selectedInsurerKey !== "all" && r.insurerKey !== selectedInsurerKey) {
				return false;
			}
			if (selectedStatusFilter !== "all" && r.status !== selectedStatusFilter) {
				return false;
			}
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matches =
					r.patientFullName.toLowerCase().includes(q) ||
					r.policyNumber.toLowerCase().includes(q) ||
					(r.guaranteeLetterNumber && r.guaranteeLetterNumber.toLowerCase().includes(q)) ||
					r.serviceCode804n.toLowerCase().includes(q) ||
					r.serviceName.toLowerCase().includes(q) ||
					r.doctorFullName.toLowerCase().includes(q);
				if (!matches) return false;
			}
			return true;
		});
	}, [records, selectedInsurerKey, selectedStatusFilter, searchQuery]);

	// Финансовые агрегаты
	const totalBillKopecks = filteredRecords.reduce((acc, r) => acc + r.totalPriceKopecks, 0);
	const totalDmsKopecks = filteredRecords.reduce((acc, r) => acc + r.dmsCoveredKopecks, 0);
	const totalPatientKopecks = filteredRecords.reduce((acc, r) => acc + r.patientPaidKopecks, 0);
	const uniquePatientsCount = new Set(filteredRecords.map((r) => r.patientFullName)).size;
	const isBalanceValid = totalBillKopecks === totalDmsKopecks + totalPatientKopecks;

	const periodDisplayLabel =
		selectedPeriod === "2026-08"
			? "Август 2026 г."
			: selectedPeriod === "2026-07"
				? "Июль 2026 г."
				: "3 квартал 2026 г.";

	const currentRegistryNumber = `РЕЕСТР-2026-08/${selectedInsurerKey.toUpperCase().slice(0, 4)}`;
	const activeContractObj = contracts.find((c) => c.insurerKey === selectedInsurerKey);

	// 1-Клик Экспорт в XML
	const handleExportXml = () => {
		if (filteredRecords.length === 0) {
			showToast("Нет записей для формирования XML-реестра", "warning");
			return;
		}
		const xmlContent = generateDmsRegistryXml(
			filteredRecords,
			clinicInfo,
			activeContractObj,
			periodDisplayLabel,
			currentRegistryNumber,
		);

		const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		const filename = `DMS_Registry_${selectedInsurerKey}_${new Date().toISOString().slice(0, 10)}.xml`;
		link.setAttribute("href", url);
		link.setAttribute("download", filename);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);

		showToast(`XML-реестр ДМС (${filteredRecords.length} услуг) успешно сгенерирован и скачан`, "success");
	};

	// 1-Клик Экспорт в Excel / CSV
	const handleExportCsv = () => {
		if (filteredRecords.length === 0) {
			showToast("Нет записей для экспорта в CSV", "warning");
			return;
		}
		const csvContent = generateDmsRegistryCsv(
			filteredRecords,
			clinicInfo,
			activeContractObj?.insurerShortName || "Все страховые",
			periodDisplayLabel,
		);

		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		const filename = `DMS_Registry_${selectedInsurerKey}_${new Date().toISOString().slice(0, 10)}.csv`;
		link.setAttribute("href", url);
		link.setAttribute("download", filename);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);

		showToast(`Реестр ДМС успешно экспортирован в Excel (CSV с кодировкой UTF-8 BOM)`, "success");
	};

	// 1-Клик Печать счета-реестра А4
	const handlePrintA4 = () => {
		if (filteredRecords.length === 0) {
			showToast("Нет записей для формирования печатного счета-реестра", "warning");
			return;
		}
		const html = generateDmsA4PrintableHtml(
			filteredRecords,
			clinicInfo,
			activeContractObj,
			periodDisplayLabel,
			currentRegistryNumber,
		);

		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.open();
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 350);
		} else {
			showToast("Разрешите всплывающие окна в браузере для печати счета-реестра А4", "warning");
		}
	};

	// Сохранение отредактированного договора
	const handleSaveContractEdit = (updated: DmsInsuranceContractRecord) => {
		setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
		if (onSaveContract) {
			onSaveContract(updated);
		}
		setIsEditContractModalOpen(false);
		setEditingContract(null);
		showToast(`Договор с ${updated.insurerShortName} успешно обновлен`, "success");
	};

	return createPortal(
		<div className="dms-hub-backdrop" onClick={onClose} role="dialog" aria-modal="true">
			<div className="dms-hub-window" onClick={(e) => e.stopPropagation()}>
				{/* 1. Header */}
				<div className="dms-hub-header">
					<div className="dms-hub-title-group">
						<div className="dms-hub-icon-badge">
							<ShieldCheck size={26} />
						</div>
						<div>
							<h2 className="dms-hub-title">
								Управление ДМС и страховыми реестрами (Портал Страховщиков)
							</h2>
							<div className="dms-hub-subtitle">
								Справочник страховых компаний РФ, договоры, франшизы, реестры счетов по 804н и взаиморасчеты
							</div>
						</div>
					</div>

					<button
						type="button"
						className="dms-action-btn dms-action-btn-secondary dms-action-btn-icon-only"
						onClick={onClose}
						aria-label="Закрыть окно управления ДМС"
					>
						<X size={20} />
					</button>
				</div>

				{/* 2. Tabs Navigation */}
				<div style={{ padding: "12px 24px 0", background: "var(--paper, #ffffff)" }}>
					<div className="dms-tabs-nav">
						<button
							type="button"
							className={`dms-tab-button ${activeTab === "registry" ? "active" : ""}`}
							onClick={() => setActiveTab("registry")}
						>
							<FileSpreadsheet size={18} />
							Сводные реестры счетов за месяц
							<span style={{ fontSize: "0.75rem", background: "rgba(13, 148, 136, 0.15)", color: "var(--teal, #0d9488)", padding: "2px 8px", borderRadius: "10px" }}>
								{records.length}
							</span>
						</button>

						<button
							type="button"
							className={`dms-tab-button ${activeTab === "insurers" ? "active" : ""}`}
							onClick={() => setActiveTab("insurers")}
						>
							<Building2 size={18} />
							Справочник страховых компаний и договоров
							<span style={{ fontSize: "0.75rem", background: "rgba(100, 116, 139, 0.15)", padding: "2px 8px", borderRadius: "10px" }}>
								{contracts.length}
							</span>
						</button>

						<button
							type="button"
							className={`dms-tab-button ${activeTab === "analytics" ? "active" : ""}`}
							onClick={() => setActiveTab("analytics")}
						>
							<TrendingUp size={18} />
							Аналитика выплат и взаиморасчетов
						</button>
					</div>
				</div>

				{/* 3. Body */}
				<div className="dms-hub-body">
					{/* ==============================================================
					    ВКЛАДКА 1: СВОДНЫЕ РЕЕСТРЫ СЧЕТОВ
					   ============================================================== */}
					{activeTab === "registry" && (
						<>
							{/* Панель фильтрации */}
							<div className="dms-panel">
								<div className="dms-form-grid-3">
									<div className="dms-input-group">
										<label htmlFor={insurerFilterSelectId} className="dms-input-label">
											Страховая компания (ДМС)
										</label>
										<select
											id={insurerFilterSelectId}
											value={selectedInsurerKey}
											onChange={(e) => setSelectedInsurerKey(e.target.value)}
											className="dms-control-select"
										>
											<option value="all">Все страховые компании (Сводный реестр)</option>
											{contracts.map((c) => (
												<option key={c.insurerKey} value={c.insurerKey}>
													{c.insurerShortName} (Договор: {c.contractNumber}, Франшиза {c.defaultFranchisePct}%)
												</option>
											))}
										</select>
									</div>

									<div className="dms-input-group">
										<label htmlFor={periodSelectId} className="dms-input-label">
											Отчетный период
										</label>
										<select
											id={periodSelectId}
											value={selectedPeriod}
											onChange={(e) => setSelectedPeriod(e.target.value)}
											className="dms-control-select"
										>
											<option value="2026-08">Август 2026 г. (Текущий расчетный месяц)</option>
											<option value="2026-07">Июль 2026 г. (Предыдущий период)</option>
											<option value="2026-Q3">3 квартал 2026 года</option>
										</select>
									</div>

									<div className="dms-input-group">
										<label htmlFor={searchFilterInputId} className="dms-input-label">
											Быстрый поиск по реестру
										</label>
										<div style={{ position: "relative" }}>
											<Search size={18} style={{ position: "absolute", left: "14px", top: "13px", color: "var(--muted, #64748b)" }} />
											<input
												id={searchFilterInputId}
												type="text"
												placeholder="Пациент, полис, ГП, услуга 804н, врач..."
												value={searchQuery}
												onChange={(e) => setSearchQuery(e.target.value)}
												className="dms-control-input"
												style={{ paddingLeft: "42px" }}
											/>
										</div>
									</div>
								</div>
							</div>

							{/* Сводные KPI Карточки */}
							<div className="dms-kpi-grid">
								<div className="dms-kpi-card">
									<span className="dms-kpi-label">Общая стоимость услуг</span>
									<span className="dms-kpi-val">{formatKopecksToRub(totalBillKopecks)}</span>
									<span className="dms-kpi-sub">По прейскуранту клиники</span>
								</div>

								<div className="dms-kpi-card" style={{ borderColor: "rgba(13, 148, 136, 0.3)", background: "rgba(13, 148, 136, 0.03)" }}>
									<span className="dms-kpi-label" style={{ color: "var(--teal, #0d9488)" }}>
										К оплате Страховщиком (ДМС)
									</span>
									<span className="dms-kpi-val" style={{ color: "var(--teal, #0d9488)" }}>
										{formatKopecksToRub(totalDmsKopecks)}
									</span>
									<span className="dms-kpi-sub">
										{totalBillKopecks > 0 ? `${Math.round((totalDmsKopecks / totalBillKopecks) * 100)}% от общего объема` : "0%"}
									</span>
								</div>

								<div className="dms-kpi-card" style={{ borderColor: "rgba(217, 119, 6, 0.3)", background: "rgba(217, 119, 6, 0.03)" }}>
									<span className="dms-kpi-label" style={{ color: "var(--warn-fg, #d97706)" }}>
										Сооплата пациентов (Copay)
									</span>
									<span className="dms-kpi-val" style={{ color: "var(--warn-fg, #d97706)" }}>
										{formatKopecksToRub(totalPatientKopecks)}
									</span>
									<span className="dms-kpi-sub">Франшизы и доплаты по визитам</span>
								</div>

								<div className="dms-kpi-card">
									<span className="dms-kpi-label">Обслужено застрахованных</span>
									<span className="dms-kpi-val">
										{uniquePatientsCount} <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>чел.</span>
									</span>
									<span className="dms-kpi-sub">Услуг в реестре: {filteredRecords.length} ед.</span>
								</div>
							</div>

							{/* Индикатор балансовой целостности */}
							<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderRadius: "12px", background: isBalanceValid ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)", border: `1px solid ${isBalanceValid ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.3)"}` }}>
								<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
									<CheckCircle2 size={18} className={isBalanceValid ? "text-[var(--ok-fg,#059669)]" : "text-[var(--bad-fg,#dc2626)]"} />
									<span style={{ fontSize: "0.875rem", fontWeight: 700, color: isBalanceValid ? "#059669" : "#dc2626" }}>
										{isBalanceValid
											? `Финансовый баланс копейка-в-копейку: ${formatKopecksToRub(totalDmsKopecks)} (ДМС) + ${formatKopecksToRub(totalPatientKopecks)} (Пациенты) = ${formatKopecksToRub(totalBillKopecks)} (Итого)`
											: "Внимание: Нарушен финансовый баланс распределения копеек!"}
									</span>
								</div>
								<span style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
									Без НДС (пп. 2 п. 2 ст. 149 НК РФ)
								</span>
							</div>

							{/* Таблица реестра */}
							<div className="dms-registry-table-wrap">
								<table className="dms-registry-table">
									<thead>
										<tr>
											<th>№</th>
											<th>Дата</th>
											<th>Пациент</th>
											<th>Полис / ГП</th>
											<th>Страховщик</th>
											<th>Код 804н</th>
											<th>Услуга / Зуб</th>
											<th style={{ textAlign: "right" }}>Сумма всего</th>
											<th style={{ textAlign: "right" }}>Покрыто ДМС</th>
											<th style={{ textAlign: "right" }}>Доплата</th>
											<th>Статус</th>
										</tr>
									</thead>
									<tbody>
										{filteredRecords.length === 0 ? (
											<tr>
												<td colSpan={11} style={{ textAlign: "center", padding: "32px", color: "var(--muted, #64748b)" }}>
													По выбранным фильтрам записи в реестре ДМС не найдены.
												</td>
											</tr>
										) : (
											filteredRecords.map((r, idx) => (
												<tr key={r.id}>
													<td style={{ textAlign: "center" }}>{idx + 1}</td>
													<td style={{ whiteSpace: "nowrap" }}>{r.visitDate}</td>
													<td>
														<div style={{ fontWeight: 600 }}>{r.patientFullName}</div>
													</td>
													<td>
														<div style={{ fontSize: "0.8125rem" }}>{r.policyNumber}</div>
														{r.guaranteeLetterNumber && (
															<div style={{ fontSize: "0.75rem", color: "var(--teal, #0d9488)", fontWeight: 600 }}>
																{r.guaranteeLetterNumber}
															</div>
														)}
													</td>
													<td style={{ fontSize: "0.8125rem" }}>{r.insurerName}</td>
													<td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--teal, #0d9488)" }}>
														{r.serviceCode804n}
													</td>
													<td>
														<div style={{ fontWeight: 500 }}>{r.serviceName}</div>
														<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
															{r.toothNumber ? `Зуб ${r.toothNumber} • ` : ""}МКБ: {r.diagnosisMkb10} • Врач: {r.doctorFullName}
														</div>
													</td>
													<td style={{ textAlign: "right", fontWeight: 600 }}>
														{formatKopecksToRub(r.totalPriceKopecks)}
													</td>
													<td style={{ textAlign: "right", fontWeight: 700, color: "var(--teal, #0d9488)" }}>
														{formatKopecksToRub(r.dmsCoveredKopecks)}
													</td>
													<td style={{ textAlign: "right", fontWeight: 600, color: r.patientPaidKopecks > 0 ? "var(--warn-fg, #d97706)" : "var(--muted, #64748b)" }}>
														{formatKopecksToRub(r.patientPaidKopecks)}
													</td>
													<td>
														<span
															className={`dms-status-badge ${
																r.status === "accepted"
																	? "dms-status-active"
																	: r.status === "copay_required"
																		? "dms-status-exhausted"
																		: "dms-status-expired"
															}`}
														>
															{r.status === "accepted" ? "Принято" : r.status === "copay_required" ? "Франшиза" : "Экспертиза"}
														</span>
													</td>
												</tr>
											))
										)}
									</tbody>
									{filteredRecords.length > 0 && (
										<tfoot>
											<tr className="dms-registry-table-totals">
												<td colSpan={7} style={{ textAlign: "right", fontWeight: 800 }}>
													ИТОГО К ВЗАИМОРАСЧЕТАМ СТРАХОВЩИКА:
												</td>
												<td style={{ textAlign: "right", fontWeight: 800 }}>
													{formatKopecksToRub(totalBillKopecks)}
												</td>
												<td style={{ textAlign: "right", fontWeight: 800, color: "var(--teal, #0d9488)" }}>
													{formatKopecksToRub(totalDmsKopecks)}
												</td>
												<td style={{ textAlign: "right", fontWeight: 800, color: "var(--warn-fg, #d97706)" }}>
													{formatKopecksToRub(totalPatientKopecks)}
												</td>
												<td></td>
											</tr>
										</tfoot>
									)}
								</table>
							</div>
						</>
					)}

					{/* ==============================================================
					    ВКЛАДКА 2: СПРАВОЧНИК СТРАХОВЫХ КОМПАНИЙ И ДОГОВОРОВ
					   ============================================================== */}
					{activeTab === "insurers" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
								<div>
									<h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700 }}>
										Действующие договоры со страховыми компаниями
									</h3>
									<p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
										Настройки франшиз, кураторы направлений ДМС, регламенты SLA и прямой доступ к B2B-порталам
									</p>
								</div>

								<button
									type="button"
									className="dms-action-btn dms-action-btn-primary"
									onClick={() => {
										setEditingContract({
											id: `cnt-custom-${Date.now()}`,
											insurerKey: "custom_insurer",
											insurerShortName: "Новая страховая компания",
											insurerFullName: "Общество с ограниченной ответственностью «Страховая Компания»",
											inn: "7700000000",
											ogrn: "1027700000000",
											kpp: "770101001",
											contractNumber: `ДМС-${new Date().getFullYear()}/001`,
											contractDate: new Date().toISOString().slice(0, 10),
											validUntil: `${new Date().getFullYear()}-12-31`,
											defaultFranchisePct: 0,
											curatorFullName: "ФИО Куратора",
											curatorPhone: "+7 (800) 000-00-00",
											curatorEmail: "dms@insurer.ru",
											portalUrl: "https://b2b.insurer.ru",
											slaHours: 24,
											status: "active",
											notes: "Индивидуальные условия договора ДМС",
										});
										setIsEditContractModalOpen(true);
									}}
								>
									<Plus size={18} />
									Добавить договор ДМС
								</button>
							</div>

							<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "16px" }}>
								{contracts.map((contract) => (
									<div key={contract.id} className="dms-letter-card">
										<div className="dms-letter-header">
											<div>
												<div className="dms-letter-number">
													<Building2 size={18} className="text-teal-600" />
													{contract.insurerShortName}
												</div>
												<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
													ИНН: {contract.inn} • ОГРН: {contract.ogrn}
												</div>
											</div>
											<span className="dms-status-badge dms-status-active">
												Действует
											</span>
										</div>

										<div style={{ fontSize: "0.8125rem", background: "var(--surface, #f8fafc)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--line, #e2e8f0)" }}>
											<div><strong>Договор:</strong> № {contract.contractNumber} от {contract.contractDate}</div>
											<div><strong>Срок действия:</strong> по {contract.validUntil}</div>
											<div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
												<Percent size={14} className="text-amber-600" />
												<strong>Базовая ставка франшизы:</strong>
												<span style={{ fontWeight: 800, color: contract.defaultFranchisePct > 0 ? "var(--warn-fg, #d97706)" : "var(--ok-fg, #059669)" }}>
													{contract.defaultFranchisePct}% {contract.defaultFranchisePct === 0 ? "(Полное покрытие)" : "(Сооплата пациента)"}
												</span>
											</div>
										</div>

										<div style={{ fontSize: "0.8125rem", display: "flex", flexDirection: "column", gap: "4px" }}>
											<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
												<Users size={14} className="text-slate-400" />
												<span>Куратор: <strong>{contract.curatorFullName}</strong></span>
											</div>
											<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
												<Phone size={14} className="text-slate-400" />
												<span>{contract.curatorPhone}</span>
											</div>
											<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
												<Mail size={14} className="text-slate-400" />
												<span>{contract.curatorEmail}</span>
											</div>
										</div>

										{contract.notes && (
											<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", fontStyle: "italic", borderTop: "1px solid var(--line, #e2e8f0)", paddingTop: "8px" }}>
												{contract.notes}
											</div>
										)}

										<div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
											<button
												type="button"
												className="dms-action-btn dms-action-btn-secondary dms-btn-dense"
												style={{ flex: 1 }}
												onClick={() => {
													setEditingContract(contract);
													setIsEditContractModalOpen(true);
												}}
											>
												<Edit3 size={15} />
												Редактировать
											</button>

											<a
												href={contract.portalUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="dms-action-btn dms-action-btn-outline dms-btn-dense"
												title="Перейти в B2B-кабинет страховщика"
											>
												<ExternalLink size={15} />
												B2B Портал
											</a>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* ==============================================================
					    ВКЛАДКА 3: АНАЛИТИКА ВЫПЛАТ И ВЗАИМОРАСЧЕТОВ
					   ============================================================== */}
					{activeTab === "analytics" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
							<div className="dms-panel">
								<h3 className="dms-panel-title">
									<TrendingUp size={18} className="text-teal-600" />
									Структура взаиморасчетов по страховым компаниям за {periodDisplayLabel}
								</h3>
								<div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
									{contracts.map((c) => {
										const insurerRecords = records.filter((r) => r.insurerKey === c.insurerKey);
										const sumKop = insurerRecords.reduce((acc, r) => acc + r.dmsCoveredKopecks, 0);
										const pct = totalDmsKopecks > 0 ? Math.round((sumKop / totalDmsKopecks) * 100) : 0;

										return (
											<div key={c.id} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
												<div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
													<span><strong>{c.insurerShortName}</strong> ({insurerRecords.length} услуг)</span>
													<span style={{ fontWeight: 700 }}>
														{formatKopecksToRub(sumKop)} <span style={{ color: "var(--muted, #64748b)", fontWeight: 500 }}>({pct}%)</span>
													</span>
												</div>
												<div className="dms-progress-track">
													<div className="dms-progress-fill green" style={{ width: `${pct}%` }} />
												</div>
											</div>
										);
									})}
								</div>
							</div>

							<div className="dms-form-grid-2">
								<div className="dms-panel">
									<h4 className="dms-panel-title">
										<Shield size={16} className="text-sky-600" />
										Регламенты согласования и SLA 2026
									</h4>
									<ul style={{ margin: "4px 0 0 18px", padding: 0, fontSize: "0.8125rem", color: "var(--muted, #64748b)", lineHeight: "1.6" }}>
										<li>Среднее время ответа кураторов ДМС по гарантийным письмам: <strong>24.5 часа</strong>.</li>
										<li>Уровень одобрения предварительных смет (Pre-Auth): <strong>94.2%</strong>.</li>
										<li>Кодирование услуг строго соответствует Приказу Минздрава РФ № 804н.</li>
										<li>Освобождение от НДС подтверждено пп. 2 п. 2 ст. 149 Налогового кодекса РФ.</li>
									</ul>
								</div>

								<div className="dms-panel">
									<h4 className="dms-panel-title">
										<Layers size={16} className="text-emerald-600" />
										Топ категорий услуг в реестре
									</h4>
									<div style={{ fontSize: "0.8125rem", display: "flex", flexDirection: "column", gap: "6px" }}>
										<div style={{ display: "flex", justifyContent: "space-between" }}>
											<span>Терапевтическое лечение (кариес, пульпит):</span>
											<strong>58% объема</strong>
										</div>
										<div style={{ display: "flex", justifyContent: "space-between" }}>
											<span>Хирургия и удаление зубов:</span>
											<strong>22% объема</strong>
										</div>
										<div style={{ display: "flex", justifyContent: "space-between" }}>
											<span>Профессиональная гигиена полости рта:</span>
											<strong>14% объема</strong>
										</div>
										<div style={{ display: "flex", justifyContent: "space-between" }}>
											<span>Рентгенодиагностика (ОПТГ/Визиография):</span>
											<strong>6% объема</strong>
										</div>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* 4. Footer с 1-клик кнопками экспорта и печати */}
				<div className="dms-hub-footer">
					<div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
						<span>Реестр: <strong>{currentRegistryNumber}</strong></span>
						<span>•</span>
						<span>Строк: <strong>{filteredRecords.length}</strong></span>
						<span>•</span>
						<span style={{ color: isBalanceValid ? "var(--ok-fg, #059669)" : "var(--bad-fg, #dc2626)", fontWeight: 700 }}>
							Баланс: {formatKopecksToRub(totalDmsKopecks)} ДМС
						</span>
					</div>

					<div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
						<button
							type="button"
							className="dms-action-btn dms-action-btn-secondary"
							onClick={onClose}
						>
							Закрыть
						</button>

						<button
							type="button"
							className="dms-action-btn dms-action-btn-secondary"
							onClick={handleExportXml}
							title="1-клик экспорт реестра счетов в XML (ЕГИСЗ/ДМС-2026)"
						>
							<FileCode2 size={18} className="text-teal-600" />
							Экспорт реестра в XML
						</button>

						<button
							type="button"
							className="dms-action-btn dms-action-btn-secondary"
							onClick={handleExportCsv}
							title="1-клик экспорт в Excel / CSV (RFC 4180 с UTF-8 BOM)"
						>
							<Download size={18} className="text-emerald-600" />
							Экспорт в Excel / CSV
						</button>

						<button
							type="button"
							className="dms-action-btn dms-action-btn-primary"
							onClick={handlePrintA4}
							title="Сформировать печатный бланк Счета-реестра и Акта сдачи-приемки А4"
						>
							<Printer size={18} />
							Печать счета-реестра А4
						</button>
					</div>
				</div>
			</div>

			{/* Вложенное окно редактирования договора страховой */}
			{isEditContractModalOpen && editingContract && (
				<div
					className="dms-hub-backdrop"
					style={{ zIndex: 10001, background: "rgba(0,0,0,0.5)" }}
					onClick={() => setIsEditContractModalOpen(false)}
				>
					<div
						className="dms-hub-window"
						style={{ maxWidth: "680px" }}
						onClick={(e) => e.stopPropagation()}
					>
						<div className="dms-hub-header">
							<h3 className="dms-hub-title" style={{ fontSize: "1.0625rem" }}>
								Редактирование условий договора ДМС: {editingContract.insurerShortName}
							</h3>
							<button
								type="button"
								className="dms-action-btn dms-action-btn-secondary dms-action-btn-icon-only"
								onClick={() => setIsEditContractModalOpen(false)}
							>
								<X size={18} />
							</button>
						</div>

						<div className="dms-hub-body" style={{ gap: "14px" }}>
							<div className="dms-form-grid-2">
								<div className="dms-input-group">
									<label className="dms-input-label">Номер договора ДМС *</label>
									<input
										type="text"
										value={editingContract.contractNumber}
										onChange={(e) => setEditingContract({ ...editingContract, contractNumber: e.target.value })}
										className="dms-control-input"
									/>
								</div>

								<div className="dms-input-group">
									<label className="dms-input-label">Базовая ставка франшизы (%) *</label>
									<input
										type="number"
										min="0"
										max="100"
										value={editingContract.defaultFranchisePct}
										onChange={(e) => setEditingContract({ ...editingContract, defaultFranchisePct: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
										className="dms-control-input font-mono font-bold"
									/>
								</div>
							</div>

							<div className="dms-form-grid-2">
								<div className="dms-input-group">
									<label className="dms-input-label">Дата заключения</label>
									<input
										type="date"
										value={editingContract.contractDate}
										onChange={(e) => setEditingContract({ ...editingContract, contractDate: e.target.value })}
										className="dms-control-input"
									/>
								</div>

								<div className="dms-input-group">
									<label className="dms-input-label">Действует по</label>
									<input
										type="date"
										value={editingContract.validUntil}
										onChange={(e) => setEditingContract({ ...editingContract, validUntil: e.target.value })}
										className="dms-control-input"
									/>
								</div>
							</div>

							<div className="dms-form-grid-3">
								<div className="dms-input-group">
									<label className="dms-input-label">ФИО Куратора ДМС</label>
									<input
										type="text"
										value={editingContract.curatorFullName}
										onChange={(e) => setEditingContract({ ...editingContract, curatorFullName: e.target.value })}
										className="dms-control-input"
									/>
								</div>

								<div className="dms-input-group">
									<label className="dms-input-label">Телефон куратора</label>
									<input
										type="text"
										value={editingContract.curatorPhone}
										onChange={(e) => setEditingContract({ ...editingContract, curatorPhone: e.target.value })}
										className="dms-control-input"
									/>
								</div>

								<div className="dms-input-group">
									<label className="dms-input-label">Email куратора</label>
									<input
										type="email"
										value={editingContract.curatorEmail}
										onChange={(e) => setEditingContract({ ...editingContract, curatorEmail: e.target.value })}
										className="dms-control-input"
									/>
								</div>
							</div>

							<div className="dms-input-group">
								<label className="dms-input-label">Примечания и особые условия страховой программы</label>
								<textarea
									rows={3}
									value={editingContract.notes || ""}
									onChange={(e) => setEditingContract({ ...editingContract, notes: e.target.value })}
									className="dms-control-textarea"
								/>
							</div>
						</div>

						<div className="dms-hub-footer">
							<button
								type="button"
								className="dms-action-btn dms-action-btn-secondary"
								onClick={() => setIsEditContractModalOpen(false)}
							>
								Отмена
							</button>

							<button
								type="button"
								className="dms-action-btn dms-action-btn-primary"
								onClick={() => handleSaveContractEdit(editingContract)}
							>
								<CheckCircle2 size={18} />
								Сохранить изменения
							</button>
						</div>
					</div>
				</div>
			)}
		</div>,
		document.body,
	);
}
