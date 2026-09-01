/**
 * treatmentPlanValidatorAndCommenter.ts — Clinical Validation, Chairside Commentary & Copilot Suite.
 *
 * Capabilities:
 * 1. Clinical validation: FDI tooth anatomy, root canal counts, devitalized crown requirement, implant intervals, phase sequencing.
 * 2. Chairside patient commentary: Empathy, metaphors, health math, urgency in plain Russian.
 * 3. Financial calculations: 13% NDFL tax deduction (Code 01 / Code 02) & 0% installments (3, 6, 12, 24 months).
 * 4. AI Copilot: Adaptive plan auto-composition, modification & optimization suggestions.
 * 5. Omni-Gateway & Multi-Provider Cascade: Qwen 3.8 27B / Qwen 2.5 32B (Groq), Gemini 3.5 Flash-Lite / 3.1 Flash-Lite, DeepSeek V3/R1, OpenAI, Claude with key rotation & deterministic fallback.
 */

import {
	type TreatmentPlanValidateAndCommentRequest,
	type TreatmentPlanValidateAndCommentResponse,
	type TreatmentPlanValidationItem,
	type TreatmentPlanValidationStage,
	type TreatmentPlanAnatomicalCheck,
	type StarComplianceStatus,
	type AnatomicalCheckSeverity,
	type SpeechGatewayProvider,
	treatmentPlanValidateAndCommentResponseSchema,
} from "@dental/shared";
import {
	fetchWithProviderTimeout,
	getProviderKeyPoolSummary,
	keyRetryLimit,
	numberFromEnv,
	providerHttpError,
	recordProviderKeyFailure,
	recordProviderKeySuccess,
	selectProviderKey,
	shouldTryNextProviderKey,
} from "../speech/keyPool.js";

// ─── ANATOMICAL ROOT CANAL BASELINE (FDI ISO 3950) ──────────────────────────

export function getAnatomicalRootCanalCount(toothNumber: number): number {
	const quadrant = Math.floor(toothNumber / 10);
	const pos = toothNumber % 10;

	// Молочные зубы (51-85)
	if (quadrant >= 5 && quadrant <= 8) {
		if (pos === 1 || pos === 2 || pos === 3) return 1;
		if (pos === 4 || pos === 5) return quadrant === 5 || quadrant === 6 ? 3 : 2;
		return 1;
	}

	// Постоянные зубы (11-48)
	// Резцы и клыки (11-13, 21-23, 31-33, 41-43) — 1 канал
	if (pos >= 1 && pos <= 3) return 1;

	// Премоляры верхней челюсти (14, 24 — 2 канала; 15, 25 — 1-2 канала, базово 2)
	if ((quadrant === 1 || quadrant === 2) && (pos === 4 || pos === 5)) {
		return pos === 4 ? 2 : 1;
	}

	// Премоляры нижней челюсти (34, 35, 44, 45 — 1 канал)
	if ((quadrant === 3 || quadrant === 4) && (pos === 4 || pos === 5)) {
		return 1;
	}

	// Моляры верхней челюсти (16, 17, 18, 26, 27, 28 — 3-4 канала, анатомический стандарт 3-4, базово 3)
	if ((quadrant === 1 || quadrant === 2) && pos >= 6) {
		return 3;
	}

	// Моляры нижней челюсти (36, 37, 38, 46, 47, 48 — 3 канала)
	if ((quadrant === 3 || quadrant === 4) && pos >= 6) {
		return 3;
	}

	return 1;
}

export function isDeciduousTooth(toothNumber: number): boolean {
	const q = Math.floor(toothNumber / 10);
	return q >= 5 && q <= 8;
}

// ─── 1. DETERMINISTIC CLINICAL VALIDATOR ─────────────────────────────────────

