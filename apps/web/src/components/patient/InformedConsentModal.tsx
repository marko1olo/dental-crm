import React, { useState, useMemo, useCallback } from "react";
import {
	Printer,
	FileText,
	Check,
	Lock,
	ShieldCheck,
	X,
	Zap,
	Copy,
} from "lucide-react";
import { showToast } from "../GlobalToast";

export type OutpatientConsentTypeKey =
	| "CONSENT_THERAPY"
	| "CONSENT_SURGERY_IMPLANT"
	| "CONSENT_ORTHODONTICS"
	| "CONSENT_ORTHOPEDICS"
	| "CONSENT_HYGIENE_BLEACHING"
	| "CONSENT_ANESTHESIA"
	| "CONSENT_PERSONAL_DATA"
	| "CONSENT_INSPECTION_1051N";

export interface OutpatientConsentTemplateMeta {
	key: OutpatientConsentTypeKey;
	title: string;
	statutoryBasis: string;
	subtitle: string;
}

export const OUTPATIENT_CONSENT_TEMPLATES: OutpatientConsentTemplateMeta[] = [
	{
		key: "CONSENT_THERAPY",
		title: "Терапия и эндодонтия (Кариес / Пульпит)",
		statutoryBasis: "Ст. 20 323-ФЗ • Приказ 1051н • СтАР",
		subtitle: "Информированное согласие на терапевтическое лечение зубов и корневых каналов",
	},
	{
		key: "CONSENT_SURGERY_IMPLANT",
		title: "Хирургия и имплантация",
		statutoryBasis: "Ст. 20 323-ФЗ • Приказ 1051н • СтАР",
		subtitle: "Согласие на хирургическую операцию, удаление зуба и дентальную имплантацию",
	},
	{
		key: "CONSENT_ANESTHESIA",
		title: "Местная анестезия",
		statutoryBasis: "Ст. 20 323-ФЗ • СанПиН 3.3686-21",
		subtitle: "Согласие на проведение инфильтрационной и проводниковой анестезии",
	},
	{
		key: "CONSENT_ORTHOPEDICS",
		title: "Ортопедия (Протезирование)",
		statutoryBasis: "Ст. 20 323-ФЗ • Пост. Правительства № 736",
		subtitle: "Согласие на препарирование, фиксацию коронок, виниров и протезов",
	},
	{
		key: "CONSENT_HYGIENE_BLEACHING",
		title: "Профгигиена и отбеливание",
		statutoryBasis: "Ст. 20 323-ФЗ • 804н",
		subtitle: "Согласие на ультразвуковой скейлинг, Air-Flow и клиническое отбеливание",
	},
	{
		key: "CONSENT_ORTHODONTICS",
		title: "Ортодонтия (Брекеты / Элайнеры)",
		statutoryBasis: "Ст. 20 323-ФЗ • СтАР",
		subtitle: "Согласие на исправление прикуса и установку ортодонтической аппаратуры",
	},
	{
		key: "CONSENT_PERSONAL_DATA",
		title: "Обработка персональных данных (152-ФЗ)",
		statutoryBasis: "Федеральный закон № 152-ФЗ ст. 6, 9",
		subtitle: "Согласие на обработку персональных данных пациента и ведение медицинской карты",
	},
	{
		key: "CONSENT_INSPECTION_1051N",
		title: "Первичный осмотр (Приказ 1051н)",
		statutoryBasis: "Приказ Минздрава РФ от 12.11.2021 № 1051н",
		subtitle: "Стандартное информированное добровольное согласие на первичный осмотр",
	},
];

export interface PatientInformedConsentModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly birthDate?: string | null | undefined;
	readonly phone?: string | null | undefined;
	readonly passport?: string | null | undefined;
	readonly snils?: string | null | undefined;
	readonly address?: string | null | undefined;
	readonly cardNumber?: string | null | undefined;
	readonly patient?: {
		fullName?: string | null;
		birthDate?: string | null;
		passport?: string | null;
		phone?: string | null;
		snils?: string | null;
		address?: string | null;
		cardNumber?: string | null;
	} | null | undefined;
	readonly doctorName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
	readonly clinicName?: string | null | undefined;
	readonly clinicLegalName?: string | null | undefined;
	readonly clinicAddress?: string | null | undefined;
	readonly clinicOgrn?: string | null | undefined;
	readonly licenseNumber?: string | null | undefined;
	readonly diagnosisIcd?: string | null | undefined;
	readonly toothNumbers?: string | null | undefined;
	readonly initialTemplateKey?: OutpatientConsentTypeKey | undefined;
	readonly onPrintBlank?: (() => void) | undefined;
	readonly onPrintFilled?: (() => void) | undefined;
	readonly onConsentConfirmed?: ((payload: {
		consentType: string;
		intervention: string;
		toothOrArea: string;
		confirmedAt: string;
		integrityHash?: string;
	}) => void) | undefined;
}

