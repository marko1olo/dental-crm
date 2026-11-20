/**
 * apps/web/src/components/documents/surgicalPackagePrintEngine.ts
 *
 * Канонический масштабируемый печатный движок хирургического пакета DENTE.
 * Объединяет реквизиты, стили A4, бланки согласий, анестезии и постоперационных памяток.
 */

import type { DocumentKind, GeneratedDocument, Patient } from "@dental/shared";
import { escapeHtml, formatDateRu } from "./documentPrintFormatters";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import type { ClinicProfileDraft } from "../../helpers/types";
import {
	generateSurgicalOperationProtocolHtml,
	printSurgicalOperationProtocol,
	type SurgicalOperationProtocolPrintOptions,
} from "./surgicalOperationProtocol";
import { printHtmlViaIframe } from "./printHtmlViaIframe";

export type { ClinicProfileDraft };

export interface SurgicalItem {
	kind: DocumentKind;
	title: string;
	statutoryRef: string;
	description: string;
	required: boolean;
}

export const SURGICAL_STATUTORY_ITEMS: readonly SurgicalItem[] = [
	{
		kind: "procedure_specific_consent_packet",
		title: "Согласие на хирургическое вмешательство и имплантацию",
		statutoryRef: "Информированное согласие пациента",
		description: "Согласие на операцию удаления зуба, остеотомию, синус-лифтинг, костную пластику или установку имплантатов.",
		required: true,
	},
	{
		kind: "anesthesia_consent_log",
		title: "Протокол и согласие на местную/проводниковую анестезию",
		statutoryRef: "Стандарты безопасности и информированное согласие",
		description: "Фиксация аллергоанамнеза, типа анестетика (артикаин/мепивакаин), дозировки и отсутствия противопоказаний.",
		required: true,
	},
	{
		kind: "dental_medical_card_043u",
		title: "Хирургический протокол операции в карте пациента",
		statutoryRef: "Протокол операции",
		description: "Протокол хода операции, гемостаза, наложения швов, используемых шовных и костных материалов.",
		required: true,
	},
	{
		kind: "xray_cbct_referral",
		title: "Направление на контрольную рентгенодиагностику / КЛКТ 3D",
		statutoryRef: "Стандарты безопасности и прейскурант",
		description: "Контроль позиционирования имплантатов, целостности кортикальной пластинки и дна гайморовой пазухи.",
		required: true,
	},
	{
		kind: "prescription_medication_order",
		title: "Рецептурный бланк (антибиотики и НПВС)",
		statutoryRef: "Назначение лекарств",
		description: "Назначение превентивной антибактериальной, противовоспалительной, обезболивающей и антигистаминной терапии.",
		required: true,
	},
	{
		kind: "post_visit_recommendations",
		title: "Памятка пациента после хирургического вмешательства",
		statutoryRef: "Закон РФ «О защите прав потребителей» № 2300-1",
		description: "Правила послеоперационного режима: холод, ванночки с антисептиком, диета, ограничение физнагрузок, гигиена.",
		required: true,
	},
];

export interface SurgicalPackageModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient: Patient | null;
	readonly doctorFullName?: string | null | undefined;
	readonly existingDocuments: GeneratedDocument[];
	readonly onCreateDocument: (kind: DocumentKind) => void;
	readonly onOpenDocument: (documentId: string) => void;
	readonly onSelectDocumentKind: (kind: DocumentKind) => void;
	readonly clinicProfileDraft?: ClinicProfileDraft | undefined;
}

/** Реквизиты клиники для печатных форм хирургического пакета. */
export interface SurgicalClinicRequisites {
	readonly clinicName?: string | null | undefined;
	readonly legalName?: string | null | undefined;
	readonly fullName?: string | null | undefined;
	readonly shortName?: string | null | undefined;
	readonly inn?: string | null | undefined;
	readonly ogrn?: string | null | undefined;
	readonly licenseNumber?: string | null | undefined;
	readonly address?: string | null | undefined;
	readonly actualAddress?: string | null | undefined;
	readonly phone?: string | null | undefined;
}

/** Реквизиты пациента для печатных форм хирургического пакета. */
export interface SurgicalPatientRequisites {
	readonly fullName?: string | null | undefined;
	readonly birthDate?: string | null | undefined;
	readonly phone?: string | null | undefined;
	readonly snils?: string | null | undefined;
	readonly registrationAddress?: string | null | undefined;
	readonly address?: string | null | undefined;
	readonly passportSeries?: string | null | undefined;
	readonly passportNumber?: string | null | undefined;
	readonly passportIssuedBy?: string | null | undefined;
	readonly passportIssuedDate?: string | null | undefined;
	readonly passportDepartmentCode?: string | null | undefined;
	readonly passport?: string | null | undefined;
	readonly gender?: string | null | undefined;
}