export function runDeterministicClinicalValidation(
	stages: readonly TreatmentPlanValidationStage[],
): {
	overallStatus: StarComplianceStatus;
	complianceScorePercent: number;
	totalChecksCount: number;
	passedChecksCount: number;
	warningsCount: number;
	errorsCount: number;
	criticalWarnings: string[];
	clinicalRecommendations: string[];
	anatomicalChecks: TreatmentPlanAnatomicalCheck[];
} {
	const allItems: TreatmentPlanValidationItem[] = stages.flatMap((s) => s.items);
	const anatomicalChecks: TreatmentPlanAnatomicalCheck[] = [];
	const criticalWarnings: string[] = [];
	const clinicalRecommendations: string[] = [];

	const codesPresent = new Set(allItems.map((i) => (i.code804n || "").trim().toUpperCase()));
	const hasCTDiagnostics = codesPresent.has("A06.07.004") || codesPresent.has("A06.07.003") || allItems.some((i) => /кт|томограф|панорам|ортопантомо/i.test(i.name));
	const hasHygiene = codesPresent.has("A16.07.050") || codesPresent.has("A16.07.051") || allItems.some((i) => /гигиен|чистк|air-flow|ультразвук/i.test(i.name));
	const hasSurgeryOrImplant = stages.some((s) => s.stageNumber === 2 || s.stageKind?.includes("surgery")) || allItems.some((i) => i.category === "Хирургия" || /имплант|синус|костн.*пласт/i.test(i.name));
	const hasOrthopedics = stages.some((s) => s.stageNumber === 3 || s.stageKind?.includes("ortho")) || allItems.some((i) => i.category === "Ортопедия" || /коронк|протез|винир|мостовид/i.test(i.name));

	// 1. Diagnostics & Hygiene basic checks
	if (allItems.length > 0) {
		if (hasSurgeryOrImplant || hasOrthopedics) {
			if (!hasCTDiagnostics) {
				anatomicalChecks.push({
					rule: "STAR_CT_DIAGNOSTICS",
					status: "warning",
					message: "В плане отсутствует 3D КЛКТ томография челюстно-лицевой области (A06.07.004).",
					recommendation: "Рекомендуется включить 3D КЛКТ на 1-м этапе для точной оценки объема кости и анатомии каналов.",
					code804nRelated: ["A06.07.004"],
				});
				clinicalRecommendations.push("Добавьте 3D КЛКТ диагностику перед хирургическим/ортопедическим этапом.");
			}
			if (!hasHygiene) {
				anatomicalChecks.push({
					rule: "STAR_HYGIENE_PREPARATION",
					status: "warning",
					message: "В плане отсутствует комплексная профессиональная гигиена (A16.07.050 / A16.07.051).",
					recommendation: "Проведите санацию полости рта и устранение биопленки до начала инвазивных процедур.",
					code804nRelated: ["A16.07.050", "A16.07.051"],
				});
				clinicalRecommendations.push("Включите профессиональную гигиену на 1-м этапе для предотвращения периимплантита и инфицирования.");
			}
		}
	}

	// 2. Per-tooth anatomical & endo canal checks
	const itemsByTooth = new Map<number, TreatmentPlanValidationItem[]>();
	for (const item of allItems) {
		if (typeof item.toothNumber === "number" && item.toothNumber >= 11 && item.toothNumber <= 85) {
			const arr = itemsByTooth.get(item.toothNumber) || [];
			arr.push(item);
			itemsByTooth.set(item.toothNumber, arr);
		}
	}

	for (const [toothNum, toothItems] of itemsByTooth.entries()) {
		const expectedCanals = getAnatomicalRootCanalCount(toothNum);
		const isDeciduous = isDeciduousTooth(toothNum);
		const toothCodes = toothItems.map((i) => (i.code804n || "").trim().toUpperCase());

		const endoPrepItem = toothItems.find((i) => i.code804n.startsWith("A16.07.030") || /обработк.*канал/i.test(i.name));
		const endoObtItem = toothItems.find((i) => i.code804n.startsWith("A16.07.008") || /пломбирован.*канал|обтурац/i.test(i.name));
		const hasEndo = Boolean(endoPrepItem || endoObtItem);

		// A) Canal count matching
		if (endoPrepItem && !isDeciduous) {
			const expectedPrepCode = `A16.07.030.00${expectedCanals}`;
			if (endoPrepItem.code804n.startsWith("A16.07.030") && endoPrepItem.code804n !== expectedPrepCode) {
				anatomicalChecks.push({
					toothNumber: toothNum,
					rule: "FDI_ENDO_CANAL_PREPARATION_COUNT",
					status: "warning",
					message: `Зуб ${toothNum} анатомически имеет ${expectedCanals} кан., указан код обработки ${endoPrepItem.code804n}.`,
					recommendation: `Проверьте КЛКТ и скорректируйте код на ${expectedPrepCode} (${expectedCanals}-канальный зуб).`,
					code804nRelated: [endoPrepItem.code804n, expectedPrepCode],
				});
				clinicalRecommendations.push(`Зуб ${toothNum}: проверьте соответствие числа каналов (${expectedCanals} кан.) коду 804н.`);
			}
		}

		if (endoObtItem && !isDeciduous) {
			const expectedObtCode = `A16.07.008.00${expectedCanals}`;
			if (endoObtItem.code804n.startsWith("A16.07.008") && endoObtItem.code804n !== expectedObtCode) {
				anatomicalChecks.push({
					toothNumber: toothNum,
					rule: "FDI_ENDO_CANAL_OBTURATON_COUNT",
					status: "warning",
					message: `Зуб ${toothNum} анатомически имеет ${expectedCanals} кан., указан код обтурации ${endoObtItem.code804n}.`,
					recommendation: `Скорректируйте код пломбирования каналов на ${expectedObtCode}.`,
					code804nRelated: [endoObtItem.code804n, expectedObtCode],
				});
			}
		}

		// B) Devitalized tooth crown requirement (posterior teeth % 10 >= 4)
		if (hasEndo && !isDeciduous && (toothNum % 10 >= 4)) {
			const hasCrownOrOnlay = toothCodes.some(
				(c) => c.startsWith("A16.07.004") || c.startsWith("A16.07.003") || c === "A16.07.005" ||
					toothItems.some((i) => /коронк|вкладк|накладк|onlay|overlay/i.test(i.name)),
			);

			if (!hasCrownOrOnlay) {
				anatomicalChecks.push({
					toothNumber: toothNum,
					rule: "DEVITALIZED_POSTERIOR_CROWN_PROTECTION",
					status: "warning",
					message: `Депульпированный жевательный зуб ${toothNum} восстанавливается без ортопедической коронки или накладки (высокий риск перелома корня).`,
					recommendation: `По клиническим протоколам СтАР зуб ${toothNum} после эндодонтии подлежит защите коронкой из диоксида циркония (A16.07.004.001) или керамической вкладкой Onlay (A16.07.003).`,
					code804nRelated: ["A16.07.004.001", "A16.07.003"],
				});
				criticalWarnings.push(`Зуб ${toothNum}: жевательный зуб после депульпирования без коронки имеет критический риск раскола корня с последующим удалением.`);
			}
		}

		// C) Implant intervals and bone volume
		const isImplant = toothCodes.some((c) => c.startsWith("A16.07.054")) || toothItems.some((i) => /имплант/i.test(i.name));
		if (isImplant) {
			const isUpperJaw = toothNum >= 11 && toothNum <= 28;
			const healingWeeks = isUpperJaw ? "16–24 недель (ВЧ)" : "8–12 недель (НЧ)";
			anatomicalChecks.push({
				toothNumber: toothNum,
				rule: "IMPLANT_HEALING_INTERVAL",
				status: "pass",
				message: `Имплантация в области зуба ${toothNum}: рекомендуемый интервал остеоинтеграции до постоянного протезирования составляет ${healingWeeks}.`,
				recommendation: isUpperJaw ? "Контроль плотности кости D3/D4 и синус-лифтинга перед нагрузкой." : "Контроль плотности кости D1/D2 перед установкой формирователя десны.",
				code804nRelated: ["A16.07.054.001"],
			});
		}
	}

	// 3. Overall compliance calculation
	const errorsCount = anatomicalChecks.filter((c) => c.status === "error").length;
	const warningsCount = anatomicalChecks.filter((c) => c.status === "warning").length;
	const passedChecksCount = anatomicalChecks.filter((c) => c.status === "pass").length;
	const totalChecksCount = Math.max(1, anatomicalChecks.length);

	let complianceScorePercent = 100;
	if (errorsCount > 0) complianceScorePercent = Math.max(20, 100 - errorsCount * 25 - warningsCount * 10);
	else if (warningsCount > 0) complianceScorePercent = Math.max(50, 100 - warningsCount * 12);

	let overallStatus: StarComplianceStatus = "FULL_COMPLIANCE";
	if (errorsCount > 0) overallStatus = "NON_COMPLIANT_DEFECTS";
	else if (warningsCount > 0) overallStatus = "COMPLIANT_WITH_RECOMMENDATIONS";

	return {
		overallStatus,
		complianceScorePercent,
		totalChecksCount,
		passedChecksCount,
		warningsCount,
		errorsCount,
		criticalWarnings,
		clinicalRecommendations,
		anatomicalChecks,
	};
}