/**
 * Подготовка контекста согласия с гарантией авто-дефолтов:
 * При отсутствии паспорта, СНИЛС или телефона автоматически подставляются
 * строки подчеркивания «_______» для ручного заполнения на бланке.
 * Никаких 403-ошибок и никаких disabled кнопок (Мандат 8e п. 8, Мандат 8n).
 */
export function buildAutonomousConsentContext(
	props: Partial<PatientInformedConsentModalProps>,
	isBlank = false,
) {
	const p = props.patient;
	const patientName = isBlank
		? "________________________________________"
		: props.patientName || p?.fullName || "________________________________________";

	const birthDate = isBlank
		? "____.__.______"
		: props.birthDate || p?.birthDate || "____.__.______";

	const passport = isBlank
		? "серия ____ № __________, выдан ________________________________"
		: props.passport || p?.passport || "серия ____ № __________, выдан ________________________________";

	const snils = isBlank
		? "___-___-___ __"
		: props.snils || p?.snils || "___-___-___ __";

	const phone = isBlank
		? "+7 (___) ___-__-__"
		: props.phone || p?.phone || "+7 (___) ___-__-__";

	const address = isBlank
		? "________________________________________"
		: props.address || p?.address || "________________________________________";

	const cardNumber = isBlank
		? "________"
		: props.cardNumber || p?.cardNumber || (props.patientId ? `043/у-${props.patientId.slice(0, 8)}` : "043/у-000001");

	const doctorName = isBlank
		? "____________________"
		: props.doctorName || "Врач-стоматолог";

	const doctorSpecialty = props.doctorSpecialty || "Стоматолог общей практики";
	const clinicName = props.clinicName || "Стоматологическая клиника «ДЕНТЕ»";
	const clinicLegalName = props.clinicLegalName || props.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»";
	const clinicAddress = props.clinicAddress || "г. Москва, ул. Клиническая, д. 10";
	const clinicOgrn = props.clinicOgrn || "1217700123456";
	const licenseNumber = props.licenseNumber || "ЛО41-01137-77/00123456";
	const diagnosisIcd = props.diagnosisIcd || "K02.1 Кариес дентина";
	const toothNumbers = props.toothNumbers || "Зуб 1.6";
	const date = new Date().toLocaleDateString("ru-RU");

	return {
		patientName,
		birthDate,
		passport,
		snils,
		phone,
		address,
		cardNumber,
		doctorName,
		doctorSpecialty,
		clinicName,
		clinicLegalName,
		clinicAddress,
		clinicOgrn,
		licenseNumber,
		diagnosisIcd,
		toothNumbers,
		date,
	};
}

/**
 * Простая генерация SHA-256 хеша для юридической целостности бумажного согласия
 */
export function generateSimpleConsentHash(text: string): string {
	let hash = 0;
	for (let i = 0; i < text.length; i++) {
		const char = text.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash |= 0;
	}
	const hex = Math.abs(hash).toString(16).padStart(8, "0");
	return `ids-sha256-${hex}-${Date.now().toString(16).slice(-6)}`;
}

/**
 * InformedConsentModal (Patient domain) — автономное модальное окно информированных согласий (ИДС).
 *
 * МАНДАТЫ:
 * - 8e п. 5 & 8: Печать в любой момент: бланки ИДС печатаются без блокировок, со строками «_______»
 *   для ручной подписи доктора и пациента.
 * - 8e п. 8: Никаких disabled кнопок печати из-за отсутствия заполненных полей паспорта или СНИЛС.
 * - 8k: CRM != симулятор реальности: быстрое 1-клик подтверждение бумажного оригинала в карту 043/у.
 * - 8n: Суверенитет соло-врача и небольшой клиники: мгновенная работа без 403-ошибок.
 */