/** Параметры операции: зуб, тип вмешательства, анестетик. */
export interface SurgicalOperationDetails {
	readonly toothNumber?: string | number | null | undefined;
	readonly operationType?: string | null | undefined;
	readonly anestheticName?: string | null | undefined;
}

/** Вход печатного движка хирургического пакета. */
export interface SurgicalPackagePrintOptions {
	readonly patient: SurgicalPatientRequisites | null;
	readonly clinic: SurgicalClinicRequisites | null;
	readonly doctorFullName?: string | null | undefined;
	readonly operationDetails?: SurgicalOperationDetails | null | undefined;
}

/** Подготовленный контекст реквизитов (все строки экранированы и подставлены). */
export interface SurgicalRequisitesContext {
	readonly todayFormatted: string;
	readonly clinicName: string;
	readonly clinicAddress: string;
	readonly clinicInn: string;
	readonly clinicOgrn: string;
	readonly clinicLicense: string;
	readonly clinicPhone: string;
	readonly ptName: string;
	readonly ptBirthDate: string;
	readonly ptPhone: string;
	readonly ptAddress: string;
	readonly ptPassport: string;
	readonly docDoctorName: string;
	readonly opTooth: string;
	readonly opType: string;
	readonly anesName: string;
}

export const SURGICAL_PACKAGE_CSS = `
    @page { size: A4 portrait; margin: 10mm 12mm 10mm 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #111827; background: #ffffff; font-size: 8.8pt; line-height: 1.3; margin: 0; padding: 0; }
    .print-sheet { width: 100%; min-height: 272mm; max-height: 280mm; page-break-after: always; break-after: page; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
    .print-sheet:last-child { page-break-after: avoid; break-after: avoid; }
    .sheet-header { border-bottom: 1.5px solid #1f2937; padding-bottom: 4pt; margin-bottom: 6pt; }
    .clinic-top-row { display: flex; justify-content: space-between; align-items: flex-start; font-size: 7.5pt; color: #4b5563; line-height: 1.25; }
    .statutory-badge { font-size: 7pt; font-weight: 700; text-transform: uppercase; color: #111827; background: #f3f4f6; border: 1px solid #9ca3af; padding: 1.5pt 5pt; border-radius: 2pt; display: inline-block; margin-bottom: 2pt; }
    h1 { font-size: 11pt; font-weight: 800; text-align: center; margin: 3pt 0 2pt 0; text-transform: uppercase; color: #111827; }
    .sheet-subtitle { font-size: 8pt; text-align: center; color: #4b5563; margin: 0 0 6pt 0; }
    .parties-block { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 3pt; padding: 5pt 7pt; font-size: 8pt; margin-bottom: 6pt; line-height: 1.35; }
    .section-title { font-size: 8.5pt; font-weight: 700; text-transform: uppercase; color: #1f2937; margin: 5pt 0 2pt 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 1pt; }
    p, li { margin: 2pt 0; text-align: justify; }
    ol, ul { margin: 2pt 0 4pt 14pt; padding: 0; }
    .signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16pt; margin-top: 8pt; padding-top: 6pt; border-top: 1px solid #d1d5db; font-size: 8pt; break-inside: avoid; page-break-inside: avoid; }
    .sign-line { margin-top: 14pt; border-bottom: 1px solid #4b5563; height: 1pt; }
    .sign-caption { font-size: 7pt; color: #6b7280; text-align: center; margin-top: 2pt; }
    .memo-box { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 4pt; padding: 6pt 8pt; margin: 4pt 0; }
    .memo-alert { background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 4pt; padding: 6pt 8pt; margin: 4pt 0; }
`;