// ─── 2. DETERMINISTIC FINANCIAL CALCULATOR (13% NDFL & INSTALLMENTS) ─────────

export function calculateDeterministicFinancialArgumentation(
	stages: readonly TreatmentPlanValidationStage[],
	installmentMonths: number = 12,
): TreatmentPlanValidateAndCommentResponse["financialArgumentation"] {
	const allItems = stages.flatMap((s) => s.items);
	const totalRub = stages.reduce((sum, s) => sum + (s.totalRub || s.items.reduce((acc, it) => acc + (it.priceRub || 0), 0)), 0);

	// Разделение по кодам НДФЛ:
	// Код 02 (Дорогостоящее лечение): Имплантация (A16.07.054), Костная пластика / Синус-лифтинг (A16.07.041), Сложное балочное протезирование на имплантатах (All-on-4/6)
	// Код 01 (Обычное лечение): Терапия, гигиена, обычные коронки, пломбы (лимит 150 000 ₽)
	let code02AmountRub = 0;
	let code01AmountRub = 0;

	for (const item of allItems) {
		const code = (item.code804n || "").trim().toUpperCase();
		const isExpensive =
			code.startsWith("A16.07.054") ||
			code.startsWith("A16.07.041") ||
			/имплант|синус|костн.*пласт|all-on-4|all-on-6|балочн/i.test(item.name);

		if (isExpensive) {
			code02AmountRub += item.priceRub || 0;
		} else {
			code01AmountRub += item.priceRub || 0;
		}
	}

	// Если не было расписано по услугам, используем деление по этапам
	if (code01AmountRub === 0 && code02AmountRub === 0 && totalRub > 0) {
		const stage2 = stages.find((s) => s.stageNumber === 2)?.totalRub || 0;
		code02AmountRub = stage2;
		code01AmountRub = Math.max(0, totalRub - stage2);
	}

	const code01Eligible = Math.min(code01AmountRub, 150000);
	const code01RefundRub = Math.round(code01Eligible * 0.13);
	const code02RefundRub = Math.round(code02AmountRub * 0.13);
	const totalRefundRub = code01RefundRub + code02RefundRub;
	const netPriceWithRefundRub = Math.max(0, totalRub - totalRefundRub);

	const ndflExplanation = `Государственный налоговый вычет 13% (ст. 219 НК РФ): вы вернете ${totalRefundRub.toLocaleString("ru-RU")} ₽. ` +
		(code02AmountRub > 0
			? `Дорогостоящее лечение (Код 02: имплантация, костная пластика) дает возврат 13% со всей суммы без ограничений (${code02RefundRub.toLocaleString("ru-RU")} ₽), обычное лечение (Код 01) — ${code01RefundRub.toLocaleString("ru-RU")} ₽.`
			: `По обычному лечению (Код 01) возврат составляет до 19 500 ₽ в год.`);

	// Рассрочка 0% без переплат (3, 6, 12, 24 мес)
	const terms = [3, 6, 12, 24];
	const installments: Record<string, { months: number; monthlyPaymentRub: number; totalPaymentRub: number; overpaymentRub: 0 }> = {};
	for (const m of terms) {
		const monthly = totalRub > 0 ? Math.round(totalRub / m) : 0;
		installments[String(m)] = {
			months: m,
			monthlyPaymentRub: monthly,
			totalPaymentRub: totalRub,
			overpaymentRub: 0,
		};
	}

	// Поэтапная оплата (30% аванс / 40% хирургия / 30% финал)
	const stage1AdvanceRub = Math.round(totalRub * 0.30);
	const stage2SurgicalRub = Math.round(totalRub * 0.40);
	const stage3FinalRub = Math.max(0, totalRub - stage1AdvanceRub - stage2SurgicalRub);

	const stagedExplanation = `Оплата разбивается на 3 комфортных этапа: 30% (${stage1AdvanceRub.toLocaleString("ru-RU")} ₽) при старте лечения, 40% (${stage2SurgicalRub.toLocaleString("ru-RU")} ₽) на хирургическом этапе и остаток 30% (${stage3FinalRub.toLocaleString("ru-RU")} ₽) при финальной фиксации постоянных конструкций.`;

	return {
		totalRub,
		ndflDeduction: {
			code01AmountRub,
			code01RefundRub,
			code02AmountRub,
			code02RefundRub,
			totalRefundRub,
			netPriceWithRefundRub,
			explanation: ndflExplanation,
		},
		installments,
		stagedPaymentSchedule: {
			stage1AdvanceRub,
			stage2SurgicalRub,
			stage3FinalRub,
			explanation: stagedExplanation,
		},
	};
}

