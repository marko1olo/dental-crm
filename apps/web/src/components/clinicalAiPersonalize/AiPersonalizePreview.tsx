import React, { useMemo, useState } from "react";
import type {
	DoctorVoiceSettings,
	PersonalizedPlanResult,
	PostVisitPersonalizedResult,
} from "./types";

export interface AiPersonalizePreviewProps {
	doctorVoice: DoctorVoiceSettings;
	planResult: PersonalizedPlanResult | null;
	postResult: PostVisitPersonalizedResult | null;
	copied: string | null;
	onCopy: (label: string, text: string) => void;
}

function ListBlock({
	title,
	items,
}: {
	title: string;
	items: string[] | undefined;
}) {
	if (!items || items.length === 0) return null;
	return (
		<div className="ops-block" style={{ marginTop: "0.75rem" }}>
			<strong style={{ color: "var(--ink, #0f172a)" }}>{title}</strong>
			<ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.2rem" }}>
				{(items ?? []).map((item) => (
					<li key={item} style={{ color: "var(--ink-secondary, #334155)" }}>
						{item}
					</li>
				))}
			</ul>
		</div>
	);
}

function MarkdownishText({ text }: { text: string }) {
	const parts = (text ?? "").split(/(\*\*[^*]+\*\*)/g);
	return (
		<div style={{ whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
			{(parts ?? []).map((part) => {
				if (part?.startsWith("**") && part?.endsWith("**") && part.length > 4) {
					return <strong key={`bold-${part}`}>{part.slice(2, -2)}</strong>;
				}
				return <span key={`text-${part}`}>{part}</span>;
			})}
		</div>
	);
}

export const AiPersonalizePreview: React.FC<AiPersonalizePreviewProps> = ({
	doctorVoice,
	planResult,
	postResult,
	copied,
	onCopy,
}) => {
	const [previewTab, setPreviewTab] = useState<"case" | "plan" | "post">("case");

	// Генерация текста тестового клинического протокола под выбранные настройки стиля
	const sampleClinicalText = useMemo(() => {
		const { conciseness, xrayDetail, mkb10Mode } = doctorVoice;
		const mkbNote =
			mkb10Mode === "auto_insert"
				? "Диагноз по МКБ-10: К02.1 Кариес дентина (авто-подстановка)."
				: mkb10Mode === "require_confirm"
					? "Диагноз: К02.1 Кариес дентина [Подтверждено врачом]."
					: "Диагноз: Кариес дентина (подсказка МКБ: К02.1).";

		const xrayNote =
			xrayDetail === "expert"
				? "Прицельная визиография 2.6: рентгенопрозрачный очаг деструкции дентина окклюзионно, глубина 2.8 мм до свода пульпарной камеры. Кортикальная пластинка альвеолы интактна, периодонтальная щель равномерная, плотность кости губчатого вещества без деструкции."
				: xrayDetail === "detailed"
					? "Прицельный снимок 2.6: кариозный дефект в пределах околопульпарного дентина жевательной поверхности, корни сформированы, периодонт без расширения."
					: "Рентген 2.6: дефект коронковой части зуба, верхушки корней спокойны.";

		if (conciseness === "concise") {
			return `Зуб 2.6. ${mkbNote}\nЖалобы: кратковременная боль от холодного/сладкого.\nОбъективно: полость на жевательной поверхности 2.6, дно плотное, зондирование по эмалево-дентинной границе чувствительно, ЭОД 6 мкА.\n${xrayNote}\nПротокол: анестезия Septanest 1.7 мл, препарирование, OptiBond, световая пломба Filtek, шлифовка, окклюзия проверена. Итог: норма.`;
		}

		if (conciseness === "detailed") {
			return `Зуб 2.6. ${mkbNote}
Жалобы пациента: возникновение резких болевых ощущений от термических и химических раздражителей (холодная вода, сладкая пища), быстро купирующихся после устранения агента.
Анамнез заболевания: дефект замечен пациентом около 2 месяцев назад, за медицинской помощью не обращался.
Аллергологический анамнез: не отягощен, аллергии на местные анестетики отрицает.
Объективный статус: при осмотре жевательной поверхности зуба 2.6 визуализируется глубокая кариозная деструкция I класса по Блэку. Дно и стенки полости выполнены пигментированным дентином плотной консистенции. Зондирование слабо болезненно по эмалево-дентинному соединению. Сообщение с пульпарной камерой отсутствует.
Термопроба: реакция на холод болезненна, длительностью до 4 секунд, быстро проходит.
Электроодонтометрия (ЭОД): 6 мкА (пульпа жизнеспособна).
Перкуссия: горизонтальная и вертикальная безболезненны. Слизистая оболочка переходной складки бледно-розовая, без отека.
${xrayNote}
Клинический протокол вмешательства:
1. Инфильтрационная анестезия sol. Septanest 1:100 000 — 1.7 мл в проекции верхушек корней 2.6. Обезболивание глубокое.
2. Изоляция операционного поля коффердамом (кламп W8A).
3. Некрэктомия твердых тканей алмазными и твердосплавными борами с водяным охлаждением.
4. Медикаментозная антисептическая обработка полости sol. Chlorhexidini 2%.
5. Наложение лечебной/изолирующей прокладки светового отверждения на околопульпарную зону.
6. Тотальное протравливание эмали 37% ортофосфорной кислотой (15 сек), нанесение адгезивной системы V поколения.
7. Послойная анатомическая реставрация наногибридным композитом Filtek Ultimate (оттенки A3, A2) с полимеризацией по 20 сек слой.
8. Финишная обработка: шлифовка алмазными финирами, полировка дисками Sof-Lex и пастой Prisma Gloss.
9. Контроль окклюзионных контактов копиркой 12 мкм в статике и динамике. Форма и функция зуба полностью восстановлены.`;
		}

		// standard
		return `Зуб 2.6. ${mkbNote}
Жалобы: кратковременные боли от термических и сладких раздражителей, купирующиеся сразу после их устранения.
Объективно: глубокая кариозная полость на окклюзионной поверхности зуба 2.6 в пределах околопульпарного дентина. Зондирование чувствительно по эмалево-дентинной границе, дно плотное. Перкуссия безболезненна. Реакция на холод кратковременная. ЭОД: 6 мкА.
${xrayNote}
Лечение по стандарту СтАР:
• Местная анестезия Septanest 1.7 мл;
• Препарирование кариозной полости, изоляция коффердамом;
• Антисептическая обработка 2% хлоргексидином;
• Изолирующая прокладка, адгезивный протокол;
• Послойное пломбирование светоотверждаемым композитом;
• Шлифовка, полировка, коррекция по прикусу. Анатомическая форма восстановлена.`;
	}, [doctorVoice]);

	return (
		<div
			className="ops-block"
			data-testid="ai-personalize-preview"
			style={{
				marginTop: "0.75rem",
				border: "1px solid var(--line, #e2e8f0)",
				borderRadius: "8px",
				padding: "1rem",
				background: "var(--paper-card, var(--paper, #ffffff))",
			}}
		>
			{/* Переключатель вкладок предпросмотра */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "0.75rem",
					flexWrap: "wrap",
					gap: "0.5rem",
				}}
			>
				<div style={{ display: "flex", gap: "0.35rem" }}>
					<button
						type="button"
						className={`secondary-button ${previewTab === "case" ? "active" : ""}`}
						onClick={() => setPreviewTab("case")}
						style={{
							fontSize: "0.8rem",
							padding: "0.3rem 0.65rem",
							borderRadius: "6px",
							background:
								previewTab === "case"
									? "var(--teal-soft, rgba(13, 148, 136, 0.15))"
									: undefined,
							borderColor:
								previewTab === "case" ? "var(--teal, #0d9488)" : undefined,
							color:
								previewTab === "case" ? "var(--teal, #0d9488)" : undefined,
							fontWeight: previewTab === "case" ? 600 : 400,
						}}
					>
						Тестовый клинический случай
					</button>

					{planResult ? (
						<button
							type="button"
							className={`secondary-button ${previewTab === "plan" ? "active" : ""}`}
							onClick={() => setPreviewTab("plan")}
							style={{
								fontSize: "0.8rem",
								padding: "0.3rem 0.65rem",
								borderRadius: "6px",
								background:
									previewTab === "plan"
										? "var(--teal-soft, rgba(13, 148, 136, 0.15))"
										: undefined,
								borderColor:
									previewTab === "plan" ? "var(--teal, #0d9488)" : undefined,
								color:
									previewTab === "plan" ? "var(--teal, #0d9488)" : undefined,
								fontWeight: previewTab === "plan" ? 600 : 400,
							}}
						>
							Объяснение плана (готово)
						</button>
					) : null}

					{postResult ? (
						<button
							type="button"
							className={`secondary-button ${previewTab === "post" ? "active" : ""}`}
							onClick={() => setPreviewTab("post")}
							style={{
								fontSize: "0.8rem",
								padding: "0.3rem 0.65rem",
								borderRadius: "6px",
								background:
									previewTab === "post"
										? "var(--teal-soft, rgba(13, 148, 136, 0.15))"
										: undefined,
								borderColor:
									previewTab === "post" ? "var(--teal, #0d9488)" : undefined,
								color:
									previewTab === "post" ? "var(--teal, #0d9488)" : undefined,
								fontWeight: previewTab === "post" ? 600 : 400,
							}}
						>
							Памятка пациенту (готово)
						</button>
					) : null}
				</div>

				<span
					className="status-pill status-planned"
					style={{ fontSize: "0.75rem" }}
				>
					Интерактивный предпросмотр
				</span>
			</div>

			{/* 1. Тестовый клинический случай */}
			{previewTab === "case" ? (
				<div
					style={{
						background: "var(--paper-soft, #f8fafc)",
						borderRadius: "8px",
						padding: "0.85rem",
						border: "1px dashed var(--line, #cbd5e1)",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "0.5rem",
						}}
					>
						<span
							style={{
								fontSize: "0.8rem",
								fontWeight: 600,
								color: "var(--muted, #64748b)",
							}}
						>
							Синтез протокола по выбранному стилю врача:
						</span>
						<button
							type="button"
							className="secondary-button"
							style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
							onClick={() => onCopy("preview_case", sampleClinicalText)}
						>
							{copied === "preview_case" ? "Скопировано" : "Копировать"}
						</button>
					</div>
					<div
						style={{
							fontSize: "0.85rem",
							whiteSpace: "pre-wrap",
							lineHeight: 1.5,
							color: "var(--ink, #0f172a)",
						}}
					>
						{sampleClinicalText}
					</div>
				</div>
			) : null}

			{/* 2. Реальный результат объяснения плана (data-testid="ai-plan-result") */}
			{previewTab === "plan" && planResult ? (
				<div
					className="ops-block"
					style={{ marginTop: "0.5rem" }}
					data-testid="ai-plan-result"
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							gap: "0.5rem",
							flexWrap: "wrap",
						}}
					>
						<strong style={{ color: "var(--ink, #0f172a)" }}>
							Объяснение плана лечения
						</strong>
						<button
							type="button"
							className="secondary-button"
							onClick={() =>
								onCopy(
									"plan",
									`${planResult.patientFriendlyExplanation}\n\n---\n\n${planResult.patientHygieneAdvice}`,
								)
							}
						>
							{copied === "plan" ? "Скопировано" : "Копировать всё"}
						</button>
					</div>
					<div
						style={{
							marginTop: "0.5rem",
							color: "var(--ink, #0f172a)",
						}}
					>
						<MarkdownishText text={planResult.patientFriendlyExplanation} />
					</div>
					<div style={{ marginTop: "0.85rem" }}>
						<strong style={{ color: "var(--ink, #0f172a)" }}>
							Гигиена дома
						</strong>
						<div
							style={{
								marginTop: "0.35rem",
								color: "var(--ink-secondary, #334155)",
							}}
						>
							<MarkdownishText text={planResult.patientHygieneAdvice} />
						</div>
					</div>
				</div>
			) : null}

			{/* 3. Реальный результат памятки после приёма (data-testid="ai-post-result") */}
			{previewTab === "post" && postResult ? (
				<div
					className="ops-block"
					style={{ marginTop: "0.5rem" }}
					data-testid="ai-post-result"
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							gap: "0.5rem",
							flexWrap: "wrap",
						}}
					>
						<strong style={{ color: "var(--ink, #0f172a)" }}>
							Памятка после приёма
						</strong>
						<button
							type="button"
							className="secondary-button"
							onClick={() => onCopy("post", postResult.telegramSummary)}
						>
							{copied === "post" ? "Скопировано" : "Копировать для мессенджера"}
						</button>
					</div>
					{postResult.telegramSummary ? (
						<p
							className="ops-hint"
							style={{ marginTop: "0.5rem", color: "var(--ink, #0f172a)" }}
						>
							{postResult.telegramSummary}
						</p>
					) : null}
					<ListBlock
						title="Можно после процедуры"
						items={postResult.allowedAfter}
					/>
					<ListBlock
						title="Временные ограничения"
						items={postResult.temporaryRestrictions}
					/>
					<ListBlock
						title="Лекарства и полоскания"
						items={postResult.medicationAndRinsePlan}
					/>
					<ListBlock
						title="Гигиена"
						items={postResult.hygieneInstructions}
					/>
					<ListBlock
						title="Питание"
						items={postResult.nutritionInstructions}
					/>
					<ListBlock
						title="Срочно к врачу, если"
						items={postResult.urgentWarningSigns}
					/>
				</div>
			) : null}
		</div>
	);
};
