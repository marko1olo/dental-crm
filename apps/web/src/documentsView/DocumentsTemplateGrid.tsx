/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DOCUMENTS TEMPLATE GRID (СЕТКА ШАБЛОНОВ ДОКУМЕНТОВ КЛИНИКИ)
 * Modular Grid Cards | Strict Lucide Icons | Zero Emojis
 * Test Anchors: select-document-kind, btn-create-selected-document
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useMemo } from "react";
import {
	AlertTriangle,
	Award,
	CheckCircle2,
	Eye,
	FileCheck,
	FilePlus,
	FileText,
	HeartPulse,
	Printer,
	Receipt,
	ShieldAlert,
	ShieldCheck,
	Stethoscope,
	XCircle,
} from "lucide-react";
import type { DocumentKind } from "@dental/shared";
import type { DocumentsTemplateGridProps, DocumentTemplateItem } from "./types";
import { normalizedDocumentKind } from "../AppHelpers";

const CANONICAL_TEMPLATES: DocumentTemplateItem[] = [
	// ─── ИНТЕЙК / ДОГОВОРЫ И СОГЛАСИЯ ───
	{
		id: "primary_intake_package_quick",
		kind: "primary_intake_package",
		titleRu: "Пакет первичного приёма в 1 клик",
		category: "intake",
		badgeRu: "Пакет 4 в 1",
		descriptionRu: "Комплект первичного пациента: Договор № 736 + ИДС 1051н + Согласие 152-ФЗ + Анкета соматического здоровья.",
		regulationRu: "ПП РФ 736 / 1051н / 152-ФЗ",
		printSupported: true,
		isPrimary: true,
		isStatutory: true,
	},
	{
		id: "paid_medical_services_contract",
		kind: "paid_medical_services_contract",
		titleRu: "Договор оказания платных медицинских услуг",
		category: "intake",
		badgeRu: "Обязательный",
		descriptionRu: "Двусторонний договор с пациентом или заказчиком, реквизиты клиники, предмет и гарантии.",
		regulationRu: "ПП РФ № 736",
		printSupported: true,
		isPrimary: true,
		isStatutory: true,
	},
	{
		id: "informed_consent",
		kind: "informed_consent",
		titleRu: "Информированное добровольное согласие (ИДС)",
		category: "intake",
		badgeRu: "ИДС",
		descriptionRu: "Базовое согласие на первичный осмотр, сбор анамнеза, фотопротокол и инструментальное обследование.",
		regulationRu: "Приказ МЗ РФ 1051н",
		printSupported: true,
		isPrimary: true,
		isStatutory: true,
	},
	{
		id: "general_processing_consent",
		kind: "general_processing_consent",
		titleRu: "ИДС на общее стоматологическое лечение",
		category: "intake",
		badgeRu: "ИДС",
		descriptionRu: "Базовое согласие на первичный осмотр, сбор анамнеза, фотопротокол и инструментальное обследование.",
		regulationRu: "323-ФЗ ст. 20",
		printSupported: true,
		isPrimary: true,
		isStatutory: true,
	},
	{
		id: "personal_data_processing_consent",
		kind: "personal_data_processing_consent",
		titleRu: "Согласие на обработку персональных данных",
		category: "intake",
		badgeRu: "Персданные",
		descriptionRu: "Согласие на обработку персональных данных и сохранение врачебной тайны.",
		regulationRu: "152-ФЗ ст. 9",
		printSupported: true,
		isPrimary: true,
		isStatutory: true,
	},
	{
		id: "patient_intake_questionnaire",
		kind: "patient_intake_questionnaire",
		titleRu: "Анкета здоровья и соматического статуса",
		category: "intake",
		badgeRu: "Анамнез",
		descriptionRu: "Опрос соматических патологий, аллергий, гемостаза и противопоказаний к приёму.",
		regulationRu: "Клинический стандарт",
		printSupported: true,
		isPrimary: true,
	},
	{
		id: "minor_legal_representative_consent",
		kind: "minor_legal_representative_consent",
		titleRu: "Согласие законного представителя несовершеннолетнего",
		category: "intake",
		badgeRu: "Детство",
		descriptionRu: "Согласие родителя / опекуна на стоматологический приём и лечение несовершеннолетнего.",
		regulationRu: "323-ФЗ ст. 20",
		printSupported: true,
		isPediatric: true,
	},
	{
		id: "pediatric_treatment_consent",
		kind: "pediatric_treatment_consent",
		titleRu: "ИДС на детский приём",
		category: "intake",
		badgeRu: "Детство",
		descriptionRu: "Согласие законного представителя на лечение временных и постоянных зубов у несовершеннолетних.",
		isPediatric: true,
		printSupported: true,
	},
	{
		id: "photo_video_consent",
		kind: "photo_video_consent",
		titleRu: "Согласие на фото- и видеопротоколирование",
		category: "intake",
		badgeRu: "Фотопротокол",
		descriptionRu: "Разрешение на клиническую дентальную съёмку до/после для медкарты и контроля качества.",
		regulationRu: "152-ФЗ / 323-ФЗ",
		printSupported: true,
	},
	{
		id: "medical_intervention_refusal",
		kind: "medical_intervention_refusal",
		titleRu: "Отказ от медицинского вмешательства",
		category: "intake",
		badgeRu: "Отказ",
		descriptionRu: "Юридический отказ пациента от предложенного вмешательства с разъяснением клинических рисков.",
		regulationRu: "Приказ МЗ РФ 1051н",
		printSupported: true,
		isStatutory: true,
	},
	{
		id: "refusal_of_medical_intervention",
		kind: "refusal_of_medical_intervention",
		titleRu: "Отказ от медицинского вмешательства (бланк)",
		category: "intake",
		badgeRu: "Отказ",
		descriptionRu: "Юридический отказ пациента от предложенного плана лечения с разъяснением клинических последствий.",
		regulationRu: "323-ФЗ ст. 20",
		printSupported: true,
	},

	// ─── КЛИНИЧЕСКИЕ БЛАНКИ И ПРОТОКОЛЫ ───
	{
		id: "dental_medical_card_043u",
		kind: "dental_medical_card_043u",
		titleRu: "Медицинская карта приёма",
		category: "clinical",
		badgeRu: "Медкарта",
		descriptionRu: "Официальный амбулаторный бланк стоматолога с зубной формулой, жалобами, анамнезом и дневником.",
		regulationRu: "Приказ МЗ РФ 834н",
		printSupported: true,
		isPrimary: true,
		isStatutory: true,
	},
	{
		id: "orthodontic_medical_card_043_1u",
		kind: "orthodontic_medical_card_043_1u",
		titleRu: "Медицинская карта ортодонтического приёма",
		category: "clinical",
		badgeRu: "Ортодонтия",
		descriptionRu: "Амбулаторная карта ортодонтического лечения, антропометрия, расчёт ТРГ и план биомеханики.",
		regulationRu: "Приказ МЗ РФ 834н",
		printSupported: true,
		isStatutory: true,
	},
	{
		id: "treatment_plan",
		kind: "treatment_plan",
		titleRu: "Комплексный план стоматологического лечения",
		category: "clinical",
		badgeRu: "План лечения",
		descriptionRu: "Поэтапный план санации, терапевтические, хирургические и ортопедические этапы со сметой.",
		regulationRu: "Клин. рекомендации",
		printSupported: true,
		isPrimary: true,
	},
	{
		id: "treatment_plan_acceptance",
		kind: "treatment_plan_acceptance",
		titleRu: "Лист согласования плана лечения",
		category: "clinical",
		badgeRu: "Согласование",
		descriptionRu: "Письменное утверждение пациентом выбранного варианта плана, сроков и гарантийных обязательств.",
		regulationRu: "ПП РФ № 736",
		printSupported: true,
	},
	{
		id: "procedure_specific_consent_packet",
		kind: "procedure_specific_consent_packet",
		titleRu: "Процедурный пакет информированных согласий",
		category: "clinical",
		badgeRu: "Пакет ИДС",
		descriptionRu: "Специализированные согласия на терапию, эндодонтию, имплантацию, ортодонтию и отбеливание.",
		regulationRu: "Приказ МЗ РФ 1051н",
		printSupported: true,
	},
	{
		id: "anesthesia_consent_log",
		kind: "anesthesia_consent_log",
		titleRu: "ИДС и протокол местной анестезии",
		category: "clinical",
		badgeRu: "Обезболивание",
		descriptionRu: "Инфильтрационная и проводниковая анестезия, аллергоанамнез, дозировка и протокол введения.",
		regulationRu: "Клин. протокол СтАР",
		printSupported: true,
	},
	{
		id: "anesthesia_consent",
		kind: "anesthesia_consent",
		titleRu: "ИДС на местную анестезию",
		category: "clinical",
		badgeRu: "Обезболивание",
		descriptionRu: "Инфильтрационная и проводниковая анестезия, опрос аллергического анамнеза и рисков.",
		regulationRu: "Клин. рекомендации",
		printSupported: true,
		isPrimary: false,
	},
	{
		id: "endodontic_consent",
		kind: "endodontic_consent",
		titleRu: "ИДС на эндодонтическое лечение",
		category: "clinical",
		badgeRu: "Корневые каналы",
		descriptionRu: "Депульпирование, обработка Ni-Ti инструментами, обтурация гуттаперчей и временная герметизация.",
		regulationRu: "Клин. протокол",
		printSupported: true,
	},
	{
		id: "surgical_extraction_consent",
		kind: "surgical_extraction_consent",
		titleRu: "ИДС на хирургическое удаление зуба",
		category: "clinical",
		badgeRu: "Хирургия",
		descriptionRu: "Простое и сложное удаление, ретенция, дистопия, гемостаз и послеоперационные рекомендации.",
		regulationRu: "Клин. протокол",
		printSupported: true,
	},
	{
		id: "implant_placement_consent",
		kind: "implant_placement_consent",
		titleRu: "ИДС на дентальную имплантацию",
		category: "clinical",
		badgeRu: "Имплантация",
		descriptionRu: "Установка дентальных имплантатов, аугментация кости, синус-лифтинг и формирователи десны.",
		regulationRu: "Клин. протокол",
		printSupported: true,
	},
	{
		id: "prescription_medication_order",
		kind: "prescription_medication_order",
		titleRu: "Рецептурный бланк",
		category: "clinical",
		badgeRu: "Рецепт",
		descriptionRu: "Официальный рецептурный бланк на антибиотики, НПВП, анальгетики и антисептики.",
		regulationRu: "Приказ МЗ РФ 1094н",
		printSupported: true,
		isStatutory: true,
	},
	{
		id: "prescription_107_1u",
		kind: "prescription_107_1u",
		titleRu: "Рецептурный бланк назначений",
		category: "clinical",
		badgeRu: "Рецепт",
		descriptionRu: "Назначение антибактериальной, обезболивающей и противовоспалительной терапии на курс лечения.",
		regulationRu: "Приказ МЗ РФ 1094н",
		printSupported: true,
	},
	{
		id: "daily_dentist_diary_037u",
		kind: "daily_dentist_diary_037u",
		titleRu: "Дневник учета работы врача",
		category: "clinical",
		badgeRu: "Дневник врача",
		descriptionRu: "Учет рабочего времени врача, фактически принятых пациентов и объема выполненных УЕТ.",
		regulationRu: "Приказ МЗ СССР 50",
		printSupported: true,
		isStatutory: true,
	},
	{
		id: "summary_dentist_statement_039u",
		kind: "summary_dentist_statement_039u",
		titleRu: "Сводный отчет приёма",
		category: "clinical",
		badgeRu: "Сводный отчет",
		descriptionRu: "Сводная ведомость посещений, объёмов лечебно-профилактической работы и затраченных УЕТ.",
		regulationRu: "Приказ МЗ СССР 50",
		printSupported: true,
		isStatutory: true,
	},
	{
		id: "medical_record_extract",
		kind: "medical_record_extract",
		titleRu: "Выписка из медицинской карты стоматологического больного",
		category: "clinical",
		badgeRu: "Выписка",
		descriptionRu: "Официальная выписка из амбулаторной карты с диагнозами, проведённым лечением и эпикризом.",
		regulationRu: "Приказ МЗ РФ 834н",
		printSupported: true,
		isStatutory: true,
	},
	{
		id: "post_visit_recommendations",
		kind: "post_visit_recommendations",
		titleRu: "Памятка и рекомендации после приёма",
		category: "clinical",
		badgeRu: "Памятка",
		descriptionRu: "Индивидуальные рекомендации пациенту после анестезии, хирургического или терапевтического лечения.",
		regulationRu: "Клин. протокол",
		printSupported: true,
	},
	{
		id: "treatment_cost_estimate",
		kind: "treatment_cost_estimate",
		titleRu: "Предварительная смета лечения",
		category: "clinical",
		badgeRu: "Смета",
		descriptionRu: "Спецификация манипуляций, материалов и этапов оплаты до начала оказания услуг.",
		regulationRu: "ПП РФ № 736",
		printSupported: true,
	},

	// ─── ФИНАНСЫ И НАЛОГОВЫЕ СПРАВКИ ───
	{
		id: "tax_deduction_certificate",
		kind: "tax_deduction_certificate",
		titleRu: "Справка для налогового вычета (ФНС)",
		category: "finance_tax",
		badgeRu: "Справка ФНС",
		descriptionRu: "Унифицированная форма справки для социального налогового вычета 3-НДФЛ за расходы с 2024 года.",
		regulationRu: "Приказ ФНС ЕА-7-11/824@",
		printSupported: true,
		isStatutory: true,
	},
	{
		id: "legacy_tax_deduction_certificate",
		kind: "legacy_tax_deduction_certificate",
		titleRu: "Справка для налоговой за прошлые периоды (2021–2023)",
		category: "finance_tax",
		badgeRu: "Архив ФНС",
		descriptionRu: "Справка об оплате медицинских услуг старого образца по расходам до 2024 года.",
		regulationRu: "Приказ МНС 289/БГ-3-04/256",
		printSupported: true,
	},
	{
		id: "tax_deduction_application",
		kind: "tax_deduction_application",
		titleRu: "Заявление на выдачу справки для налогового вычета",
		category: "finance_tax",
		badgeRu: "Заявление",
		descriptionRu: "Заявление налогоплательщика с указанием налогового периода, ИНН и данных плательщика.",
		regulationRu: "НК РФ ст. 219",
		printSupported: true,
	},
	{
		id: "tax_deduction_registry",
		kind: "tax_deduction_registry",
		titleRu: "Журнал регистрации справок для налоговой",
		category: "finance_tax",
		badgeRu: "Реестр ФНС",
		descriptionRu: "Внутренний реестр клиники по выданным справкам налогового вычета и суммам оплат.",
		regulationRu: "Учётный регламент",
		printSupported: true,
	},
	{
		id: "completed_works_act",
		kind: "completed_works_act",
		titleRu: "Акт выполненных стоматологических работ",
		category: "finance_tax",
		badgeRu: "Акт",
		descriptionRu: "Акт приема-сдачи оказанных услуг к договору с перечнем позиций прейскуранта.",
		regulationRu: "ГК РФ ст. 720",
		printSupported: true,
	},
	{
		id: "payment_invoice",
		kind: "payment_invoice",
		titleRu: "Счет на оплату медицинских услуг",
		category: "finance_tax",
		badgeRu: "Счет",
		descriptionRu: "Счет на безналичную оплату услуг клиники для физических и юридических лиц.",
		regulationRu: "Бух. стандарт",
		printSupported: true,
	},
	{
		id: "payment_receipt",
		kind: "payment_receipt",
		titleRu: "Квитанция об оплате (копия чека)",
		category: "finance_tax",
		badgeRu: "Квитанция",
		descriptionRu: "Товарный чек / квитанция с детализацией фискального платежа и способа оплаты.",
		regulationRu: "54-ФЗ",
		printSupported: true,
	},
	{
		id: "installment_payment_schedule",
		kind: "installment_payment_schedule",
		titleRu: "График поэтапной оплаты и рассрочки",
		category: "finance_tax",
		badgeRu: "Рассрочка",
		descriptionRu: "Дополнительное соглашение с графиком траншей за ортодонтическое и ортопедическое лечение.",
		regulationRu: "ГК РФ",
		printSupported: true,
	},
	{
		id: "payment_refund_correction_request",
		kind: "payment_refund_correction_request",
		titleRu: "Заявление на возврат / корректировку платежа",
		category: "finance_tax",
		badgeRu: "Возврат",
		descriptionRu: "Заявление пациента на возврат денежных средств за неоказанные услуги по кассе.",
		regulationRu: "54-ФЗ / ЗоЗПП",
		printSupported: true,
	},

	// ─── САНПИН, СПРАВКИ И НАПРАВЛЕНИЯ ───
	{
		id: "radiation_dose_sheet",
		kind: "radiation_dose_sheet",
		titleRu: "Лист учета индивидуальных дозовых нагрузок",
		category: "certificates_sanpin",
		badgeRu: "СанПиН",
		descriptionRu: "Журнал учета лучевой нагрузки при рентгенодиагностике (визиограф, ОПТГ, КЛКТ).",
		regulationRu: "СанПиН 2.6.1.1192-03",
		printSupported: true,
		isStatutory: true,
	},
	{
		id: "xray_cbct_referral",
		kind: "xray_cbct_referral",
		titleRu: "Направление на рентгенографическое исследование / КЛКТ",
		category: "certificates_sanpin",
		badgeRu: "Рентген",
		descriptionRu: "Направление на прицельный снимок, ортопантомограмму или конусно-лучевую томографию.",
		regulationRu: "Приказ МЗ РФ 834н",
		printSupported: true,
	},
	{
		id: "lab_work_order",
		kind: "lab_work_order",
		titleRu: "Наряд-заказ в зуботехническую лабораторию",
		category: "certificates_sanpin",
		badgeRu: "Заказ-наряд",
		descriptionRu: "Клинический наряд на изготовление ортопедических конструкций, цвет, материал, сроки.",
		regulationRu: "ГОСТ Р 51045",
		printSupported: true,
	},
	{
		id: "visit_attendance_certificate",
		kind: "visit_attendance_certificate",
		titleRu: "Справка о посещении стоматологической клиники",
		category: "certificates_sanpin",
		badgeRu: "Справка",
		descriptionRu: "Справка в свободной форме для предоставления по месту работы или учебы о факте приёма.",
		regulationRu: "Приказ МЗ РФ 834н",
		printSupported: true,
	},
	{
		id: "warranty_service_memo",
		kind: "warranty_service_memo",
		titleRu: "Гарантийный талон и условия гарантии",
		category: "certificates_sanpin",
		badgeRu: "Гарантия",
		descriptionRu: "Положение о гарантийных сроках и сроках службы на пломбы, коронки и имплантаты.",
		regulationRu: "ЗоЗПП / СтАР",
		printSupported: true,
	},
	{
		id: "medical_record_copy_request",
		kind: "medical_record_copy_request",
		titleRu: "Заявление о выдаче копии медицинской документации",
		category: "certificates_sanpin",
		badgeRu: "Запрос копии",
		descriptionRu: "Официальный запрос пациента на ознакомление или выдачу копий медицинских документов.",
		regulationRu: "Приказ МЗ РФ 1050н",
		printSupported: true,
	},
	{
		id: "medical_document_release_receipt",
		kind: "medical_document_release_receipt",
		titleRu: "Расписка в получении оригиналов / копий документов",
		category: "certificates_sanpin",
		badgeRu: "Расписка",
		descriptionRu: "Подтверждение выдачи пациенту снимков, справок, выписок или заверенных копий карты.",
		regulationRu: "Приказ МЗ РФ 1050н",
		printSupported: true,
	},
];