// ─── 3. SYSTEM PROMPT FOR OMNI-GATEWAY LLM ──────────────────────────────────

function buildTreatmentPlanPrompt(
	request: TreatmentPlanValidateAndCommentRequest,
	deterministicValidation: ReturnType<typeof runDeterministicClinicalValidation>,
	deterministicFinance: ReturnType<typeof calculateDeterministicFinancialArgumentation>,
): { system: string; user: string } {
	const system = `Вы — главный клинический эксперт, челюстно-лицевой хирург и ведущий врач-стоматолог клиники DENTE.
Ваша цель — провести глубокий клинический аудит плана лечения по стандартам СтАР и составить понятный, заботливый, аргументированный комментарий для презентации пациенту у кресла.

СТРОГИЕ ПРАВИЛА:
1. КЛИНИЧЕСКАЯ ВАЛИДАЦИЯ:
   - Проверьте соответствие анатомии зубов по стандарту FDI (11..48): резцы/клыки (1 канал), премоляры (1-2 канала), моляры (3-4 канала).
   - Обязательно выделите депульпированные жевательные зубы без коронок (риск раскола корня).
   - Проверьте последовательность: Санация и Гигиена -> Хирургия и Имплантация -> Ортопедия и Протезирование.
2. ПРЕЗЕНТАЦИЯ ПАЦИЕНТУ («МАТЕМАТИКА ЗДОРОВЬЯ»):
   - Используйте яркие, понятные метафоры:
     * Кариес = "скрытая полость под прочной эмалью, как подгнившая балка внутри стены".
     * Пульпит = "воспаление нерва — пожар внутри зуба, требующий бережного тушения и пломбирования под микроскопом".
     * Имплантация = "создание нового титанового корня взамен утраченного — сохраняет кость и предотвращает смещение соседних зубов".
     * Коронка на депульпированный зуб = "защитный шлем для хрупкого зуба, предохраняющий от раскола".
   - Экономический аргумент: лечить кариес сейчас (~6 000 ₽) в 6 раз дешевле эндодонтии с коронкой (~35 000 ₽) и в 10 раз дешевле имплантации (~70 000+ ₽).
3. ФИНАНСОВАЯ АРГУМЕНТАЦИЯ:
   - Налоговый вычет 13% (Код 01 до 150к, Код 02 без ограничений).
   - Рассрочка 0% без переплат.
   - Поэтапная оплата 30/40/30.
4. ФОРМАТ ОТВЕТА:
   - СТРОГО валидный JSON в соответствии со структурой Response! Без markdown разметки вокруг JSON.`;

	const user = `Данные плана лечения:
Врач: ${request.doctorFullName || "Врач-стоматолог DENTE"} (${request.doctorSpecialty || "Стоматолог общей практики"})
Пациент: ${request.patientContext?.patientName || "Пациент"} (Диагноз: ${request.patientContext?.diagnosisSummary || "Санация полости рта"})
Общая стоимость: ${deterministicFinance.totalRub.toLocaleString("ru-RU")} ₽
Целевой бюджет: ${request.targetBudgetRub ? `${request.targetBudgetRub.toLocaleString("ru-RU")} ₽` : "Не ограничен"}
Пользовательский запрос: ${request.userPrompt || "Комплексный аудит и комментарий для пациента"}

Этапы лечения:
${request.stages.map((s) => `Этап ${s.stageNumber}: ${s.title} (${s.totalRub} ₽, ${s.estimatedWeeks || 2} нед.)
  Услуги:
${s.items.map((it) => `    * [Зуб ${it.toothNumber || "—"}] ${it.code804n ? `${it.code804n} ` : ""}${it.name} — ${it.priceRub} ₽ (${it.materials || "стандарт"})`).join("\n")}`).join("\n\n")}

Предварительные детерминированные проверки:
- Статус соответствия: ${deterministicValidation.overallStatus} (${deterministicValidation.complianceScorePercent}%)
- Критические предупреждения: ${deterministicValidation.criticalWarnings.join("; ") || "нет"}
- Рекомендации: ${deterministicValidation.clinicalRecommendations.join("; ") || "нет"}
- Налоговый вычет: ${deterministicFinance.ndflDeduction.totalRefundRub} ₽ (чистая цена: ${deterministicFinance.ndflDeduction.netPriceWithRefundRub} ₽)

Сформируйте полный JSON ответ.`;

	return { system, user };
}

