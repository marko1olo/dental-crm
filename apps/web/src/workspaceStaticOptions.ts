import type {
  DenteTelegramFeature,
  DenteTelegramPostVisitCheckupDelayHoursByTopic,
  DenteTelegramVisualCardKey,
  PostVisitCareTopic
} from "@dental/shared";

export const telegramFeatureLabels: Record<DenteTelegramFeature, string> = {
  appointment_reminders: "Напоминания о приеме",
  appointment_confirmation: "Подтверждение приема",
  patient_linking: "QR-привязка пациента",
  pre_visit_intake: "Анкета перед визитом",
  document_ready_notice: "Документ готов",
  tax_document_request: "Запрос налоговой справки",
  payment_reminders: "Напоминания об оплате",
  post_visit_instructions: "Памятки после лечения",
  recalls: "Профилактические приглашения",
  review_requests: "Просьбы оставить отзыв",
  staff_daily_digest: "Сводка врачу и администратору",
  staff_task_alerts: "Служебные задачи",
  callback_requests: "Запрос обратного звонка",
  voice_note_intake: "Голосовые обращения",
  secure_portal_links: "Защищенные ссылки на портал"
};

export const telegramFeatureHelp: Record<DenteTelegramFeature, string> = {
  appointment_reminders: "Автоматические напоминания до визита без диагноза и деталей лечения.",
  appointment_confirmation: "Кнопки подтверждения, переноса и связи с администратором.",
  patient_linking: "Одноразовый код и QR для связи Telegram-чата с карточкой пациента.",
  pre_visit_intake: "Сбор административных данных до приема по короткому сценарию.",
  document_ready_notice: "Уведомление о готовности документа, сам файл остается в CRM и защищенном портале.",
  tax_document_request: "Статус подготовки налоговых документов без отправки PDF в чат.",
  payment_reminders: "Аккуратные напоминания о неоплаченных счетах и ссылках на портал.",
  post_visit_instructions: "Памятки после удаления, имплантации, пломбы, гигиены и других процедур.",
  recalls: "Возвратные приглашения на осмотр, гигиену и контроль.",
  review_requests: "Просьба оценить прием с клинической ссылкой на карту или профиль отзывов.",
  staff_daily_digest: "Сводка расписания и задач для сотрудников без персональных медицинских данных в тексте.",
  staff_task_alerts: "Служебные уведомления по очереди связи и готовности документов.",
  callback_requests: "Пациент может попросить звонок, задача попадает в очередь клиники.",
  voice_note_intake: "Голосовые обращения пока выключаются отдельно из-за риска лишних данных.",
  secure_portal_links: "Любые чувствительные файлы и подробности уходят только через портал."
};

export const telegramFeatureOptions = Object.keys(telegramFeatureLabels) as DenteTelegramFeature[];

export const telegramVisualCardFields: Array<{
  key: DenteTelegramVisualCardKey;
  label: string;
  placeholder: string;
  help: string;
}> = [
  {
    key: "mainMenu",
    label: "Картинка главного меню",
    placeholder: "https://.../menu.jpg",
    help: "Показывается в /start, справке, контактах и ответах бота."
  },
  {
    key: "appointment",
    label: "Картинка записи",
    placeholder: "https://.../appointment.jpg",
    help: "Для подтверждений, переносов и напоминаний о приеме."
  },
  {
    key: "documents",
    label: "Картинка документов",
    placeholder: "https://.../documents.jpg",
    help: "Для готовых справок, выписок и запросов пациента."
  },
  {
    key: "tax",
    label: "Картинка налоговых документов",
    placeholder: "https://.../tax.jpg",
    help: "Для статуса справок КНД, заявлений и реестров."
  },
  {
    key: "billing",
    label: "Картинка оплаты",
    placeholder: "https://.../payment.jpg",
    help: "Для напоминаний об оплате и ссылок на портал."
  },
  {
    key: "care",
    label: "Картинка памяток",
    placeholder: "https://.../care.jpg",
    help: "Для удаления, имплантации, пломбы, гигиены и повторного осмотра."
  },
  {
    key: "review",
    label: "Картинка отзыва",
    placeholder: "https://.../review.jpg",
    help: "Для просьбы оценить клинику и открыть карточку на картах."
  },
  {
    key: "staff",
    label: "Картинка для сотрудников",
    placeholder: "https://.../staff.jpg",
    help: "Для будущих ежедневных дайджестов и задач врачей."
  }
];