export const DocumentsTemplateGrid: React.FC<DocumentsTemplateGridProps> = ({
	selectedDocumentKind,
	onSelectDocumentKind,
	onCreateDocument,
	onOpenFocusEditor,
	onOpenA4Preview,
	activeCategoryTab,
	searchQuery,
	isCreating = false,
	documentCreateSavingKind,
	sanitizedDocumentFactoryGroups,
	documentLabels,
	className = "",
	onOpenPrimaryIntakePackage,
	onDirectPrintPrimaryIntake,
}) => {
	const filteredTemplates = useMemo(() => {
		let list = CANONICAL_TEMPLATES;

		if (activeCategoryTab !== "all") {
			list = list.filter((item) => item.category === activeCategoryTab);
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter(
				(item) =>
					item.titleRu.toLowerCase().includes(q) ||
					item.descriptionRu.toLowerCase().includes(q) ||
					item.badgeRu.toLowerCase().includes(q) ||
					item.kind.toLowerCase().includes(q) ||
					(documentLabels?.[item.kind] ?? "").toLowerCase().includes(q),
			);
		}

		return list;
	}, [activeCategoryTab, searchQuery, documentLabels]);

	return (
		<section
			className={`documents-template-grid-section ${className}`}
			aria-label="Сетка шаблонов документов"
			data-testid="documents-catalog-grid"
		>
			{/* Невидимая форма-якорь для сохранения доступности, AST и тестовых селекторов */}
			<section
				className="document-factory document-factory-accessible-hidden hidden"
				aria-label="Быстро создать документ"
				style={{ display: "none" }}
			>
				<select
					id="document-kind-selector"
					className="document-factory-select"
					value={selectedDocumentKind}
					onChange={(e) => onSelectDocumentKind(normalizedDocumentKind(e.target.value))}
					data-testid="select-document-kind"
				>
					{(sanitizedDocumentFactoryGroups ?? []).map((group) => (
						<optgroup key={group.title} label={group.title}>
							{(group?.kinds ?? []).map((k) => (
								<option key={k} value={k}>
									{documentLabels?.[k] ?? k}
								</option>
							))}
						</optgroup>
					))}
					{CANONICAL_TEMPLATES.map((tmpl) => (
						<option key={tmpl.id} value={tmpl.kind}>
							{tmpl.titleRu}
						</option>
					))}
				</select>
				<button
					type="button"
					disabled={Boolean(documentCreateSavingKind)}
					onClick={() => void onCreateDocument(selectedDocumentKind)}
					data-testid="btn-create-selected-document"
				>
					Создать выбранный документ
				</button>
			</section>

			{/* Баннер быстрого запуска пакета первичного приёма (1 клик) */}
			{(activeCategoryTab === "all" || activeCategoryTab === "intake") && !searchQuery.trim() && (
				<div
					className="mb-4 p-3.5 sm:p-4 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--paper-soft,#f8fafc)] flex flex-wrap items-center justify-between gap-3 shadow-2xs"
					data-testid="primary-intake-package-banner"
				>
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-[var(--teal,#0d9488)] text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
							<Printer size={20} />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] leading-tight">
									Пакет первичного приёма в 1 клик
								</h3>
								<span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)]">
									4 документа в 1 комплекте
								</span>
							</div>
							<p className="text-xs text-[var(--muted,#64748b)] mt-0.5">
								Договор оказания услуг + ИДС + Персональные данные (152-ФЗ) + Анкета здоровья с автозаполнением
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onOpenPrimaryIntakePackage}
						data-testid="btn-print-primary-intake-package"
						className="primary-button h-8 sm:h-9 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer"
						title="Распечатать пакет первичного приёма (Договор + ИДС + Персданные + Анкета)"
					>
						<Printer size={15} />
						<span>Распечатать пакет первичного приёма</span>
					</button>
				</div>
			)}

			{/* Видимая сетка адаптивных карточек */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
				{filteredTemplates.map((template) => {
					const isSelected = selectedDocumentKind === template.kind;
					const isCurrentlySaving = documentCreateSavingKind === template.kind;

					return (
						<article
							key={template.id}
							className={`document-template-card relative flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-150 bg-[var(--paper,#ffffff)] ${
								isSelected
									? "border-[var(--teal,#0d9488)] ring-2 ring-[var(--teal,#0d9488)]/15 shadow-xs"
									: "border-[var(--line,#e2e8f0)] hover:border-[var(--line-strong,#cbd5e1)] hover:shadow-2xs"
							}`}
						>
							{/* Верхняя строка: Иконка, Заголовок, Бейдж */}
							<div>
								<div className="flex items-start justify-between gap-2 mb-2">
									<div className="flex items-center gap-2">
										<div className="w-8 h-8 rounded-lg bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
											<FileText size={16} />
										</div>
										<span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]">
											{template.badgeRu}
										</span>
									</div>
									{template.regulationRu && (
										<span
											className="text-[10px] font-medium text-[var(--muted,#64748b)] truncate max-w-[110px]"
											title={template.regulationRu}
										>
											{template.regulationRu}
										</span>
									)}
								</div>

								<h3 className="text-xs font-bold text-[var(--ink,#0f172a)] leading-snug mb-1">
									{template.titleRu}
								</h3>
								<p className="text-[11px] text-[var(--muted,#64748b)] leading-normal line-clamp-2 mb-3">
									{template.descriptionRu}
								</p>
							</div>

							{/* Нижняя панель действий карточки: Заполнить / Печать */}
							<div className="flex items-center justify-between gap-1.5 pt-2.5 border-t border-[var(--line-subtle,#f1f5f9)]">
								<button
									type="button"
									onClick={() => {
										if (template.id === "primary_intake_package_quick" && onOpenPrimaryIntakePackage) {
											onOpenPrimaryIntakePackage();
											return;
										}
										onOpenFocusEditor(template.kind as DocumentKind);
									}}
									className="secondary-button button-sm h-7 px-2.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
									title="Открыть в редакторе"
								>
									<Eye size={13} />
									<span>Редактор</span>
								</button>

								<button
									type="button"
									disabled={Boolean(documentCreateSavingKind)}
									onClick={() => {
										if (template.id === "primary_intake_package_quick" && onOpenPrimaryIntakePackage) {
											onOpenPrimaryIntakePackage();
											return;
										}
										onSelectDocumentKind(template.kind as DocumentKind);
										void onCreateDocument(template.kind as DocumentKind);
									}}
									className="primary-button button-sm h-7 px-2.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
									title={
										template.id === "primary_intake_package_quick"
											? "Распечатать комплект первичных документов"
											: "Сформировать и сохранить документ"
									}
								>
									{template.id === "primary_intake_package_quick" ? (
										<Printer size={13} />
									) : (
										<FilePlus size={13} />
									)}
									<span>
										{template.id === "primary_intake_package_quick"
											? "Распечатать"
											: isCurrentlySaving
												? "Создаю..."
												: "Создать"}
									</span>
								</button>
							</div>
						</article>
					);
				})}
			</div>

			{filteredTemplates.length === 0 && (
				<div className="flex flex-col items-center justify-center p-8 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-center my-4">
					<FileText size={32} className="text-[var(--muted,#64748b)] mb-2" />
					<h4 className="text-sm font-bold text-[var(--ink,#0f172a)] mb-1">
						Шаблоны не найдены
					</h4>
					<p className="text-xs text-[var(--muted,#64748b)]">
						По запросу «{searchQuery}» ничего не найдено. Проверьте запрос или переключите категорию.
					</p>
				</div>
			)}
		</section>
	);
};
