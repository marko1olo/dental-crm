/**
 * certificatesSanpinTemplates.ts
 * Referrals, lab orders, certificates, and warranties in clean clinical Russian.
 * Mandates 8b, 8e, 8x, 8ap: Zero regulatory bird-language.
 */

import type { DocumentTemplateItem } from "./documentTemplateTypes";

export const CERTIFICATES_SANPIN_TEMPLATES: readonly DocumentTemplateItem[] = [
	{
		id: "radiation_dose_sheet",
		kind: "radiation_dose_sheet",
		titleRu: "Лист учета индивидуальных дозовых нагрузок",
		category: "certificates_sanpin",
		badgeRu: "Лучевая нагрузка",
		descriptionRu: "Журнал учета лучевой нагрузки при рентгенодиагностике (визиограф, панорамный снимок, томография).",
		regulationRu: "Контроль радиации",
		printSupported: true,
		isStatutory: true,
	},
	{
		id: "xray_cbct_referral",
		kind: "xray_cbct_referral",
		titleRu: "Направление на рентгенографическое исследование / КЛКТ",
		category: "certificates_sanpin",
		badgeRu: "Рентген",
		descriptionRu: "Направление на прицельный снимок, панорамную томограмму или 3D томографию челюсти.",
		regulationRu: "Направление на снимок",
		printSupported: true,
	},
	{
		id: "lab_work_order",
		kind: "lab_work_order",
		titleRu: "Наряд-заказ в зуботехническую лабораторию",
		category: "certificates_sanpin",
		badgeRu: "Заказ-наряд",
		descriptionRu: "Клинический наряд на изготовление ортопедических конструкций, цвет, материал, сроки.",
		regulationRu: "Зуботехнический наряд",
		printSupported: true,
	},
	{
		id: "visit_attendance_certificate",
		kind: "visit_attendance_certificate",
		titleRu: "Справка о посещении стоматологической клиники",
		category: "certificates_sanpin",
		badgeRu: "Справка",
		descriptionRu: "Справка в свободной форме для предоставления по месту работы или учебы о факте приёма.",
		regulationRu: "Справка о визите",
		printSupported: true,
	},
	{
		id: "warranty_service_memo",
		kind: "warranty_service_memo",
		titleRu: "Гарантийный талон и условия гарантии",
		category: "certificates_sanpin",
		badgeRu: "Гарантия",
		descriptionRu: "Положение о гарантийных сроках и сроках службы на пломбы, коронки и имплантаты.",
		regulationRu: "Гарантийный талон",
		printSupported: true,
	},
	{
		id: "medical_record_copy_request",
		kind: "medical_record_copy_request",
		titleRu: "Заявление о выдаче копии медицинской документации",
		category: "certificates_sanpin",
		badgeRu: "Запрос копии",
		descriptionRu: "Официальный запрос пациента на ознакомление или выдачу копий медицинских документов.",
		regulationRu: "Выдача копий",
		printSupported: true,
	},
	{
		id: "medical_document_release_receipt",
		kind: "medical_document_release_receipt",
		titleRu: "Расписка в получении оригиналов / копий документов",
		category: "certificates_sanpin",
		badgeRu: "Расписка",
		descriptionRu: "Подтверждение выдачи пациенту снимков, справок, выписок или заверенных копий карты.",
		regulationRu: "Расписка в получении",
		printSupported: true,
	},
];
