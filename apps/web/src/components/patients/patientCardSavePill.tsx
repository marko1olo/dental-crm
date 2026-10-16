/**
 * ПЛАШКА СОСТОЯНИЯ СОХРАНЕНИЯ КАРТОЧКИ ПАЦИЕНТА.
 *
 * ЧТО БЫЛО СЛОМАНО — ДВЕ РАЗНЫЕ ВЕЩИ В ОДНОМ ЭЛЕМЕНТЕ.
 *
 * 1. «Сохранено» было ЗНАЧЕНИЕМ ПО УМОЛЧАНИЮ. В PatientsView.tsx стояла цепочка
 *    условий, у которой последняя ветка безусловная: не сохраняется, не
 *    сломалось, не изменено — значит «Сохранено». Ни выбранный пациент, ни факт
 *    хотя бы одного успешного сохранения в условие не входили. Свежая картотека
 *    без выбранного пациента и с пустым полем ФИО показывала зелёную плашку
 *    «Сохранено» — утверждение о факте, которого не было. Это тот же класс, что
 *    «Статус обновлен» при несохранённом статусе и «Успешно привязан к семье»
 *    без привязки: регистратор заполнил поля, отвлёкся, вернулся, увидел
 *    «Сохранено» и ушёл — введённое потерялось молча.
 *
 *    Здесь «Сохранено» появляется ТОЛЬКО когда состояние сохранения этого
 *    пациента действительно равно "saved" — а его выставляет один и тот же код в
 *    hooks/domains/usePatientLogic.ts после ответа сервера, и сбрасывает в "idle"
 *    при любой правке черновика и при смене пациента. Пока пациент не выбран,
 *    плашки нет вовсе: состояние сохранения к незаполненной карточке не
 *    относится, и молчание честнее любой надписи.
 *
 * 2. Плашка была взята из ЧУЖОГО СЛОВАРЯ. Класс `status-pill status-confirmed`
 *    принадлежит статусам ПРИЁМА (planned -> confirmed -> arrived ->
 *    in_treatment -> completed -> cancelled, styles/dente-redesign.css) и
 *    используется в 16 местах приложения. В светлой теме он даёт --info-bg
 *    (#e0f2fe) — это цвет «справочно», а не успеха (--ok-bg, #dcfce7); в ночной
 *    теме, которая в DENTE тёплая и включается в вечернюю смену, плашка
 *    оказывалась единственным нетёплым элементом экрана. Перекрашивать
 *    `status-confirmed` нельзя — это перекрасит статусы приёмов во всей клинике.
 *    Поэтому у состояния сохранения теперь свой словарь классов `save-pill-*`,
 *    объявленный на токенах темы рядом со словарём статусов приёма.
 *
 * Правило вынесено отдельным модулем, а не оставлено выражением в разметке,
 * ровно по той же причине, что и patientListFeatureSalience.ts рядом: выражение
 * в JSX нельзя прогнать, а безусловная ветка появилась именно в таком
 * выражении. Прогон — patientCardSavePill.test.tsx.
 */

import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle, CheckCircle2, Save } from "lucide-react";

/** Состояние сохранения одного блока карточки. Значения — из store/patientStore.ts. */
export type PatientSectionSaveState = "idle" | "saving" | "saved" | "error";

/**
 * Блок карточки, у которого есть своё сохранение: основные данные и реквизиты
 * документов. `validationMessage` — отказ ДО запроса (например незакрытая пара
 * «удобно приходить с/до»): сохранить нельзя, и это ошибка, а не «нет изменений».
 */
export type PatientSaveSection = {
	readonly dirty: boolean;
	readonly saveState: PatientSectionSaveState;
	readonly validationMessage?: string | null;
};

export type PatientCardSavePillTone = "saving" | "error" | "dirty" | "saved";

export type PatientCardSavePillDescriptor = {
	readonly className: string;
	readonly label: string;
	readonly title: string;
	readonly tone: PatientCardSavePillTone;
};

export type PatientCardSavePillInput = {
	readonly hasSelectedPatient: boolean;
	readonly sections: readonly PatientSaveSection[];
};

/**
 * Что показывать. `null` означает «сказать нечего» — и это полноценный исход, а
 * не пропуск: карточка без выбранного пациента и карточка, которую в этот раз ещё
 * не сохраняли, про сохранение не сообщают ничего.
 *
 * ПОРЯДОК ВЕТОК: ошибка ИДЁТ ПЕРЕД «сохраняю». Незакрытая ошибка — это факт, что
 * часть введённого на сервер не попала; «сохраняю» разрешится через мгновение и
 * тогда покажет то, что осталось. Спрятать потерю данных за временной надписью о
 * ходе работы — ровно та ошибка, из-за которой и переписан этот элемент.
 * Достижимо это так: сохранение реквизитов упало, регистратор правит основные
 * данные и жмёт «Сохранить данные» — правка основных данных сбрасывает в "idle"
 * только своё состояние, ошибка реквизитов остаётся.
 */
