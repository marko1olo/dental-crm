import {
	type VisitFlowResult,
	type VisitFlowStepResult,
	type VisitFlowStepStatus,
	visitFlowStepStatusSchema,
} from "@dental/shared";
import type React from "react";
import "./VisitFlowProgress.css";

/*
 * ЗДЕСЬ СТОЯЛО `type VisitFlowResult = any;` — САМОДЕЛЬНЫЙ ТИП ВМЕСТО КОНТРАКТА.
 *
 * Пока `visitFlowStepResultSchema.data` был `z.unknown()`, читать поля разбора
 * было нечем: панель приводила каждый шаг руками (`as any`, `as string[]`), и
 * компилятор не мог сказать ни одного слова о том, что сервер отдаёт. Опечатка в
 * имени поля давала `undefined`, блок молча исчезал из панели, и врач не узнавал,
 * что разбор что-то сообщил. Теперь тип берётся из контракта, а приведений нет ни
 * одного.
 */
export const VisitFlowProgress: React.FC<{ result: VisitFlowResult | null | undefined }> = ({
	result,
}) => {
	const getStatusColor = (status: string) => {
		switch (status) {
			case "success":
				return "var(--color-green-500, #10b981)";
			case "running":
				return "var(--color-blue-500, #3b82f6)";
			case "error":
				return "var(--color-red-500, #ef4444)";
			case "skipped":
				return "var(--color-amber-500, #f59e0b)";
			default:
				return "var(--color-slate-400, #94a3b8)";
		}
	};

	/*
	 * ОТВЕТ СЕРВЕРА ЧИТАЕТСЯ ЗАЩИЩЁННО, ПОТОМУ ЧТО ОН НЕ ПРОВЕРЯЕТСЯ СХЕМОЙ.
	 *
	 * Было: result.draft.status, result.plan.status и так далее — прямое чтение
	 * четырёх вложенных объектов. Ответ /api/ai/visit-flow к типу только
	 * ОБЪЯВЛЕН, разбором схемы он не проходит (почему — сказано у
	 * `visitFlowStepResultSchema`: план из запасной ветки не прошёл бы `.min(1)`),
	 * то есть любой неполный ответ (упал один шаг, вернулся объект ошибки,
	 * вернулся 200 с пустым телом) роняет рендер этой панели, а вместе с ней —
	 * раздел «Прием» целиком, потому что перехватчик показывает падение как
	 * «Раздел временно не открылся». Врач в этот момент уже продиктовал приём.
	 *
	 * Поэтому статус шага проверяется схемой ОДНОГО поля, а не приведением: пришло
	 * не то слово или не строка — показываем «ожидает», а не роняем панель.
	 */
	const stepStatus = (step: VisitFlowStepResult | null | undefined): VisitFlowStepStatus => {
		const parsed = visitFlowStepStatusSchema.safeParse(step?.status);
		return parsed.success ? parsed.data : "pending";
	};
	const stepMessage = (step: VisitFlowStepResult | null | undefined): string | null => {
		const message = step?.message;
		return typeof message === "string" && message.trim() ? message : null;
	};

	/*
	 * ПРИЧИНА ОТКАЗА ШАГА ДОХОДИТ ДО ВРАЧА СЛОВАМИ, А НЕ ЦВЕТОМ ТОЧКИ.
	 *
	 * БЫЛО: у трёх шагов из четырёх стояло `msg: null` жёстко, хотя сервер
	 * заполняет `message` у каждого (apps/api/src/ai/visitFlowOrchestrator.ts:
	 * «Отключено в настройках клиники», «Нет данных для плана лечения»,
	 * «Ошибка персонализации плана», «Ошибка подбора документов» и остальные —
	 * уже по-русски и готовые к показу). Схема их тоже описывает:
	 * visitFlowStepResultSchema в packages/shared несёт status и message.
	 * Всё это выбрасывалось на клиенте.
	 *
	 * Что видел врач: он нажал «Собрать нейро-черновик», шаг «План лечения»
	 * получил янтарную точку без единого знака и без подписи — ни галочки, ни
	 * крестика, потому что отметка рисовалась только для running и success.
	 * «Пропущено, потому что выключено в настройках» выглядело так же, как
	 * «ещё считается»: врач ждал результата, которого не будет, и не знал, что
	 * дальше делать руками. Отказ шага выглядел ровно так же.
	 */
	const steps = [
		{
			label: "Распознавание",
			key: "draft",
			status: stepStatus(result?.draft),
			msg: stepMessage(result?.draft),
		},
		{ label: "План лечения", key: "plan", status: stepStatus(result?.plan), msg: stepMessage(result?.plan) },
		{
			label: "Рекомендации",
			key: "recommendations",
			status: stepStatus(result?.recommendations),
			msg: stepMessage(result?.recommendations),
		},
		{ label: "Документы", key: "documents", status: stepStatus(result?.documents), msg: stepMessage(result?.documents) },
	];

	/** Состояние шага по-русски: у точки нет подписи, а у строки отказа она нужна. */
	const stepStatusWord = (status: string): string => {
		switch (status) {
			case "success":
				return "готово";
			case "running":
				return "идет";
			case "error":
				return "не выполнено";
			case "skipped":
				return "пропущено";
			default:
				return "ожидает";
		}
	};

	// Сервер заполняет message только у пропущенных и отказавших шагов, но
	// фильтруем по наличию текста, а не по статусу: тогда ни одно слово сервера
	// не потеряется, даже если он начнёт объяснять и удачные шаги.
	const stepNotes = steps.filter((step) => step.msg);

	if (!result) return null;

	const planData = result.plan?.data ?? null;
	const recommendationsData = result.recommendations?.data ?? null;
	const documentsData = result.documents?.data ?? null;
	// Array.isArray остаётся: тип обещает массив, а ответ схемой не проверен.
	const temporaryRestrictions = Array.isArray(recommendationsData?.temporaryRestrictions)
		? recommendationsData.temporaryRestrictions
		: [];
	const documentSuggestions = Array.isArray(documentsData?.suggestions)
		? documentsData.suggestions
		: [];

	return (
		<div className="visit-flow-progress" data-testid="visit-flow-progress">
			<div className="vfp-header">
				<h4 className="vfp-title">
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M13 10V3L4 14h7v7l9-11h-7z"
						/>
					</svg>
					Ассистент обработки приема
				</h4>
				{/*
					Было: любое значение, кроме success и partial, подписывалось «Ошибка»
					— в том числе отсутствие значения. Пока разбор идёт, врач видел
					слово «Ошибка» и бросался переделывать то, что не сломалось.
				*/}
				<span className={`vfp-badge status-${result.overallStatus ?? "pending"}`}>
					{result.overallStatus === "success"
						? "Готово"
						: result.overallStatus === "partial"
							? "Частично"
							: result.overallStatus === "error"
								? "Ошибка"
								: "Идет разбор"}
				</span>
			</div>

			<div className="vfp-steps">
				{steps.map((step, idx) => (
					<div key={step.key} className="vfp-step">
						<span
							className={`vfp-dot pulse-${step.status}`}
							style={{ background: getStatusColor(step.status) }}
						/>
						<span className="vfp-step-label">
							{idx + 1}. {step.label}
						</span>
						{step.status === "running" && (
							<span className="vfp-step-status">⏳</span>
						)}
						{step.status === "success" && (
							<span className="vfp-step-status">✓</span>
						)}
						{step.status === "error" && (
							<span className="vfp-step-status" title="Шаг не выполнен">✕</span>
						)}
						{step.status === "skipped" && (
							<span className="vfp-step-status" title="Шаг пропущен">—</span>
						)}
					</div>
				))}
			</div>

			{/*
				Причина стоит отдельной строкой, а не в скобках у шага: у подписи
				было `truncate max-w-[100px]`, и «Отключено в настройках клиники»
				обрезалось до неразличимого серого намёка в две трети слова.
			*/}
			{stepNotes.length > 0 && (
				<div className="vfp-step-notes" role="status" aria-live="polite">
					<strong>Что сообщил разбор</strong>
					<ul>
						{stepNotes.map((step) => (
							<li key={`note-${step.key}`}>
								{step.label} — {stepStatusWord(step.status)}: {step.msg}
							</li>
						))}
					</ul>
					<p>
						Разбор — помощник, записи приёма он не заменяет: продиктованный текст и
						поля ЭМК остались на месте. Шаг, выключенный в настройках, включают в
						настройках клиники; если шаг отказал — нажмите «Собрать нейро-черновик»
						ещё раз или заполните поля руками.
					</p>
				</div>
			)}

			<div className="vfp-outputs">
				{planData?.diagnosisSummary && (
					<div className="vfp-output-card">
						<strong>Диагноз (пациенту):</strong>
						<p>{planData.diagnosisSummary}</p>
					</div>
				)}
				{recommendationsData?.procedureName && (
					<div className="vfp-output-card">
						<strong>
							Рекомендации после: {recommendationsData.procedureName}
						</strong>
						{temporaryRestrictions.length > 0 && (
								<ul style={{ margin: "0.5rem 0", paddingLeft: "1.2rem" }}>
									{temporaryRestrictions.map(
										(r, i) => (
											<li key={i}>{r}</li>
										),
									)}
								</ul>
							)}
					</div>
				)}
				{documentSuggestions.length > 0 && (
						<div className="vfp-output-card">
							<strong>Предложенные документы:</strong>
							<div className="vfp-tags">
								{documentSuggestions.map(
									(s: string, i: number) => (
										<span key={i} className="vfp-tag">
											{s}
										</span>
									),
								)}
							</div>
						</div>
					)}
			</div>
		</div>
	);
};