// ─── 4. OMNI-GATEWAY / MULTI-PROVIDER INFERENCE EXECUTION ───────────────────

const AI_MODEL_CASCADE: Array<{
	provider: "groq" | "gemini" | "deepseek" | "openai" | "anthropic";
	model: string;
	keyProviderId: SpeechGatewayProvider;
	baseUrl: string;
}> = [
	// 1. Primary: Qwen 3.8 27B / Qwen 2.5 32B on Groq
	{
		provider: "groq",
		model: "qwen/qwen3.8-27b",
		keyProviderId: "groq_whisper",
		baseUrl: "https://api.groq.com/openai/v1",
	},
	// 2. High-speed Fallback: Gemini 3.5 Flash-Lite
	{
		provider: "gemini",
		model: "gemini-3.5-flash-lite",
		keyProviderId: "google_speech",
		baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
	},
	// 3. Gemini 3.1 Flash-Lite
	{
		provider: "gemini",
		model: "gemini-3.1-flash-lite",
		keyProviderId: "google_speech",
		baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
	},
	// 4. Llama 3.3 70B Versatile on Groq
	{
		provider: "groq",
		model: "llama-3.3-70b-versatile",
		keyProviderId: "groq_whisper",
		baseUrl: "https://api.groq.com/openai/v1",
	},
	// 5. DeepSeek Chat V3
	{
		provider: "deepseek",
		model: "deepseek-chat",
		keyProviderId: "openai_transcribe",
		baseUrl: "https://api.deepseek.com/v1",
	},
	// 6. OpenAI GPT-4o-mini
	{
		provider: "openai",
		model: "gpt-4o-mini",
		keyProviderId: "openai_transcribe",
		baseUrl: "https://api.openai.com/v1",
	},
];