export function buildSurgicalRequisitesContext(options: SurgicalPackagePrintOptions): SurgicalRequisitesContext {
	const { patient, clinic, doctorFullName, operationDetails } = options;
	const isDemo = isDemoShowcaseMode();
	const todayFormatted = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) + " г.";

	const clinicName = escapeHtml(clinic?.legalName || clinic?.fullName || clinic?.clinicName) || (isDemo ? "ООО «Стоматологическая клиника ДЕНТЕ»" : "«________________________________________»");
	const clinicAddress = escapeHtml(clinic?.actualAddress || clinic?.address) || (isDemo ? "г. Москва, ул. Стоматологическая, д. 10" : "«________________________________________»");
	const clinicInn = escapeHtml(clinic?.inn) || (isDemo ? "7701987654" : "«______________»");
	const clinicOgrn = escapeHtml(clinic?.ogrn) || (isDemo ? "1217700123456" : "«________________»");
	const clinicLicense = escapeHtml(clinic?.licenseNumber) || (isDemo ? "ЛО41-01137-77/00584930" : "«________________________________________»");
	const clinicPhone = escapeHtml(clinic?.phone) || (isDemo ? "+7 (495) 123-45-67" : "");

	const ptName = escapeHtml(patient?.fullName) || "________________________________________";
	const ptBirthDate = patient?.birthDate ? formatDateRu(patient.birthDate) : "«___» _________ _____ г.";
	const ptPhone = escapeHtml(patient?.phone) || "+7 (____) ____-____";
	const ptAddress = escapeHtml(patient?.registrationAddress || patient?.address) || "________________________________________";

	let ptPassport = "";
	if (patient?.passportSeries && patient?.passportNumber) {
		ptPassport = `серия ${escapeHtml(patient.passportSeries)} № ${escapeHtml(patient.passportNumber)}`;
		if (patient.passportIssuedBy) ptPassport += `, выдан: ${escapeHtml(patient.passportIssuedBy)}`;
		if (patient.passportIssuedDate) ptPassport += `, ${formatDateRu(patient.passportIssuedDate)}`;
		if (patient.passportDepartmentCode) ptPassport += `, код: ${escapeHtml(patient.passportDepartmentCode)}`;
	} else if (patient?.passport) {
		ptPassport = escapeHtml(patient.passport);
	} else {
		ptPassport = "серия ______ № ________, выдан ____________________________________";
	}

	const docDoctorName = escapeHtml(doctorFullName) || "________________________";
	const opTooth = operationDetails?.toothNumber ? `зуба/области ${escapeHtml(String(operationDetails.toothNumber))}` : "зуба / челюстной области";
	const opType = escapeHtml(operationDetails?.operationType) || "удаление зуба / установка дентального имплантата / остеотомия";
	const anesName = escapeHtml(operationDetails?.anestheticName) || "Артикаин 4% с эпинефрином (1:100 000 / 1:200 000)";

	return {
		todayFormatted, clinicName, clinicAddress, clinicInn, clinicOgrn, clinicLicense, clinicPhone,
		ptName, ptBirthDate, ptPhone, ptAddress, ptPassport, docDoctorName, opTooth, opType, anesName,
	};
}

export function buildSurgicalClinic(draft: ClinicProfileDraft | null | undefined): SurgicalClinicRequisites | null {
	if (!draft) return null;
	return {
		clinicName: draft.clinicName || "Стоматологическая клиника",
		legalName: draft.legalName || draft.clinicName || "",
		fullName: draft.legalName || draft.clinicName || "",
		shortName: draft.clinicName || "",
		inn: draft.inn || "",
		ogrn: draft.ogrn || "",
		licenseNumber: draft.medicalLicenseNumber || "",
		address: draft.address || "",
		actualAddress: draft.address || "",
		phone: draft.phone || "",
	};
}

type PatientWithAdminExt = Partial<Patient> & {
	administrativeProfile?: {
		snils?: string | null | undefined;
		registrationAddress?: string | null | undefined;
		passportSeries?: string | null | undefined;
		passportNumber?: string | null | undefined;
		passportIssuedBy?: string | null | undefined;
		passportIssuedDate?: string | null | undefined;
		passportDepartmentCode?: string | null | undefined;
		[key: string]: unknown;
	} | null | undefined;
	snils?: string | null | undefined;
	address?: string | null | undefined;
};

export function buildSurgicalPatient(
	patient: Patient | null | undefined,
): SurgicalPatientRequisites | null {
	if (!patient) return null;
	const p = patient as PatientWithAdminExt;
	return {
		fullName: patient.fullName,
		birthDate: patient.birthDate,
		phone: patient.phone,
		snils: p?.administrativeProfile?.snils || p?.snils,
		registrationAddress: p?.administrativeProfile?.registrationAddress || p?.address,
		address: p?.administrativeProfile?.registrationAddress || p?.address,
		passportSeries: p?.administrativeProfile?.passportSeries,
		passportNumber: p?.administrativeProfile?.passportNumber,
		passportIssuedBy: p?.administrativeProfile?.passportIssuedBy,
		passportIssuedDate: p?.administrativeProfile?.passportIssuedDate,
		passportDepartmentCode: p?.administrativeProfile?.passportDepartmentCode,
		gender: p?.gender,
	};
}

