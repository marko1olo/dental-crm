import { createHash, randomInt } from "node:crypto";
import {
	generateQrMatrix,
	kopecksToRubles,
	rublesToKopecks,
} from "@dental/shared";
import { namedDevelopmentModeActive } from "../../accessGuard.js";
import type { treatmentPlanItemsNew, treatmentPlans } from "../../db/schema.js";
import {
	DEFAULT_OTP_SMS_TEMPLATE,
	type PortalOtpPolicy,
} from "./types.js";

export function readBoundedInt(
	name: string,
	fallback: number,
	min: number,
	max: number,
): number {
	const raw = process.env[name]?.trim();
	if (!raw) return fallback;
	const parsed = Number.parseInt(raw, 10);
	if (!Number.isFinite(parsed)) return fallback;
	// Границы, а не доверие к значению: код длиной 1 или срок в сутки — это не
	// «настройка», это отключённая защита.
	return Math.min(max, Math.max(min, parsed));
}

export function readPortalOtpPolicy(): PortalOtpPolicy {
	return {
		// Шесть цифр — российская норма для SMS-кода: 10^6 вариантов против
		// потолка в 5 попыток даёт шанс подбора 5 на миллион за срок жизни кода.
		codeLength: readBoundedInt("DENTE_PORTAL_OTP_LENGTH", 6, 6, 8),
		// Пять минут: пациенту хватает получить SMS и ввести, а украденный из
		// уведомления на экране код протухает быстрее, чем им воспользуются.
		ttlSeconds: readBoundedInt("DENTE_PORTAL_OTP_TTL_SECONDS", 300, 60, 900),
		maxAttempts: readBoundedInt("DENTE_PORTAL_OTP_MAX_ATTEMPTS", 5, 3, 10),
		// Минута между отправками: столько идёт SMS в худшем случае, и столько же
		// стоит выдержать, чтобы кнопкой «отправить ещё раз» не разоряли клинику.
		resendCooldownSeconds: readBoundedInt(
			"DENTE_PORTAL_OTP_RESEND_COOLDOWN_SECONDS",
			60,
			30,
			600,
		),
		// Не более 3 SMS за 10 минут на пациента (защита от флуда и слива баланса шлюза):
		maxPerWindow: readBoundedInt("DENTE_PORTAL_OTP_MAX_PER_WINDOW", 3, 1, 20),
		windowSeconds: readBoundedInt(
			"DENTE_PORTAL_OTP_WINDOW_SECONDS",
			600,
			60,
			86_400,
		),
		// Сутки: срок нужен не для проверки кода, а чтобы разобрать инцидент
		// «пациент говорит, что не запрашивал вход».
		retentionSeconds: readBoundedInt(
			"DENTE_PORTAL_OTP_RETENTION_SECONDS",
			86_400,
			3600,
			2_592_000,
		),
		smsTemplate:
			process.env.DENTE_PORTAL_OTP_SMS_TEMPLATE?.trim() ||
			DEFAULT_OTP_SMS_TEMPLATE,
	};
}

/**
 * Разрешено ли выводить одноразовый код входа в журнал сервера вместо SMS.
 * Работает, только если ЯВНО назван режим разработки (development/test).
 */
export function developerLogFallbackAllowed(): boolean {
	return namedDevelopmentModeActive();
}

/**
 * Код выдаётся CSPRNG. Math.random() для кода доступа непригоден.
 */
export function generateNumericCode(length: number): string {
	return String(randomInt(0, 10 ** length)).padStart(length, "0");
}

export function renderOtpMessage(policy: PortalOtpPolicy, code: string): string {
	const minutes = Math.max(1, Math.round(policy.ttlSeconds / 60));
	return policy.smsTemplate
		.replace(/\{code\}/g, code)
		.replace(/\{minutes\}/g, String(minutes));
}

export function generateSha256Hex(data: string): string {
	return createHash("sha256").update(data, "utf8").digest("hex");
}