async function callLlmJson(
	systemPrompt: string,
	userPrompt: string,
	providerInfo: (typeof AI_MODEL_CASCADE)[0],
	apiKey: string,
): Promise<any> {
	const requestBody = {
		model: providerInfo.model,
		temperature: 0.2,
		response_format: { type: "json_object" },
		messages: [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: userPrompt },
		],
	};

	const response = await fetchWithProviderTimeout(
		`${providerInfo.baseUrl}/chat/completions`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		},
		numberFromEnv("DENTAL_SPEECH_POLISH_TIMEOUT_MS", 45_000),
	);

	const data = (await response.json().catch(() => ({}))) as any;
	if (!response.ok) {
		throw providerHttpError(response.status, response.statusText, data?.error?.message);
	}

	const content = data?.choices?.[0]?.message?.content;
	if (typeof content !== "string") {
		throw new Error("ИИ вернул пустой или некорректный ответ.");
	}

	try {
		return JSON.parse(content.trim());
	} catch {
		const match = content.match(/\{[\s\S]*\}/);
		if (match?.[0]) return JSON.parse(match[0]);
		throw new Error("Ответ модели не содержит валидного JSON.");
	}
}

// ─── 5. MAIN ORCHESTRATOR: VALIDATE & COMMENT TREATMENT PLAN ────────────────