export function renderSurgicalConsentSheet(ctx: SurgicalRequisitesContext): string {
	const {
		clinicName, clinicAddress, clinicPhone, clinicLicense, clinicInn, clinicOgrn,
		ptName, ptBirthDate, ptPassport, ptAddress, docDoctorName, opType, opTooth,
		todayFormatted,
	} = ctx;

	return `  <div class="print-sheet">
    <div>
      <div class="sheet-header">
        <div class="clinic-top-row">
          <div>
            <strong>${clinicName}</strong><br>
            Адрес: ${clinicAddress}${clinicPhone ? ` • Тел: ${clinicPhone}` : ""}<br>
            Лицензия: № ${clinicLicense} • ИНН: ${clinicInn} • ОГРН: ${clinicOgrn}
          </div>
          <div style="text-align: right;">
            <span class="statutory-badge">Информированное добровольное согласие</span>
          </div>
        </div>
      </div>

      <h1>Информированное добровольное согласие на хирургическое стоматологическое вмешательство и дентальную имплантацию</h1>
      <div class="sheet-subtitle">Информированное добровольное согласие пациента на медицинское вмешательство (ФЗ № 323-ФЗ ст. 20)</div>

      <div class="parties-block">
        Я, <strong>${ptName}</strong>, дата рождения: <strong>${ptBirthDate}</strong>,
        паспортные данные: <strong>${ptPassport}</strong>,
        зарегистрированный(ая) по адресу: <strong>${ptAddress}</strong>,
        настоящим подтверждаю, что уполномочиваю врача-стоматолога <strong>${docDoctorName}</strong>
        провести мне (или представляемому мной лицу) плановое / неотложное хирургическое вмешательство:
        <strong>${opType} в области ${opTooth}</strong>.
      </div>

      <div class="section-title">1. Суть планируемого медицинского вмешательства</div>
      <p>
        Мне подробно, в доступной форме разъяснены диагноз, характер и цели хирургического вмешательства,
        включая проведение местной анестезии, препарирование костного ложа, остеотомию, удаление зуба (корней),
        синус-лифтинг, направленную тканевую регенерацию с использованием мембран, установку имплантатов, наложение швов и гемостаз.
      </p>

      <div class="section-title">2. Альтернативные методы лечения и последствия отказа</div>
      <p>
        Мне разъяснены альтернативные методы лечения (сохранение зуба, протезирование), а также возможные риски отказа:
        распространение инфекции, развитие периостита, остеомиелита, флегмоны, убыль кости челюсти.
      </p>

      <div class="section-title">3. Возможные осложнения и риски операции</div>
      <p>Я поставлен(а) в известность о возможных осложнениях:</p>
      <ul>
        <li>Болевой синдром, отек мягких тканей лица и гематома в зоне операции (в первые 3–5 дней);</li>
        <li>Кровоточивость из лунки, расхождение швов, развитие альвеолита;</li>
        <li>Временное онемение губы, подбородка или языка при близком расположении нижнеальвеолярного нерва;</li>
        <li>Перфорация дна верхнечелюстной пазухи при операциях на верхней челюсти;</li>
        <li>Риск периимплантита или отторжения дентального имплантата, требующий его удаления.</li>
      </ul>

      <div class="section-title">4. Обязательства пациента</div>
      <p>
        Обязуюсь строго выполнять назначения врача, принимать назначенные препараты, соблюдать режим питания,
        гигиену рта и являться на контрольные осмотры и снятие швов.
      </p>
    </div>

    <div class="signatures-grid">
      <div>
        <strong>Пациент (законный представитель):</strong><br>
        ФИО: <strong>${ptName}</strong><br>
        <div class="sign-line"></div>
        <div class="sign-caption">(подпись пациента / представителя) • Дата: ${todayFormatted}</div>
      </div>
      <div>
        <strong>Хирург-стоматолог:</strong><br>
        Врач: <strong>${docDoctorName}</strong><br>
        <div class="sign-line"></div>
        <div class="sign-caption">(подпись и личная печать врача) • Дата: ${todayFormatted}</div>
      </div>
    </div>
  </div>`;
}