export type TelegramPostVisitCheckupDelayKey = keyof DenteTelegramPostVisitCheckupDelayHoursByTopic;
export type TelegramPostVisitCheckupDelayDrafts = Record<TelegramPostVisitCheckupDelayKey, string>;

export const defaultTelegramPostVisitCheckupDelayHoursByTopic: DenteTelegramPostVisitCheckupDelayHoursByTopic = {
  extraction: 24,
  implantation: 24,
  filling_restoration: 48,
  endo: 48,
  surgery: 24,
  local_anesthesia: 24,
  hygiene: 72,
  prosthetics: 48,
  orthodontics: 72,
  periodontology: 72,
  other: 48
};

export const defaultTelegramPostVisitCheckupDelayDrafts: TelegramPostVisitCheckupDelayDrafts = {
  extraction: String(defaultTelegramPostVisitCheckupDelayHoursByTopic.extraction),
  implantation: String(defaultTelegramPostVisitCheckupDelayHoursByTopic.implantation),
  filling_restoration: String(defaultTelegramPostVisitCheckupDelayHoursByTopic.filling_restoration),
  endo: String(defaultTelegramPostVisitCheckupDelayHoursByTopic.endo),
  surgery: String(defaultTelegramPostVisitCheckupDelayHoursByTopic.surgery),
  local_anesthesia: String(defaultTelegramPostVisitCheckupDelayHoursByTopic.local_anesthesia),
  hygiene: String(defaultTelegramPostVisitCheckupDelayHoursByTopic.hygiene),
  prosthetics: String(defaultTelegramPostVisitCheckupDelayHoursByTopic.prosthetics),
  orthodontics: String(defaultTelegramPostVisitCheckupDelayHoursByTopic.orthodontics),
  periodontology: String(defaultTelegramPostVisitCheckupDelayHoursByTopic.periodontology),
  other: String(defaultTelegramPostVisitCheckupDelayHoursByTopic.other)
};

export const telegramPostVisitCheckupDelayFields: Array<{
  key: TelegramPostVisitCheckupDelayKey;
  label: string;
  help: string;
}> = [
  { key: "extraction", label: "После удаления", help: "Контроль самочувствия после удаления зуба." },
  { key: "implantation", label: "После имплантации", help: "Контроль после имплантации и хирургического этапа." },
  { key: "filling_restoration", label: "После пломбы", help: "Проверка завышения пломбы и дискомфорта." },
  { key: "hygiene", label: "После гигиены", help: "Мягкое напоминание после профессиональной гигиены." },
  { key: "endo", label: "После эндодонтии", help: "Контроль боли после лечения каналов." },
  { key: "surgery", label: "После операции", help: "Хирургический контроль без диагноза в тексте." },
  { key: "local_anesthesia", label: "После анестезии", help: "Короткий контроль после приема с анестезией." },
  { key: "prosthetics", label: "После протезирования", help: "Проверка адаптации к конструкции." },
  { key: "orthodontics", label: "После ортодонтии", help: "Контроль адаптации к аппарату или элайнерам." },
  { key: "periodontology", label: "После пародонтологии", help: "Контроль десен и ухода." },
  { key: "other", label: "Другое", help: "Запасной срок для общих памяток." }
];

export const postVisitCareTopicOptions: Array<{ value: PostVisitCareTopic; label: string }> = [
  { value: "extraction", label: "Удаление" },
  { value: "implantation", label: "Имплантация / костная пластика" },
  { value: "filling_restoration", label: "Пломба / реставрация" },
  { value: "endo", label: "Эндодонтия" },
  { value: "surgery", label: "Хирургия" },
  { value: "local_anesthesia", label: "Местная анестезия" },
  { value: "hygiene", label: "Профессиональная гигиена" },
  { value: "prosthetics", label: "Ортопедия" },
  { value: "orthodontics", label: "Ортодонтия" },
  { value: "periodontology", label: "Пародонтология" },
  { value: "other", label: "Другое" }
];