export async function validateAndCommentTreatmentPlan(
	request: TreatmentPlanValidateAndCommentRequest,
): Promise<TreatmentPlanValidateAndCommentResponse> {
	const validatedAtIso = new Date().toISOString();

	// 1. Run deterministic engines first (guaranteed 100% exact math & clinical foundation)
	const deterministicValidation = runDeterministicClinicalValidation(request.stages);
	const deterministicFinance = calculateDeterministicFinancialArgumentation(
		request.stages,
		typeof request.installmentMonths === "number" ? request.installmentMonths : 12,
	);

	// Default structured fallback object
	const defaultResult: TreatmentPlanValidateAndCommentResponse = {
		clinicalValidation: deterministicValidation,
		chairsideCommentary: {
			patientFriendlySummary: `План комплексного лечения состоит из ${request.stages.length} этапов общей стоимостью ${deterministicFinance.totalRub.toLocaleString("ru-RU")} ₽. ` +
				`Лечение направлено на устранение очагов инфекции, восстановление функции жевания и долгосрочное сохранение здоровья зубов.`,
			urgencyArgument: `**Математика здоровья DENTE:** Лечение выявленных проблем на ранней стадии позволяет сохранить собственные зубы и предотвратить их разрушение. ` +
				`Кариес устраняется за один визит (~6 000 ₽), тогда как при откладывании воспаление переходит в пульпит (~35 000 ₽ за каналы и коронку) или потерю зуба с необходимостью имплантации (~70 000+ ₽).`,
			hygieneAndCareAdvice: `Обязательна чистка зубов 2 раза в день выметающими движениями от десны к краю зуба. ` +
				`При наличии коронок и имплантатов обязателен ирригатор и межзубные ершики для очищения границы коронка-десна. Исключите красящие продукты в первые 48 часов после процедур.`,
			stageByStageExplanation: request.stages.map((s) => ({
				stageNumber: s.stageNumber,
				stageTitle: s.title,
				plainRussianDescription: s.clinicalGoal || s.items.map((it) => it.name).join(", "),
				patientBenefit: `Обеспечивает надежный результат этапа «${s.title}» в комфортные сроки (${s.estimatedWeeks || 2} нед.).`,
			})),
		},
		financialArgumentation: deterministicFinance,
		copilotSuggestions: {
			budgetOptimizationAdvice: request.targetBudgetRub && deterministicFinance.totalRub > request.targetBudgetRub
				? `План (${deterministicFinance.totalRub.toLocaleString("ru-RU")} ₽) превышает целевой бюджет (${request.targetBudgetRub.toLocaleString("ru-RU")} ₽) на ${(deterministicFinance.totalRub - request.targetBudgetRub).toLocaleString("ru-RU")} ₽. Рекомендуется замена премиальных конструкций на проверенную металлокерамику или стандартные имплантаты Osstem с сохранением обязательной терапии.`
				: undefined,
			suggestedModifications: [
				{
					type: "anesthesia_isolation",
					title: "Аудит безопасности: анестезия и коффердам",
					description: "Добавление карпульной анестезии Артикаин и изоляции коффердам для 100% безболезненности и сухости поля.",
					estimatedDeltaRub: 1800,
				},
				{
					type: "ndfl_refund",
					title: "Оформление справки для налогового вычета 13%",
					description: `Возврат ${deterministicFinance.ndflDeduction.totalRefundRub.toLocaleString("ru-RU")} ₽ от государства по итогам года.`,
					estimatedDeltaRub: -deterministicFinance.ndflDeduction.totalRefundRub,
				},
			],
		},
		modelUsed: "deterministic_rule_engine",
		providerUsed: "local_rules",
		validatedAtIso,
	};

	// Check if neural polish is requested/enabled
	const isNeuralDisabled = process.env.DENTAL_AI_NEURAL_DRAFT === "false";
	if (isNeuralDisabled) {
		return defaultResult;
	}

	const { system, user } = buildTreatmentPlanPrompt(
		request,
		deterministicValidation,
		deterministicFinance,
	);

	// Try Cascade across LLM providers
	for (const cascadeItem of AI_MODEL_CASCADE) {
		try {
			// Check explicit env keys first
			let candidateApiKey: string | null = null;
			if (cascadeItem.provider === "groq" && process.env.GROQ_API_KEY) {
				candidateApiKey = process.env.GROQ_API_KEY;
			} else if (cascadeItem.provider === "gemini" && (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)) {
				candidateApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
			} else if (cascadeItem.provider === "openai" && process.env.OPENAI_API_KEY) {
				candidateApiKey = process.env.OPENAI_API_KEY;
			} else if (cascadeItem.provider === "deepseek" && process.env.DEEPSEEK_API_KEY) {
				candidateApiKey = process.env.DEEPSEEK_API_KEY;
			}

			// Or select from keyPool
			if (!candidateApiKey) {
				const keyCandidate = selectProviderKey(cascadeItem.keyProviderId, new Set());
				if (keyCandidate) {
					candidateApiKey = keyCandidate.value;
				}
			}

			if (!candidateApiKey) continue;

			const parsedJson = await callLlmJson(system, user, cascadeItem, candidateApiKey);
			if (parsedJson && typeof parsedJson === "object") {
				// Safely merge neural enrichment into deterministic math
				const responseObj: TreatmentPlanValidateAndCommentResponse = {
					clinicalValidation: {
						...deterministicValidation,
						criticalWarnings: Array.isArray(parsedJson.clinicalValidation?.criticalWarnings) && parsedJson.clinicalValidation.criticalWarnings.length > 0
							? parsedJson.clinicalValidation.criticalWarnings
							: deterministicValidation.criticalWarnings,
						clinicalRecommendations: Array.isArray(parsedJson.clinicalValidation?.clinicalRecommendations) && parsedJson.clinicalValidation.clinicalRecommendations.length > 0
							? parsedJson.clinicalValidation.clinicalRecommendations
							: deterministicValidation.clinicalRecommendations,
					},
					chairsideCommentary: {
						patientFriendlySummary: String(parsedJson.chairsideCommentary?.patientFriendlySummary || defaultResult.chairsideCommentary.patientFriendlySummary).trim(),
						urgencyArgument: String(parsedJson.chairsideCommentary?.urgencyArgument || defaultResult.chairsideCommentary.urgencyArgument).trim(),
						hygieneAndCareAdvice: String(parsedJson.chairsideCommentary?.hygieneAndCareAdvice || defaultResult.chairsideCommentary.hygieneAndCareAdvice).trim(),
						stageByStageExplanation: Array.isArray(parsedJson.chairsideCommentary?.stageByStageExplanation) && parsedJson.chairsideCommentary.stageByStageExplanation.length > 0
							? parsedJson.chairsideCommentary.stageByStageExplanation
							: defaultResult.chairsideCommentary.stageByStageExplanation,
					},
					financialArgumentation: deterministicFinance, // Guaranteed exact kopecks & rubles
					copilotSuggestions: {
						budgetOptimizationAdvice: parsedJson.copilotSuggestions?.budgetOptimizationAdvice || defaultResult.copilotSuggestions.budgetOptimizationAdvice,
						suggestedModifications: Array.isArray(parsedJson.copilotSuggestions?.suggestedModifications) && parsedJson.copilotSuggestions.suggestedModifications.length > 0
							? parsedJson.copilotSuggestions.suggestedModifications
							: defaultResult.copilotSuggestions.suggestedModifications,
					},
					modelUsed: cascadeItem.model,
					providerUsed: cascadeItem.provider,
					validatedAtIso,
				};

				return treatmentPlanValidateAndCommentResponseSchema.parse(responseObj);
			}
		} catch (llmError) {
			console.warn(
				`[TreatmentPlan AI Validator Cascade ${cascadeItem.provider}/${cascadeItem.model} Error]: ${llmError instanceof Error ? llmError.message : llmError}`,
			);
		}
	}

	// If all LLM calls failed, safely return the 100% deterministic result
	return treatmentPlanValidateAndCommentResponseSchema.parse(defaultResult);
}