export function renderSurgicalAnesthesiaSheet(ctx: SurgicalRequisitesContext): string {
	const {
		clinicName, clinicLicense, clinicAddress, clinicPhone, ptName, ptBirthDate,
		anesName, todayFormatted, docDoctorName,
	} = ctx;

	return `  <div class="print-sheet">
    <div>
      <div class="sheet-header">
        <div class="clinic-top-row">
          <div>
            <strong>${clinicName}</strong> • Лицензия № ${clinicLicense}<br>
            Адрес: ${clinicAddress}${clinicPhone ? ` • Тел: ${clinicPhone}` : ""}
          </div>
          <div style="text-align: right;">
            <span class="statutory-badge">Информированное согласие</span>
          </div>
        </div>
      </div>

      <h1>Информированное согласие и протокол на проведение местной и проводниковой анестезии</h1>
      <div class="sheet-subtitle">Приложение к медицинской карте приёма пациента</div>

      <div class="parties-block">
        Пациент: <strong>${ptName}</strong>, дата рождения: <strong>${ptBirthDate}</strong>.<br>
        Планируемый вид обезболивания: <strong>Инфильтрационная / Проводниковая (мандибулярная, торусальная, туберальная) анестезия</strong>.<br>
        Используемый препарат: <strong>${anesName}</strong>.
      </div>

      <div class="section-title">1. Информация о методе обезболивания</div>
      <p>
        Для безболезненного проведения вмешательства мне показано проведение местной анестезии современными анестетиками амидного ряда.
        Действие наступает через 1–5 минут и продолжается от 1 до 4 часов.
      </p>

      <div class="section-title">2. Сведения об аллергологическом и соматическом анамнезе</div>
      <p>Настоящим подтверждаю, что:</p>
      <ul>
        <li>Ранее местная анестезия проводилась, переносимость удовлетворительная;</li>
        <li>Аллергические реакции на анестетики отрицаю;</li>
        <li>Тяжелые сердечно-сосудистые патологии, декомпенсированный сахарный диабет отрицаю;</li>
        <li>Беременность / период лактации: отрицаю / не применимо.</li>
      </ul>

      <div class="section-title">3. Возможные индивидуальные реакции и осложнения анестезии</div>
      <p>Мне разъяснено, что возможны индивидуальные реакции:</p>
      <ul>
        <li>Головокружение, кратковременная тахикардия, тремор;</li>
        <li>Образование постинъекционной гематомы в зоне укола;</li>
        <li>Болезненность или ограничение открывания рта (тризм) в течение нескольких дней;</li>
        <li>Пролонгированная парестезия (онемение губы, языка).</li>
      </ul>

      <div class="section-title">4. Правила безопасности пациента</div>
      <p>
        В течение времени действия анестезии категорически запрещается принимать горячую пищу и напитки,
        жевать твердую пищу во избежание термического и травматического прикусывания губ, щек и языка.
      </p>
    </div>

    <div class="signatures-grid">
      <div>
        <strong>Пациент:</strong><br>
        ФИО: <strong>${ptName}</strong><br>
        <div class="sign-line"></div>
        <div class="sign-caption">(подпись пациента) • Дата: ${todayFormatted}</div>
      </div>
      <div>
        <strong>Врач-стоматолог:</strong><br>
        ФИО: <strong>${docDoctorName}</strong><br>
        <div class="sign-line"></div>
        <div class="sign-caption">(подпись врача) • Дата: ${todayFormatted}</div>
      </div>
    </div>
  </div>`;
}

