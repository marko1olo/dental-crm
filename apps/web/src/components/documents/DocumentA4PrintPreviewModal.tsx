/**
 * DocumentA4PrintPreviewModal.tsx
 *
 * Полноразмерное модальное окно промышленного печатного документооборота A4.
 * Позволяет врачу или администратору просмотреть и распечатать
 * любой из 4 канонических юридических документов клиники:
 * 1. Договор на оказание платных медицинских услуг (ПП РФ № 736 от 11.05.2023, 152-ФЗ, 323-ФЗ).
 * 2. Акт сдачи-приемки выполненных работ и финансовая смета (Номенклатура МЗ РФ № 804н).
 * 3. План комплексного лечения пациента с этапами, сроками и блоком личного согласования.
 * 4. Медицинская карта стоматологического пациента / Дневник приёма (без архаичных меток «043у» в заголовках!).
 */

import React, { useState, useMemo } from "react";
import { X, Printer, FileText } from "lucide-react";
import type {
	Patient,
	StaffMember,
	GeneratedDocument,
	A4DocumentContractData,
	A4DocumentActData,
	A4DocumentTreatmentPlanData,
	A4DocumentMedicalCardData,
	A4DocumentInformedConsentData,
	A4DocumentPersonalDataConsentData,
} from "@dental/shared";
import {
	ProfessionalDocumentA4Sheet,
	type ProfessionalA4DocumentTab,
} from "./ProfessionalDocumentA4Sheet";

export interface DocumentA4PrintPreviewModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: ProfessionalA4DocumentTab;
	readonly patient?: Patient | null;
	readonly doctorFullName?: string | null | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: clinic profile draft
	readonly clinicProfileDraft?: any;
	readonly existingDocuments?: readonly GeneratedDocument[] | undefined;
	readonly contractData?: Partial<A4DocumentContractData>;
	readonly actData?: Partial<A4DocumentActData>;
	readonly treatmentPlanData?: Partial<A4DocumentTreatmentPlanData>;
	readonly consentData?: Partial<A4DocumentInformedConsentData>;
	readonly personalDataConsent?: Partial<A4DocumentPersonalDataConsentData>;
	readonly medicalCardData?: Partial<A4DocumentMedicalCardData>;
}

