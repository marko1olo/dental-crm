import type React from "react";
import {
	Calendar,
	CalendarCheck,
	CheckCheck,
	CreditCard,
	FileCheck,
	FileText,
	Gift,
	MapPin,
	Shield,
	Sparkles,
	Stethoscope,
} from "lucide-react";
import { generateAppointmentWhatsAppMessage } from "../schedule/generateAppointmentWhatsAppMessage";

export interface QuickTemplateItem {
	id: string;
	icon: React.ReactNode;
	label: string;
	category: string;
	buildText: () => string;
}

export interface BuildQuickTemplatesParams {
	clinicName: string;
	clinicAddress: string;
	clinicPhone?: string;
	effectiveName: string;
	upcomingAppointment: {
		formattedDate: string;
		formattedTime: string;
		doctorName?: string | null | undefined;
		startsAt: string;
		reason?: string | null | undefined;
	} | null;
	financialSummary: {
		formattedDebt: string;
	};
}

/**
 * Builds quick clinical and administrative WhatsApp templates with vector Lucide icons.
 * Strict Mandate 8d (Zero emojis in clinical memos).
 * Strict Mandate 8e (Doctor & staff autonomy).
 */
export function buildQuickTemplates({
	clinicName,
	clinicAddress,
	clinicPhone,
	effectiveName,
	upcomingAppointment,
	financialSummary,
}: BuildQuickTemplatesParams): QuickTemplateItem[] {
	return [
		{
			id: "appt_reminder",
			icon: <Calendar size={14} className="text-teal-400" />,
			label: "Напоминание о приёме",
			category: "appointment",
			buildText: () =>
				upcomingAppointment
					? `Здравствуйте, ${effectiveName}! Напоминаем о вашей записи на приём в стоматологию ${clinicName}: ${upcomingAppointment.formattedDate} в ${upcomingAppointment.formattedTime} к врачу ${upcomingAppointment.doctorName || "специалисту"}. Ждём вас!`
					: `Здравствуйте, ${effectiveName}! Напоминаем о запланированном визите в стоматологическую клинику ${clinicName}. Пожалуйста, сообщите, если вам потребуется скорректировать время приёма.`,
		},
		{
			id: "surgery_memo",
			icon: <FileText size={14} className="text-amber-400" />,
			label: "Рекомендации после удаления",
			category: "clinical",
			buildText: () =>
				`Здравствуйте, ${effectiveName}! Рекомендации после хирургического вмешательства / удаления в клинике ${clinicName}:\n1. Не принимать пищу 2 часа до окончания действия анестезии.\n2. Не полоскать полость рта в первые сутки (сохраняйте кровяной сгусток!).\n3. Исключить горячую пищу, бани, сауны и физические нагрузки на 3–5 дней.\n4. При возникновении вопросов звоните нам в клинику: ${clinicPhone || ""}. До скорой встречи!`,
		},
		{
			id: "appt_confirm",
			icon: <CalendarCheck size={14} className="text-emerald-400" />,
			label: "Подтверждение визита",
			category: "appointment",
			buildText: () =>
				upcomingAppointment
					? generateAppointmentWhatsAppMessage({
							patientName: effectiveName,
							doctorName: upcomingAppointment.doctorName,
							appointmentStartsAt: upcomingAppointment.startsAt,
							clinicName: clinicName,
							clinicAddress: clinicAddress,
							treatmentReason: upcomingAppointment.reason,
						})
					: `Здравствуйте, ${effectiveName}! Напоминаем о вашей записи в стоматологию ${clinicName}. Пожалуйста, подтвердите визит ответным сообщением ДА.`,
		},
		{
			id: "appt_confirmed",
			icon: <CheckCheck size={14} className="text-emerald-400" />,
			label: "Запись подтверждена",
			category: "appointment",
			buildText: () =>
				upcomingAppointment
					? `Здравствуйте, ${effectiveName}! Ваша запись на приём подтверждена: ${upcomingAppointment.formattedDate} в ${upcomingAppointment.formattedTime} к врачу ${upcomingAppointment.doctorName || "специалисту"}. Стоматология ${clinicName} (${clinicAddress}). Будем рады вас видеть!`
					: `Здравствуйте, ${effectiveName}! Ваша запись в стоматологическую клинику ${clinicName} подтверждена. Ждём вас по адресу: ${clinicAddress}.`,
		},
		{
			id: "hygiene_memo",
			icon: <Sparkles size={14} className="text-cyan-400" />,
			label: "Памятка: Профгигиена / Air Flow",
			category: "clinical",
			buildText: () =>
				`Здравствуйте, ${effectiveName}! Памятка к процедуре профессиональной гигиены в ${clinicName}:\nПожалуйста, воздержитесь от кофе, крепкого чая, ягод и красящих продуктов за 2 часа до и после чистки. Ждём вас!`,
		},
		{
			id: "ortho_memo",
			icon: <Stethoscope size={14} className="text-indigo-400" />,
			label: "Памятка: Ортодонтия / Каппы",
			category: "clinical",
			buildText: () =>
				`Здравствуйте, ${effectiveName}! Напоминание перед визитом к ортодонту в ${clinicName}:\nПожалуйста, обязательно возьмите с собой текущие каппы/элайнеры, защитный кейс и почистите зубы перед приёмом.`,
		},
		{
			id: "therapy_memo",
			icon: <Shield size={14} className="text-blue-400" />,
			label: "Памятка: Лечение кариеса",
			category: "clinical",
			buildText: () =>
				`Здравствуйте, ${effectiveName}! Рекомендуем легко перекусить за 1 час до лечения кариеса, так как после местной анестезии прием пищи будет ограничен на 2 часа. До встречи в ${clinicName}!`,
		},
		{
			id: "debt_reminder",
			icon: <CreditCard size={14} className="text-rose-400" />,
			label: "Оплата / Баланс",
			category: "financial",
			buildText: () =>
				`Здравствуйте, ${effectiveName}! Напоминаем, что по вашей карте в клинике ${clinicName} числится остаток к оплате ${financialSummary.formattedDebt}. Оплатить можно в клинике или по безналичному расчету. Спасибо!`,
		},
		{
			id: "docs_ready",
			icon: <FileCheck size={14} className="text-purple-400" />,
			label: "Справка для налоговой",
			category: "administrative",
			buildText: () =>
				`Здравствуйте, ${effectiveName}! Ваша справка для налогового вычета (со всеми чеками и лицензией клиники ${clinicName}) готова. Вы можете забрать её на ресепшн или запросить скан в ответном сообщении.`,
		},
		{
			id: "birthday_congrats",
			icon: <Gift size={14} className="text-pink-400" />,
			label: "Поздравление с днем рождения",
			category: "marketing",
			buildText: () =>
				`Здравствуйте, ${effectiveName}! Команда клиники ${clinicName} поздравляет вас с днем рождения! Желаем крепкого здоровья, отличного настроения и сияющей улыбки! В честь праздника дарим вам бонус 1 000 ₽ на любые процедуры или профессиональную гигиену (действует 30 дней). Будем рады видеть вас!`,
		},
		{
			id: "hygiene_recall_6m",
			icon: <Sparkles size={14} className="text-cyan-400" />,
			label: "Профгигиена / Осмотр (6 мес)",
			category: "clinical",
			buildText: () =>
				`Здравствуйте, ${effectiveName}! Напоминаем, что подошел срок планового осмотра и профессиональной гигиены в клинике ${clinicName}. Стоматологи рекомендуют проходить профосмотр каждые полгода, чтобы сохранить здоровье зубов и свежесть дыхания. Будем рады подобрать для вас удобное время!`,
		},
		{
			id: "anesthesia_memo",
			icon: <Shield size={14} className="text-teal-400" />,
			label: "Памятка после анестезии",
			category: "clinical",
			buildText: () =>
				`Здравствуйте, ${effectiveName}! Памятка после местной анестезии в клинике ${clinicName}:\nПожалуйста, воздержитесь от приема горячей и твердой пищи до полного восстановления чувствительности (1.5–2 часа), чтобы избежать случайного прикусывания губы, щеки или языка. При любых вопросах мы на связи!`,
		},
		{
			id: "crown_ztl_ready",
			icon: <Sparkles size={14} className="text-amber-400" />,
			label: "Готовность коронки в ЗТЛ",
			category: "orthopedic",
			buildText: () =>
				`Здравствуйте, ${effectiveName}! Ваша ортопедическая конструкция (коронка/протез) поступила из зуботехнической лаборатории (ЗТЛ) и готова к примерке и постоянной фиксации в клинике ${clinicName}. Ждем вас на приём!`,
		},
		{
			id: "address_parking",
			icon: <MapPin size={14} className="text-orange-400" />,
			label: "Схема проезда",
			category: "navigation",
			buildText: () =>
				`Здравствуйте, ${effectiveName}! Схема проезда в клинику ${clinicName}:\nАдрес: ${clinicAddress}.\nПарковка: Бесплатная гостевая парковка со стороны главного входа (шлагбаум открывается по звонку на ресепшн: ${clinicPhone || ""}).\nНавигатор: https://yandex.ru/maps/?text=${encodeURIComponent(`${clinicName} ${clinicAddress}`)}\nБудем рады вас видеть!`,
		},
	];
}