export function patientCardSavePill(
	input: PatientCardSavePillInput,
): PatientCardSavePillDescriptor | null {
	if (!input.hasSelectedPatient) return null;

	const failed = input.sections.some(
		(section) =>
			section.saveState === "error" ||
			(section.validationMessage !== undefined &&
				section.validationMessage !== null &&
				section.validationMessage.length > 0),
	);
	if (failed) {
		return {
			className: "save-pill save-pill-error",
			label: "Ошибка",
			title:
				"Сервер не принял данные пациента. Введённое осталось в полях — исправьте и сохраните снова.",
			tone: "error",
		};
	}

	if (input.sections.some((section) => section.saveState === "saving")) {
		return {
			className: "save-pill save-pill-saving",
			label: "Сохраняю...",
			title: "Данные пациента отправлены на сервер, ответ ещё не получен.",
			tone: "saving",
		};
	}

	if (input.sections.some((section) => section.dirty)) {
		return {
			className: "save-pill save-pill-dirty",
			label: "Не сохранено",
			title:
				"Изменения ещё не отправлены на сервер. Нажмите кнопку сохранения ниже.",
			tone: "dirty",
		};
	}

	if (input.sections.some((section) => section.saveState === "saved")) {
		return {
			className: "save-pill save-pill-saved",
			label: "Сохранено",
			title: "Изменения этой карточки записаны на сервер.",
			tone: "saved",
		};
	}

	return null;
}

/**
 * Разметка плашки. Отдельным компонентом, потому что таких плашек на экране
 * картотеки две — у заголовка карточки и у блока паспортных данных, — и вторая
 * копия того же выражения разошлась бы с первой при первой же правке: именно так
 * в этом файле и появились рядом честная ветка "saved" у реквизитов и безусловное
 * «Сохранено» у основных данных.
 */
export function PatientCardSavePill(input: PatientCardSavePillInput) {
	const pill = patientCardSavePill(input);
	if (!pill) return null;
	return (
		<span
			className={pill.className}
			data-save-tone={pill.tone}
			title={pill.title}
		>
			{pill.label}
		</span>
	);
}

export interface PatientCardFloatingSaveBarProps {
	readonly isDirty: boolean;
	readonly saveState: PatientSectionSaveState;
	readonly onSave: () => void | Promise<void>;
	readonly errorMessage?: string | null | undefined;
	readonly className?: string | undefined;
}

/**
 * Floating Bottom Bar сохранения карточки пациента (Apple macOS / Linear Desktop HIG).
 * Автоматически всплывает в нижней трети экрана при наличии несохраненных правок,
 * показывает debounced индикацию «Все изменения сохранены» и единую Primary CTA кнопку.
 */
export const PatientCardFloatingSaveBar: React.FC<PatientCardFloatingSaveBarProps> = ({
	isDirty,
	saveState,
	onSave,
	errorMessage,
	className = "",
}) => {
	const [showSavedFeedback, setShowSavedFeedback] = useState(false);

	useEffect(() => {
		if (saveState === "saved") {
			setShowSavedFeedback(true);
			const timer = setTimeout(() => {
				setShowSavedFeedback(false);
			}, 3500);
			return () => clearTimeout(timer);
		}
	}, [saveState]);

	// Показываем плашку если есть черновик, процесс сохранения, ошибка или свежее подтверждение сохранения
	const isVisible = isDirty || saveState === "saving" || saveState === "error" || showSavedFeedback;

	if (!isVisible) return null;

	return (
		<div
			className={`patient-floating-save-bar fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[calc(100%-32px)] sm:w-auto min-w-[320px] px-4 py-2.5 rounded-2xl bg-[var(--paper-strong)]/95 backdrop-blur-md border border-[var(--line-strong)] shadow-2xl flex items-center justify-between gap-4 select-none animate-in fade-in slide-in-from-bottom-2 duration-150 ${className}`}
			data-testid="patient-card-floating-save-bar"
			role="status"
			aria-live="polite"
		>
			<div className="flex items-center gap-2 text-xs min-w-0">
				{saveState === "saving" ? (
					<>
						<Loader2 className="w-4 h-4 animate-spin text-[var(--teal)] shrink-0" />
						<span className="text-[var(--ink)] font-medium truncate">Сохранение изменений...</span>
					</>
				) : saveState === "error" ? (
					<>
						<AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
						<span className="text-rose-600 dark:text-rose-400 font-semibold truncate">
							{errorMessage || "Ошибка сохранения"}
						</span>
					</>
				) : isDirty ? (
					<>
						<span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
						<span className="text-[var(--ink)] font-semibold truncate">Есть несохранённые изменения</span>
					</>
				) : (
					<>
						<CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
						<span className="text-emerald-700 dark:text-emerald-400 font-semibold truncate">Все изменения сохранены</span>
					</>
				)}
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<button
					type="button"
					onClick={onSave}
					disabled={saveState === "saving" || (!isDirty && saveState !== "error")}
					className="primary-button min-h-[36px] h-9 px-4 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all bg-[var(--teal,var(--brand-primary))] text-white hover:opacity-95 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
					data-testid="patient-card-save-floating-btn"
				>
					<Save size={14} className="shrink-0" />
					<span>Сохранить изменения</span>
				</button>
			</div>
		</div>
	);
};

export const PatientFloatingSaveBar = PatientCardFloatingSaveBar;