/**
 * [POR-07] Генератор валидных SVG QR-кодов по ГОСТ Р 56042-2014 / НСПК СБП.
 * 100% сканируемый банковскими приложениями и камерами смартфонов.
 */
export function generateDeterministicQrSvg(
	content: string,
	size = 180,
	options?: { color?: string; background?: string; margin?: number },
): string {
	const margin = options?.margin ?? 2;
	const fg = options?.color ?? "#0f172a";
	const bg = options?.background ?? "#ffffff";
	const { matrix, size: matrixSize } = generateQrMatrix(content, "M");
	const totalCells = matrixSize + margin * 2;
	const cellSize = size / totalCells;

	let path = "";
	for (let r = 0; r < matrixSize; r++) {
		const row = matrix[r];
		if (!row) continue;
		for (let c = 0; c < matrixSize; c++) {
			if (row[c]) {
				const x = ((c + margin) * cellSize).toFixed(2);
				const y = ((r + margin) * cellSize).toFixed(2);
				const s = cellSize.toFixed(2);
				path += `M${x},${y}h${s}v${s}h-${s}z `;
			}
		}
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges" style="display:block;"><title>QR-код оплаты СБП (НСПК)</title><rect width="${size}" height="${size}" fill="${bg}"/><path d="${path.trim()}" fill="${fg}"/></svg>`;
}

export function mapConsentKindToDocMeta(consentId: string): {
	kind:
		| "informed_consent"
		| "anesthesia_consent_log"
		| "personal_data_processing_consent"
		| "procedure_specific_consent_packet";
	title: string;
} {
	const n = consentId.toLowerCase();
	if (n.includes("anest") || n.includes("анест")) {
		return {
			kind: "anesthesia_consent_log",
			title: "Информированное добровольное согласие на местное обезболивание",
		};
	}
	if (n.includes("pd") || n.includes("пдн") || n.includes("152")) {
		return {
			kind: "personal_data_processing_consent",
			title: "Согласие на обработку персональных данных (152-ФЗ)",
		};
	}
	if (n.includes("packet") || n.includes("пакет")) {
		return {
			kind: "procedure_specific_consent_packet",
			title: "Пакет информированных добровольных согласий на медицинские вмешательства",
		};
	}
	return {
		kind: "informed_consent",
		title: "Информированное добровольное согласие на стоматологическое лечение (ст. 20 № 323-ФЗ)",
	};
}

type PortalPlanRow = typeof treatmentPlans.$inferSelect;
type PortalPlanItemRow = typeof treatmentPlanItemsNew.$inferSelect;

export function buildPortalThreeTierPlansPayload(
	dbPlans: PortalPlanRow[],
	planItems: PortalPlanItemRow[],
	selectedTier: unknown,
) {
	const hasRealAlternatives = dbPlans.some(
		(p) => p.isAlternative || p.alternativeTier,
	);
	const basicPlan = dbPlans.find((p) => p.alternativeTier === "basic");
	const standardPlan =
		dbPlans.find(
			(p) =>
				p.alternativeTier === "standard" ||
				(!p.alternativeTier && !p.isAlternative),
		) || dbPlans[0];
	const premiumPlan = dbPlans.find((p) => p.alternativeTier === "premium");

	const getPlanStages = (targetPlanId?: string) => {
		const items = targetPlanId
			? planItems.filter((it) => it.planId === targetPlanId)
			: planItems;
		return items.map((it, idx) => {
			const separatorIndex = (it.priceId ?? "").indexOf("::");
			const titleRu =
				separatorIndex >= 0
					? it.priceId.slice(separatorIndex + 2) || "Лечебная процедура"
					: it.priceId || "Лечебная процедура";
			const itemPriceKopecks =
				it.priceKopecks && it.priceKopecks > 0n
					? it.priceKopecks
					: it.price
						? rublesToKopecks(Number(it.price))
						: 0n;
			const itemDiscountKopecks =
				it.discountKopecks && it.discountKopecks > 0n
					? it.discountKopecks
					: it.discount
						? rublesToKopecks(Number(it.discount))
						: 0n;
			const rawKopecks =
				BigInt(itemPriceKopecks) * BigInt(it.quantity || 1) -
				BigInt(itemDiscountKopecks);
			const costRub = Math.max(
				0,
				kopecksToRubles(rawKopecks > 0n ? rawKopecks : 0n),
			);
			return {
				id: it.id,
				orderIndex: idx + 1,
				titleRu,
				categoryRu: "Стоматология",
				teethFdi: it.toothNumber ? [String(it.toothNumber)] : [],
				costRub,
				paidRub: 0,
				remainingRub: costRub,
				status: "in_progress" as "in_progress" | "completed",
				procedures: [titleRu],
			};
		});
	};

	interface TreatmentTierDto {
		tierId: "basic" | "standard" | "premium";
		tierNameRu: string;
		subtitleRu: string;
		totalCostRub: number;
		warrantyMonths: number;
		durationWeeks: number;
		benefits: string[];
		stages: ReturnType<typeof getPlanStages>;
	}

	const buildTier = (
		tierId: "basic" | "standard" | "premium",
		plan: typeof standardPlan,
		defaultName: string,
		subtitleRu: string,
		warrantyMonths: number,
		durationWeeks: number,
		benefits: string[],
	): TreatmentTierDto | null => {
		if (!plan) return null;
		const stages = getPlanStages(plan.id);
		return {
			tierId,
			tierNameRu: plan.name || defaultName,
			subtitleRu,
			totalCostRub: stages.reduce((sum, s) => sum + s.costRub, 0),
			warrantyMonths,
			durationWeeks,
			benefits,
			stages,
		};
	};

	const tiers: TreatmentTierDto[] = [];
	if (hasRealAlternatives) {
		const b = buildTier(
			"basic",
			basicPlan,
			"Базовый (Эконом)",
			"Функциональное восстановление базовыми материалами",
			12,
			4,
			[
				"Качественное восстановление материалами базового прейскуранта",
				"Базовая клиническая гарантия 1 год",
			],
		);
		if (b) tiers.push(b);
		const s = buildTier(
			"standard",
			standardPlan,
			"Оптимальный (Стандарт)",
			"Анатомическая реставрация и расширенная гарантия",
			24,
			6,
			[
				"Высокоэстетичные нанокомпозиты и премиальные материалы",
				"Лечение по международным клиническим протоколам",
				"Гарантия 2 года",
			],
		);
		if (s) tiers.push(s);
		const p = buildTier(
			"premium",
			premiumPlan,
			"Премиум (VIP All-Inclusive)",
			"Премиальные технологии и бессрочное сопровождение",
			60,
			8,
			[
				"Премиальные биосовместимые материалы",
				"Персональный врач-куратор",
				"Расширенная гарантия 5 лет с регулярными чекапами",
			],
		);
		if (p) tiers.push(p);
	} else if (standardPlan) {
		const s = buildTier(
			"standard",
			standardPlan,
			"Основной план лечения",
			"Утверждённый клинический план лечения",
			24,
			6,
			[
				"Лечение по международным клиническим протоколам",
				"Сертифицированные биосовместимые материалы",
				"Официальная гарантия клиники",
			],
		);
		if (s) tiers.push(s);
	}

	const effectiveSelectedTier = tiers.some((t) => t.tierId === selectedTier)
		? (selectedTier as "basic" | "standard" | "premium")
		: tiers[0]?.tierId || "standard";

	const threeTierModel =
		tiers.length > 0
			? {
					selectedTier: effectiveSelectedTier,
					isCustomAlternatives: hasRealAlternatives,
					tiers,
				}
			: null;

	const enrichedPlans = dbPlans.map((p) => ({
		...p,
		items: planItems
			.filter((it) => it.planId === p.id)
			.map((it) => {
				// 152-ФЗ / Коммерческая тайна: зарплатные ставки и начисления врачу не должны утекать пациенту
				const { commissionAmount: _comm, ...safeItem } = it;
				return safeItem;
			}),
	}));

	return {
		plans: enrichedPlans,
		threeTierModel,
	};
}