export const DocumentA4PrintPreviewModal: React.FC<DocumentA4PrintPreviewModalProps> = ({
	isOpen,
	onClose,
	initialTab = "contract",
	patient,
	doctorFullName,
	clinicProfileDraft,
	existingDocuments,
	contractData: customContractData,
	actData: customActData,
	treatmentPlanData: customTreatmentPlanData,
	consentData: customConsentData,
	personalDataConsent: customPersonalDataConsent,
	medicalCardData: customMedicalCardData,
}) => {
	const [activeTab, setActiveTab] = useState<ProfessionalA4DocumentTab>(initialTab);

	React.useEffect(() => {
		if (initialTab) {
			setActiveTab(initialTab);
		}
	}, [initialTab]);

	React.useEffect(() => {
		if (isOpen) {
			try {
				window.scrollTo({ top: 0, behavior: "instant" });
			} catch {
				window.scrollTo(0, 0);
			}
		}
	}, [isOpen]);

	const todayRu = useMemo(() => {
		const d = new Date();
		const day = String(d.getDate()).padStart(2, "0");
		const months = [
			"января", "февраля", "марта", "апреля", "мая", "июня",
			"июля", "августа", "сентября", "октября", "ноября", "декабря",
		];
		const month = months[d.getMonth()];
		const year = d.getFullYear();
		return `${day} ${month} ${year}`;
	}, []);

	// Реквизиты клиники
	const cl = useMemo(() => {
		const draft = clinicProfileDraft || {};
		return {
			name: draft.clinicName || draft.name || 'ООО "Стоматологическая клиника ДЕНТЕ Премиум"',
			legalName: draft.legalName || draft.clinicName || 'ООО "Стоматологическая клиника ДЕНТЕ Премиум"',
			shortName: draft.shortName || 'ООО "ДЕНТЕ Премиум"',
			address: draft.legalAddress || draft.address || "127006, г. Москва, ул. Тверская, д. 12, стр. 2",
			actualAddress: draft.actualAddress || draft.address || "127006, г. Москва, ул. Тверская, д. 12, стр. 2",
			inn: draft.inn || "7710984521",
			kpp: draft.kpp || "771001001",
			ogrn: draft.ogrn || "1217700456123",
			licenseNumber: draft.medicalLicenseNumber || draft.licenseNumber || "ЛО41-01137-77/00645892",
			licenseDate: draft.medicalLicenseIssuedAt || draft.licenseDate || "15.04.2022",
			licenseIssuer: draft.medicalLicenseIssuer || "Департамент здравоохранения города Москвы",
			phone: draft.phone || "+7 (495) 123-45-67",
			email: draft.email || "info@dente-clinic.ru",
			bankName: draft.bankName || 'ПАО "Сбербанк"',
			bik: draft.bik || "044525225",
			checkingAccount: draft.checkingAccount || "40702810938000123456",
			correspondentAccount: draft.correspondentAccount || "30101810400000000225",
			directorTitle: draft.directorTitle || "Генеральный директор",
			directorFullName: draft.directorFullName || "Воронов Алексей Владимирович",
			city: draft.city || "г. Москва",
		};
	}, [clinicProfileDraft]);

	// Реквизиты пациента
	const pt = useMemo(() => {
		const pAny = (patient || {}) as any;
		const admin = pAny.administrativeProfile || {};
		const pass = admin.passport || {};
		return {
			fullName: patient?.fullName || "Ковалёв Роман Станиславович",
			birthDate: patient?.birthDate ? new Date(patient.birthDate).toLocaleDateString("ru-RU") : "12.04.1988",
			gender: (patient?.gender as "male" | "female") || "male",
			phone: patient?.phone || "+7 (999) 888-77-66",
			passportSeries: pass.series || "4515",
			passportNumber: pass.number || "892341",
			passportIssuedBy: pass.issuedBy || "ОВД Тверского района города Москвы",
			passportIssuedDate: pass.issuedDate ? new Date(pass.issuedDate).toLocaleDateString("ru-RU") : "20.05.2012",
			passportDepartmentCode: pass.departmentCode || "770-015",
			address: pAny.address || admin.registrationAddress || "г. Москва, ул. Новослободская, д. 14, кв. 82",
			registrationAddress: admin.registrationAddress || pAny.address || "г. Москва, ул. Новослободская, д. 14, кв. 82",
			snils: pAny.snils || admin.snils || "154-892-301 92",
			omsPolis: pAny.omsPolis || admin.omsPolicyNumber || "7700 8923 1204 9512",
			cardNumber: pAny.medicalCardNumber || pAny.cardNumber || "МК-2026/0418",
		};
	}, [patient]);

	const doctor = doctorFullName || cl.directorFullName || "Воронов Алексей Владимирович";

	const patientDocs = useMemo(() => {
		const docs = existingDocuments ?? [];
		if (!patient?.id) return docs;
		const filtered = docs.filter((d) => d.patientId === patient.id);
		return filtered.length > 0 ? filtered : docs;
	}, [existingDocuments, patient?.id]);

	const latestContractDoc = useMemo(
		() => patientDocs.find((d) => d.kind === "paid_medical_services_contract"),
		[patientDocs],
	);
	const latestActDoc = useMemo(
		() => patientDocs.find((d) => d.kind === "completed_works_act"),
		[patientDocs],
	);
	const latestPlanDoc = useMemo(
		() => patientDocs.find((d) => d.kind === "treatment_plan"),
		[patientDocs],
	);

	// 1. Договор
	const contractData: A4DocumentContractData = useMemo(() => {
		const liveDocNum = (latestContractDoc as any)?.documentNumber as string | undefined;
		const rawAmount = (latestContractDoc as any)?.amountRub ?? latestContractDoc?.totalAmountRub;
		const liveAmount = typeof rawAmount === "number" && rawAmount > 0 ? rawAmount : undefined;
		return {
			clinic: cl,
			patient: pt,
			contractNumber: liveDocNum || `Д-${new Date().getFullYear()}/${pt.cardNumber.replace(/\D/g, "") || "418"}`,
			contractDate: todayRu,
			estimatedTotalRub: customContractData?.estimatedTotalRub || liveAmount || 18500,
			services: customContractData?.services || [
				{
					code804n: "B01.065.001",
					name: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
					toothOrArea: "Полость рта",
					quantity: 1,
					unitPriceRub: 2500,
					totalRub: 2500,
				},
				{
					code804n: "A16.07.002",
					name: "Восстановление зуба пломбой (лечение кариеса дентина, световой композит)",
					toothOrArea: "16",
					quantity: 1,
					unitPriceRub: 9500,
					totalRub: 9500,
				},
				{
					code804n: "A11.07.012",
					name: "Глубокое фторирование эмали и профессиональная гигиена",
					toothOrArea: "11-48",
					quantity: 1,
					unitPriceRub: 6500,
					totalRub: 6500,
				},
			],
			clinicalReason:
				customContractData?.clinicalReason ||
				(latestContractDoc as any)?.summary ||
				(latestContractDoc as any)?.notes ||
				"Первичная консультация, санация кариеса зуба 16 и профгигиена",
			doctorFullName: doctor,
			...customContractData,
		};
	}, [cl, pt, doctor, todayRu, customContractData, latestContractDoc]);

	// 2. Акт выполненных работ
	const actData: A4DocumentActData = useMemo(() => {
		const liveActNum = (latestActDoc as any)?.documentNumber as string | undefined;
		const rawActAmount = (latestActDoc as any)?.amountRub ?? latestActDoc?.totalAmountRub;
		const liveActAmount = typeof rawActAmount === "number" && rawActAmount > 0 ? rawActAmount : undefined;
		return {
			clinic: cl,
			patient: pt,
			actNumber: liveActNum || `А-${new Date().getFullYear()}/${pt.cardNumber.replace(/\D/g, "") || "418"}`,
			actDate: todayRu,
			contractNumber: contractData.contractNumber,
			contractDate: contractData.contractDate,
			doctorFullName: doctor,
			doctorSpecialty: "Врач-стоматолог-терапевт",
			services: customActData?.services || [
				{
					code804n: "B01.065.001",
					name: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
					toothOrArea: "Полость рта",
					quantity: 1,
					unitPriceRub: 2500,
					discountRub: 0,
					totalRub: 2500,
				},
				{
					code804n: "A16.07.002",
					name: "Восстановление зуба пломбой с изоляцией коффердам и нанокомпозитом Harmonize",
					toothOrArea: "16",
					quantity: 1,
					unitPriceRub: 9500,
					discountRub: 500,
					totalRub: 9000,
				},
				{
					code804n: "A11.07.012",
					name: "Комплексная ультразвуковая и Air-Flow профессиональная гигиена",
					toothOrArea: "11-48",
					quantity: 1,
					unitPriceRub: 6500,
					discountRub: 0,
					totalRub: 6500,
				},
			],
			totalAmountRub: customActData?.totalAmountRub || liveActAmount || 18000,
			warrantyTermsText: customActData?.warrantyTermsText || "12 месяцев на композитные реставрации при условии прохождения контрольного осмотра каждые 6 месяцев.",
			fiscalReceiptNumber: customActData?.fiscalReceiptNumber || "ФД-78412 / ФП-98214301",
			...customActData,
		};
	}, [cl, pt, doctor, todayRu, contractData, customActData, latestActDoc]);

	// 3. План лечения
	const treatmentPlanData: A4DocumentTreatmentPlanData = useMemo(() => {
		const livePlanSummary = (latestPlanDoc as any)?.summary || (latestPlanDoc as any)?.notes;
		return {
			clinic: cl,
			patient: pt,
			planDate: todayRu,
			doctorFullName: doctor,
			diagnosisSummary: livePlanSummary || "K02.1 Кариес дентина 16 зуба, K05.1 Хронический гингивит, дефект коронки 24 зуба",
			stages: customTreatmentPlanData?.stages || [
				{
					stageNumber: 1,
					stageName: "Этап I. Неотложная терапия и санация очагов инфекции",
					stageTiming: "1–3 дня",
					plannedServices: [
						{
							name: "Консультация стоматолога-терапевта, фотопротокол и рентген-диагностика",
							toothOrArea: "Полость рта",
							timing: "1-й визит",
							priceRub: 2500,
						},
						{
							name: "Лечение кариеса дентина зуба 16 со световой реставрацией",
							toothOrArea: "16",
							timing: "1-й визит",
							priceRub: 9000,
						},
					],
					stageTotalRub: 11500,
				},
				{
					stageNumber: 2,
					stageName: "Этап II. Профессиональная гигиена и пародонтологическая подготовка",
					stageTiming: "через 5–7 дней",
					plannedServices: [
						{
							name: "Снятие наддесневых и поддесневых зубных отложений ультразвуком + Air-Flow",
							toothOrArea: "11-48",
							timing: "2-й визит",
							priceRub: 6500,
						},
					],
					stageTotalRub: 6500,
				},
				{
					stageNumber: 3,
					stageName: "Этап III. Ортопедическая реабилитация",
					stageTiming: "2–3 недели",
					plannedServices: [
						{
							name: "Препарирование и установка цельнокерамической коронки E.max",
							toothOrArea: "24",
							timing: "3-й и 4-й визит",
							priceRub: 28000,
						},
					],
					stageTotalRub: 28000,
				},
			],
			totalCostWithoutDiscountRub: 46000,
			discountRub: 2000,
			totalCostWithDiscountRub: 44000,
			approvedVariantName: "Вариант «Оптимальный» (Биологическая санация + E.max керамика)",
			...customTreatmentPlanData,
		};
	}, [cl, pt, doctor, todayRu, customTreatmentPlanData, latestPlanDoc]);

	// 4. Медицинская карта / Дневник
	const medicalCardData: A4DocumentMedicalCardData = useMemo(() => {
		return {
			clinic: cl,
			patient: pt,
			cardNumber: pt.cardNumber,
			visitDate: todayRu,
			doctorFullName: doctor,
			doctorSpecialty: "Врач-стоматолог-терапевт",
			allergyStatus: "Отягощен: аллергическая реакция на амидопирин (крапивница). Непереносимость лидокаина отрицает.",
			somaticStatus: "Соматически здоров. Артериальное давление 120/80 мм рт. ст., пульс 72 уд/мин.",
			complaints: "Жалобы на кратковременные боли от сладкого и термических раздражителей в зубе 16 верхней челюсти справа.",
			anamnesisMorbi: "Боли появились около 2 недель назад. Ранее зуб не лечен. За медицинской помощью обратился впервые.",
			statusLocalis: "Слизистая оболочка полости рта бледно-розового цвета, умеренно увлажнена. Прикус ортогнатический. На окклюзионно-медиальной поверхности зуба 16 обнаружена глубокая кариозная полость со светлым размягченным дентином. Зондирование эмалево-дентинной границы чувствительно. Перкуссия зуба 16 безболезненна. Реакция на холод кратковременная (исчезает через 3 сек). ЭОД = 4 мкА.",
			teethFormulaSummary: "16 — C (кариес), 24 — K (коронка/дефект), 36 — Pt (периодонтит/пломбирован), 46 — П (пломба).",
			teethFormulaMap: {
				18: { state: "—" }, 17: { state: "—" }, 16: { state: "C" }, 15: { state: "—" },
				14: { state: "—" }, 13: { state: "—" }, 12: { state: "—" }, 11: { state: "—" },
				21: { state: "—" }, 22: { state: "—" }, 23: { state: "—" }, 24: { state: "K" },
				25: { state: "—" }, 26: { state: "—" }, 27: { state: "—" }, 28: { state: "0" },
				48: { state: "0" }, 47: { state: "—" }, 46: { state: "П" }, 45: { state: "—" },
				44: { state: "—" }, 43: { state: "—" }, 42: { state: "—" }, 41: { state: "—" },
				31: { state: "—" }, 32: { state: "—" }, 33: { state: "—" }, 34: { state: "—" },
				35: { state: "—" }, 36: { state: "Pt" }, 37: { state: "—" }, 38: { state: "—" },
			},
			diagnosisIcd10: "K02.1",
			diagnosisDescription: "Кариес дентина (глубокий кариес)",
			diagnosisTooth: "16",
			treatmentProtocol: "Инфильтрационная анестезия Sol. Ultracaini D-S 1:200000 1.7 мл. Препарирование кариозной полости зуба 16 с водно-воздушным охлаждением. Изоляция операционного поля системой коффердам (кламп № W8A). Медикаментозная антисептическая обработка 2% раствором хлоргексидина биглюконата. Лечебная подкладка на основе гидроксида кальция Life (Kerr) точечно на дно полости. Изолирующая прокладка из жидкотекучего SDR+. Самонатравливающий адгезив OptiBond FL. Послойная реставрация наногибридным композитом Harmonize (Kerr) оттенков Dentin A3, Enamel A2 с воспроизведением индивидуальной анатомии фиссур. Фотополимеризация лампой полимеризационной 1200 мВт/см². Шлифовка и финишная полировка дисками Sof-Lex, полировочными головками Enhance и пастой Prisma Gloss. Окклюзионная коррекция по артикуляционной бумаге Bausch 40 мкм.",
			materialsUsed: "Ультракаин Д-С 1.7 мл, коффердам Nic Tone, Life (Kerr), SDR+ (Dentsply), OptiBond FL (Kerr), Harmonize A3/A2, полировочные системы Sof-Lex/Enhance.",
			recommendations: "1. Воздержаться от приема красящей и твердой пищи в течение 2 часов. 2. Соблюдать тщательную индивидуальную гигиену полости рта. 3. Контрольный осмотр и пришлифовка через 3–5 дней при возникновении чувства завышения прикуса. 4. Плановый профилактический осмотр через 6 месяцев.",
			...customMedicalCardData,
		};
	}, [cl, pt, doctor, todayRu, customMedicalCardData]);

	// 5. Информированное добровольное согласие (1051н)
	const consentData: A4DocumentInformedConsentData = useMemo(() => {
		return {
			consentNumber: `ИДС-${new Date().getFullYear()}/${pt.cardNumber.replace(/\D/g, "") || "418"}`,
			consentDate: todayRu,
			clinic: cl,
			patient: pt,
			doctorFullName: doctor,
			doctorSpecialty: "Врач-стоматолог-терапевт",
			interventionName: "Комплексное терапевтическое лечение, местная инфильтрационная анестезия и реставрация зубов",
			toothOrArea: "16",
			diagnosisSummary: "K02.1 Кариес дентина (глубокий кариес 16 зуба)",
			contractNumber: contractData.contractNumber,
			contractDate: contractData.contractDate,
			patientQuestionsAnswered: true,
			...customConsentData,
		};
	}, [cl, pt, doctor, todayRu, contractData, customConsentData]);

	// 6. Согласие на обработку персональных данных (152-ФЗ)
	const personalDataConsent: A4DocumentPersonalDataConsentData = useMemo(() => {
		return {
			consentNumber: `ПД-${new Date().getFullYear()}/${pt.cardNumber.replace(/\D/g, "") || "418"}`,
			consentDate: todayRu,
			clinic: cl,
			patient: pt,
			thirdPartyTransfersAllowed: true,
			egiszTransferAllowed: true,
			...customPersonalDataConsent,
		};
	}, [cl, pt, todayRu, customPersonalDataConsent]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 animate-in fade-in duration-200"
			data-testid="modal-a4-document-preview"
			role="dialog"
			aria-modal="true"
			aria-label="Предварительный просмотр печатных документов A4"
		>
			<div className="relative w-full max-w-[1060px] h-[95vh] max-h-[95vh] bg-[var(--paper)] text-[var(--ink)] rounded-xl shadow-2xl border border-[var(--line)] flex flex-col overflow-hidden">
				{/* Top Modal Header */}
				<header className="flex items-center justify-between px-4 py-2.5 bg-[var(--paper-soft)] border-b border-[var(--line)] shrink-0">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal)] text-[var(--on-teal,#ffffff)] flex items-center justify-center font-bold shrink-0">
							<FileText size={18} />
						</div>
						<div>
							<h2 className="text-[14px] font-bold text-[var(--ink)] leading-tight">
								Официальный документооборот клиники · Стандарт A4
							</h2>
							<p className="text-[12px] text-[var(--muted)]">
								Пациент: <strong>{pt.fullName}</strong> · Карта: <strong>{pt.cardNumber}</strong> · {todayRu}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="min-w-[32px] min-h-[32px] w-8 h-8 flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] rounded-lg hover:bg-[var(--paper)] transition cursor-pointer"
							data-testid="btn-close-a4-preview-modal"
							aria-label="Закрыть окно"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* Modal Body: A4 Sheet */}
				<main className="p-0 sm:p-2 flex-1 min-h-0 overflow-y-auto bg-[var(--paper-soft)] flex justify-center">
					<ProfessionalDocumentA4Sheet
						activeTab={activeTab}
						onTabChange={setActiveTab}
						contractData={contractData}
						actData={actData}
						treatmentPlanData={treatmentPlanData}
						consentData={consentData}
						personalDataConsent={personalDataConsent}
						medicalCardData={medicalCardData}
						onPrint={() => window.print()}
					/>
				</main>
			</div>
		</div>
	);
};

DocumentA4PrintPreviewModal.displayName = "DocumentA4PrintPreviewModal";