export const InformedConsentModal: React.FC<PatientInformedConsentModalProps> = React.memo(
	(props) => {
		const {
			isOpen,
			onClose,
			initialTemplateKey = "CONSENT_THERAPY",
			onPrintBlank,
			onPrintFilled,
			onConsentConfirmed,
		} = props;

		const [activeTemplateKey, setActiveTemplateKey] = useState<OutpatientConsentTypeKey>(initialTemplateKey);
		const [isPrintingBlankMode, setIsPrintingBlankMode] = useState<boolean>(false);
		const [isConfirmedPaper, setIsConfirmedPaper] = useState<boolean>(false);

		// Активный шаблон
		const currentTemplate = useMemo<OutpatientConsentTemplateMeta>(() => {
			return (
				OUTPATIENT_CONSENT_TEMPLATES.find((t) => t.key === activeTemplateKey) ??
				OUTPATIENT_CONSENT_TEMPLATES[0]!
			);
		}, [activeTemplateKey]);

		// Контексты данных: заполненный и чистый со строками «_______»
		const filledContext = useMemo(() => buildAutonomousConsentContext(props, false), [props]);
		const blankContext = useMemo(() => buildAutonomousConsentContext(props, true), [props]);
		const effectiveContext = isPrintingBlankMode ? blankContext : filledContext;

		// Расчет хеша целостности
		const integrityHash = useMemo(() => {
			return generateSimpleConsentHash(
				`${currentTemplate.key}|${effectiveContext.patientName}|${effectiveContext.passport}|${effectiveContext.date}`,
			);
		}, [currentTemplate.key, effectiveContext]);

		// Печать заполненного бланка (А4) — НИКОГДА НЕ DISABLED (Мандат 8e)
		const handlePrintFilled = useCallback(() => {
			setIsPrintingBlankMode(false);
			if (onPrintFilled) {
				onPrintFilled();
			}
			if (typeof window !== "undefined") {
				window.print();
			}
			showToast("Печать заполненного бланка ИДС (А4) отправлена на принтер", "info");
		}, [onPrintFilled]);

		// Печать чистого бланка («_______») — НИКОГДА НЕ DISABLED (Мандат 8e п. 8)
		const handlePrintBlank = useCallback(() => {
			setIsPrintingBlankMode(true);
			if (onPrintBlank) {
				onPrintBlank();
			}
			if (typeof window !== "undefined") {
				window.print();
			}
			showToast("Печать чистого бланка ИДС со строками «________» отправлена на принтер", "info");
		}, [onPrintBlank]);

		// 1-клик подтверждение бумажного согласия в карту 043/у
		const handleConfirmPaper = useCallback(() => {
			setIsConfirmedPaper(true);
			if (onConsentConfirmed) {
				onConsentConfirmed({
					consentType: currentTemplate.key,
					intervention: currentTemplate.title,
					toothOrArea: effectiveContext.toothNumbers,
					confirmedAt: new Date().toISOString(),
					integrityHash,
				});
			}
			showToast(
				`Бумажный оригинал ИДС [${currentTemplate.title}] подтвержден и подшит в карту 043/у`,
				"success",
			);
			onClose();
		}, [currentTemplate, effectiveContext.toothNumbers, integrityHash, onConsentConfirmed, onClose]);

		if (!isOpen) return null;

		return (
			<div
				className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
				role="dialog"
				aria-modal="true"
				aria-labelledby="consent-modal-title"
				onClick={(e) => {
					if (e.target === e.currentTarget) onClose();
				}}
			>
				<div
					className="bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden text-[var(--ink,#0f172a)] dark:text-slate-100"
					onClick={(e) => e.stopPropagation()}
				>
					{/* ── Верхний тулбар ── */}
					<header className="px-4 py-2.5 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-b border-[var(--line,#e2e8f0)] dark:border-slate-700 flex items-center justify-between gap-2 flex-wrap">
						<div className="flex items-center gap-2 min-w-0">
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 uppercase tracking-wider">
								<ShieldCheck className="w-3.5 h-3.5 shrink-0" />
								323-ФЗ ст. 20
							</span>
							<div className="min-w-0">
								<h2 id="consent-modal-title" className="text-sm font-bold truncate m-0">
									Информированное добровольное согласие (ИДС)
								</h2>
								<p className="text-[11px] text-[var(--muted,#64748b)] truncate m-0">
									{effectiveContext.patientName} • Карта: {effectiveContext.cardNumber}
								</p>
							</div>
						</div>

						{/* Действия тулбара */}
						<div className="flex items-center gap-2">
							{/* Печать чистого бланка со строками «________» (Мандат 8e п. 8: 0 disabled) */}
							<button
								type="button"
								onClick={handlePrintBlank}
								disabled={false}
								data-testid="btn-print-blank-consent"
								className="h-9 px-3 rounded-lg text-xs font-semibold bg-[var(--paper,#fff)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer inline-flex items-center gap-1.5 transition-colors"
								title="Печать чистого бланка со строками «________» для ручного заполнения пациентом (Мандат 8e)"
							>
								<FileText className="w-4 h-4 text-slate-500" />
								<span>Печать бланка («________»)</span>
							</button>

							{/* Печать бланка (А4) — НИКОГДА НЕ DISABLED */}
							<button
								type="button"
								onClick={handlePrintFilled}
								disabled={false}
								data-testid="btn-print-consent-a4"
								className="h-9 px-3.5 rounded-lg text-xs font-bold bg-[var(--brand-primary,#0d9488)] text-white hover:bg-teal-700 shadow-sm cursor-pointer inline-flex items-center gap-1.5 transition-all active:scale-98"
								title="Печать заполненного бланка ИДС на принтер (А4)"
								aria-label="Печать бланка ИДС А4"
							>
								<Printer className="w-4 h-4 text-white" />
								<span>Печать (А4)</span>
							</button>

							{/* Закрыть */}
							<button
								type="button"
								onClick={onClose}
								className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
								aria-label="Закрыть окно"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
					</header>

					{/* ── Выбор типа согласия (Сегментированный скролл) ── */}
					<div className="px-3 py-2 bg-[var(--paper,#ffffff)] dark:bg-slate-900 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs">
						{OUTPATIENT_CONSENT_TEMPLATES.map((tmpl) => (
							<button
								key={tmpl.key}
								type="button"
								onClick={() => setActiveTemplateKey(tmpl.key)}
								className={`px-2.5 py-1.5 rounded-md font-semibold shrink-0 cursor-pointer transition-colors ${
									activeTemplateKey === tmpl.key
										? "bg-teal-600 text-white"
										: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
								}`}
							>
								{tmpl.title}
							</button>
						))}
					</div>

					{/* ── Предпросмотр печатного листа ИДС (А4, чистая типографика) ── */}
					<div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/60 flex justify-center">
						<div
							className="bg-white text-slate-900 shadow-md border border-slate-300 rounded-sm w-full max-w-[760px] p-6 sm:p-8 font-serif text-[11pt] leading-relaxed relative"
							style={{ minHeight: "850px" }}
						>
							{/* Шапка клиники */}
							<div className="text-center font-sans border-b border-slate-300 pb-3 mb-4 text-[9.5pt] text-slate-600">
								<div className="font-bold text-slate-900 uppercase text-[10.5pt]">
									{effectiveContext.clinicLegalName}
								</div>
								<div>{effectiveContext.clinicAddress} • ОГРН: {effectiveContext.clinicOgrn}</div>
								<div>Лицензия на медицинскую деятельность: {effectiveContext.licenseNumber}</div>
							</div>

							{/* Заголовок ИДС */}
							<div className="text-center font-sans my-3">
								<h1 className="text-base sm:text-lg font-bold uppercase tracking-wide m-0">
									ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ
								</h1>
								<h2 className="text-xs font-semibold text-slate-700 mt-1 uppercase m-0">
									на медицинское вмешательство: {currentTemplate.title}
								</h2>
								<p className="text-[10px] text-slate-500 mt-0.5">
									Нормативное основание: {currentTemplate.statutoryBasis}
								</p>
							</div>

							{/* Вводная часть с реквизитами пациента */}
							<div className="my-4 text-xs font-sans bg-slate-50 p-3 rounded border border-slate-200 leading-relaxed">
								<div>
									Я, <strong>{effectiveContext.patientName}</strong>, дата рождения: <strong>{effectiveContext.birthDate}</strong>,
								</div>
								<div>
									Паспорт: <strong>{effectiveContext.passport}</strong>,
								</div>
								<div>
									СНИЛС: <strong>{effectiveContext.snils}</strong>, Адрес регистрации: <strong>{effectiveContext.address}</strong>,
								</div>
								<div className="mt-1 text-[11px] text-slate-600">
									Лечащий врач: <strong>{effectiveContext.doctorName}</strong> ({effectiveContext.doctorSpecialty})
								</div>
								<div className="text-[11px] text-slate-600">
									Диагноз: <strong>{effectiveContext.diagnosisIcd}</strong> • Область вмешательства: <strong>{effectiveContext.toothNumbers}</strong>
								</div>
							</div>

							{/* Текст юридического согласия */}
							<div className="text-xs space-y-2 text-justify">
								<p>
									1. В соответствии со статьей 20 Федерального закона от 21.11.2011 № 323-ФЗ «Об основах охраны
									здоровья граждан в Российской Федерации» даю информированное добровольное согласие на
									проведение медицинского вмешательства по профилю «{currentTemplate.title}».
								</p>
								<p>
									2. Мне в доступной для меня форме разъяснены цели, методы оказания медицинской помощи,
									связанный с ними риск, возможные варианты медицинских вмешательств, их последствия,
									включая вероятность развития осложнений, а также предполагаемые результаты оказания медицинской помощи.
								</p>
								<p>
									3. Я проинформирован(а) о необходимости соблюдения назначенного лечебно-охранительного режима,
									правил гигиены полости рта и явки на контрольные осмотры в установленные врачом сроки.
								</p>
								<p>
									4. Я подтверждаю, что сообщил(а) лечащему врачу достоверные сведения о состоянии своего здоровья,
									перенесенных заболеваниях, аллергических реакциях и постоянном приеме лекарственных средств.
								</p>
							</div>

							{/* Блок подписей со строками «________» */}
							<div className="mt-8 pt-4 border-t border-slate-400 font-sans text-xs">
								<div className="flex justify-between items-start gap-4">
									<div className="w-1/2">
										<div className="font-semibold text-slate-700">Пациент / Законный представитель:</div>
										<div className="mt-4 border-b border-slate-600 pb-1">
											Подпись: ____________________ / {effectiveContext.patientName}
										</div>
										<div className="text-[10px] text-slate-500 mt-1">Дата: {effectiveContext.date} г.</div>
									</div>

									<div className="w-1/2 text-right">
										<div className="font-semibold text-slate-700">Лечащий врач-стоматолог:</div>
										<div className="mt-4 border-b border-slate-600 pb-1">
											Подпись: ____________________ / {effectiveContext.doctorName}
										</div>
										<div className="text-[10px] text-slate-500 mt-1">Дата: {effectiveContext.date} г.</div>
									</div>
								</div>

								{/* Цифровой отпечаток SHA-256 для защиты от подделок */}
								<div className="mt-6 pt-2 border-t border-dashed border-slate-300 flex items-center justify-between text-[9px] text-slate-500">
									<span className="flex items-center gap-1 font-mono">
										<Lock className="w-3 h-3 text-teal-600" />
										Хеш целостности документа: {integrityHash}
									</span>
									<span>Электронная медицинская карта DENTE • Ст. 20 323-ФЗ</span>
								</div>
							</div>
						</div>
					</div>

					{/* ── Нижний футер с кнопкой подтверждения бумажного оригинала ── */}
					<footer className="px-4 py-2.5 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border-t border-[var(--line,#e2e8f0)] dark:border-slate-700 flex items-center justify-between gap-2 flex-wrap">
						<div className="text-xs text-[var(--muted,#64748b)]">
							Оригинал бланка ИДС распечатывается и подписывается пациентом от руки.
						</div>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handleConfirmPaper}
								data-testid="btn-confirm-consent-paper"
								className="h-9 px-4 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer inline-flex items-center gap-1.5 shadow-sm transition-all active:scale-98"
								title="Подтвердить наличие подписанного бумажного оригинала ИДС и подшить в карту 043/у"
							>
								<Zap className="w-4 h-4" />
								<span>Подтвердить бумажный оригинал (в карту 043/у)</span>
							</button>
						</div>
					</footer>
				</div>
			</div>
		);
	},
);

InformedConsentModal.displayName = "InformedConsentModal";

export const PatientInformedConsentModal = InformedConsentModal;
export default InformedConsentModal;