export function renderSurgicalMemoSheet(ctx: SurgicalRequisitesContext): string {
	const {
		clinicName, clinicAddress, clinicPhone, ptName, opType, opTooth,
		docDoctorName, todayFormatted,
	} = ctx;

	return `  <div class="print-sheet">
    <div>
      <div class="sheet-header">
        <div class="clinic-top-row">
          <div>
            <strong>${clinicName}</strong><br>
            Адрес: ${clinicAddress}${clinicPhone ? ` • Круглосуточный телефон клиники: <strong>${clinicPhone}</strong>` : ""}
          </div>
          <div style="text-align: right;">
            <span class="statutory-badge">Закон РФ № 2300-1</span><br>
            <span class="statutory-badge">Памятка пациента</span>
          </div>
        </div>
      </div>

      <h1>Памятка пациента после хирургического стоматологического вмешательства и дентальной имплантации</h1>
      <div class="sheet-subtitle">Правила режима и ухода для скорейшего заживления и предотвращения послеоперационных осложнений</div>

      <div class="parties-block">
        Уважаемый(ая) <strong>${ptName}</strong>!<br>
        Вам проведена хирургическая операция: <strong>${opType} в области ${opTooth}</strong>.<br>
        Лечащий хирург: <strong>${docDoctorName}</strong>. Дата операции: <strong>${todayFormatted}</strong>.
      </div>

      <div class="memo-box">
        <strong>Первые 24 часа после операции (важные правила):</strong>
        <ol style="margin: 3pt 0 2pt 12pt;">
          <li><strong>Марлевый тампон:</strong> сплюнуть через 15–20 минут после наложения в клинике.</li>
          <li><strong>Холод к щеке:</strong> прикладывать сухой холод на область операции снаружи на 15 минут с перерывами на 15 минут в первые 3–4 часа.</li>
          <li><strong>Не полоскать рот активно:</strong> интенсивное полоскание вымывает кровяной сгусток. Разрешены только спокойные ванночки со 2 дня.</li>
          <li><strong>Прием пищи:</strong> воздержитесь от еды до окончания действия анестезии (2–3 часа). Пища теплая, мягкая, жевать на противоположной стороне.</li>
          <li><strong>Ограничение тепла и нагрузок:</strong> исключить бани, сауны, горячие ванны, спорт на 5–7 дней.</li>
          <li><strong>Курение и алкоголь:</strong> воздержаться от курения минимум 3–5 дней. Исключить алкоголь на период приема антибиотиков.</li>
        </ol>
      </div>

      <div class="section-title">2. Уход и медикаментозные назначения</div>
      <ul>
        <li><strong>Антисептические ванночки:</strong> со 2-го дня — Хлоргексидин 0.05% или Мирамистин (подержать 30–60 сек и сплюнуть).</li>
        <li><strong>Обезболивание:</strong> при появлении боли принимать назначенный НПВС (Нимесил 100 мг, Нурофен 400 мг).</li>
        <li><strong>Антибиотики:</strong> принимать строго полный назначенный курс.</li>
        <li><strong>Гигиена:</strong> чистить зубы мягкой щеткой 2 раза в день, аккуратно обходя зону швов.</li>
      </ul>

      <div class="memo-alert">
        <strong>СРОЧНО СВЯЖИТЕСЬ С КЛИНИКОЙ, ЕСЛИ:</strong>
        <ul style="margin: 2pt 0 1pt 12pt;">
          <li>Непрекращающееся кровотечение из раны более 3–4 часов;</li>
          <li>Температура тела поднялась выше 38.0 °C на 2–3 сутки;</li>
          <li>Нарастающий отек и резкая боль спустя 3–4 дня;</li>
          <li>Онемение губы или языка сохраняется более 24 часов.</li>
        </ul>
      </div>

      <p style="font-size: 8pt; color: #4b5563;">
        Плановый осмотр и снятие швов назначены на: <strong>«___» _________ _____ г. в ____:____</strong>.${clinicPhone ? `<br/>Телефон регистратуры: <strong>${clinicPhone}</strong>.` : ""}
      </p>
    </div>

    <div class="signatures-grid">
      <div>
        <strong>Памятку получил(а), правила разъяснены:</strong><br>
        Пациент: <strong>${ptName}</strong><br>
        <div class="sign-line"></div>
        <div class="sign-caption">(подпись пациента) • Дата: ${todayFormatted}</div>
      </div>
      <div>
        <strong>Памятку выдал:</strong><br>
        Врач: <strong>${docDoctorName}</strong><br>
        <div class="sign-line"></div>
        <div class="sign-caption">(подпись врача)${clinicPhone ? ` • Телефон клиники: ${clinicPhone}` : ""}</div>
      </div>
    </div>
  </div>`;
}

export function generateSurgicalPackageHtml(
	options: SurgicalPackagePrintOptions,
): string {
	const ctx: SurgicalRequisitesContext = buildSurgicalRequisitesContext(options);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Хирургический пакет документов — ${ctx.ptName || "Пациент"}</title>
  <style>${SURGICAL_PACKAGE_CSS}</style>
</head>
<body>
${renderSurgicalConsentSheet(ctx)}
${renderSurgicalAnesthesiaSheet(ctx)}
${renderSurgicalMemoSheet(ctx)}
</body>
</html>`;
}

export function printSurgicalPackage(
	options: SurgicalPackagePrintOptions,
): void {
	const html = generateSurgicalPackageHtml(options);
	printHtmlViaIframe(html, "dente-surgical-package-print-iframe");
}

export type { SurgicalOperationProtocolPrintOptions };
export {
	generateSurgicalOperationProtocolHtml,
	printSurgicalOperationProtocol,
};
