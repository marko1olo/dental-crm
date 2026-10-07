import React, { useState, useMemo } from "react";
import {
  Check,
  CheckCircle2,
  CreditCard,
  Flame,
  Layers,
  Percent,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import type { EstimateTierCardProps, EstimateTierOption } from "./types";
import { useVisitStore } from "../../../store/visitStore";
import { formatMoney } from "../useCopilotFormat";

export const EstimateTierCard: React.FC<EstimateTierCardProps> = ({
	data,
	activeTier,
	onSelectTier,
	onApplyTier,
}) => {
	const defaultTier = data.selectedTier || activeTier || "optimum";
	const [currentTierKey, setCurrentTierKey] = useState<
		"economy" | "optimum" | "premium"
	>(defaultTier);
	const [appliedTierKey, setAppliedTierKey] = useState<string | null>(null);

	const tiers = useMemo(() => {
		const rawTiers =
			data.tiers && data.tiers.length > 0
				? data.tiers
				: [
						{
							tierKey: "economy" as const,
							tierName: "Тариф «Эконом»",
							badge: "Базовый",
							totalRub: 45000,
							taxDeductionRub: 5850,
							netCostAfterDeductionRub: 39150,
							monthlyInstallmentRub: 3750,
							installmentMonths: 12,
							warrantyDescription: "1 год официальной гарантии",
							materialsDescription:
								"Сертифицированные клинические материалы и стандартный протокол лечения",
							keyAdvantages: [
								"Доступная стоимость санации по клиническому стандарту",
								"Проверенные сертифицированные материалы",
								"Официальная гарантия 1 год",
							],
							stages: [
								{ stageName: "Первичная санация и подготовка", proceduresCount: 2, totalRub: 15000 },
								{ stageName: "Клинический этап лечения", proceduresCount: 1, totalRub: 12000 },
								{ stageName: "Финишная обработка и контроль", proceduresCount: 1, totalRub: 18000 },
							],
						},
						{
							tierKey: "optimum" as const,
							tierName: "Тариф «Оптимум»",
							badge: "Рекомендуемый",
							totalRub: 84500,
							taxDeductionRub: 10985,
							netCostAfterDeductionRub: 73515,
							monthlyInstallmentRub: 7042,
							installmentMonths: 12,
							warrantyDescription: "2 года расширенной гарантии",
							materialsDescription:
								"Высокоэстетичные материалы, бережное препарирование и адгезивный протокол",
							keyAdvantages: [
								"Высокая эстетика и биосовместимость",
								"Бережное препарирование твердых тканей зуба",
								"Расширенная гарантия 2 года",
							],
							stages: [
								{ stageName: "Подготовка и изоляция операционного поля", proceduresCount: 2, totalRub: 24500 },
								{ stageName: "Высокоточный этап восстановления", proceduresCount: 1, totalRub: 20000 },
								{ stageName: "Фиксация и полировка", proceduresCount: 1, totalRub: 40000 },
							],
						},
						{
							tierKey: "premium" as const,
							tierName: "Тариф «Премиум»",
							badge: "VIP / Максимум",
							totalRub: 148000,
							taxDeductionRub: 19240,
							netCostAfterDeductionRub: 128760,
							monthlyInstallmentRub: 12333,
							installmentMonths: 12,
							warrantyDescription: "Пожизненная гарантия на конструкции",
							materialsDescription:
								"Премиальные нанотехнологичные материалы, микроскопный контроль и максимальный комфорт",
							keyAdvantages: [
								"Максимальная прочность и непревзойденная эстетика",
								"100% биоинертность и гипоаллергенность",
								"Персональный сервис и максимальная гарантия",
							],
							stages: [
								{ stageName: "Высокоточная диагностика и изоляция", proceduresCount: 3, totalRub: 38000 },
								{ stageName: "Прецизионный этап лечения под увеличением", proceduresCount: 1, totalRub: 50000 },
								{ stageName: "Идеальная анатомическая интеграция", proceduresCount: 1, totalRub: 60000 },
							],
						},
					];

		return rawTiers.map((t) => {
			const total =
				typeof t.totalRub === "number" && Number.isFinite(t.totalRub)
					? t.totalRub
					: 0;
			const taxDeduction =
				typeof t.taxDeductionRub === "number" &&
				Number.isFinite(t.taxDeductionRub)
					? t.taxDeductionRub
					: Math.round(total * 0.13);
			const netCost =
				typeof t.netCostAfterDeductionRub === "number" &&
				Number.isFinite(t.netCostAfterDeductionRub)
					? t.netCostAfterDeductionRub
					: Math.max(0, total - taxDeduction);
			const months =
				typeof t.installmentMonths === "number" && t.installmentMonths > 0
					? t.installmentMonths
					: 12;
			const installment =
				typeof t.monthlyInstallmentRub === "number" &&
				Number.isFinite(t.monthlyInstallmentRub)
					? t.monthlyInstallmentRub
					: Math.round(total / months);

			return {
				...t,
				totalRub: total,
				taxDeductionRub: taxDeduction,
				netCostAfterDeductionRub: netCost,
				monthlyInstallmentRub: installment,
				installmentMonths: months,
			};
		});
	}, [data.tiers]);

	const activeTierObj = useMemo(() => {
		return (
			tiers.find((t) => t.tierKey === currentTierKey) || tiers[1] || tiers[0]
		);
	}, [tiers, currentTierKey]);

	const handleTierSwitch = (key: "economy" | "optimum" | "premium") => {
		setCurrentTierKey(key);
		onSelectTier?.(key);
	};

	const handleApply = () => {
		if (!activeTierObj) return;
		setAppliedTierKey(currentTierKey);
		// Instant zero-reload state sync with useVisitStore
		try {
			const teethList =
				data.teeth && data.teeth.length > 0 ? data.teeth.map(String) : ["36"];
			const plannedMap: Record<string, "planned"> = {};
			teethList.forEach((t) => {
				plannedMap[t] = "planned";
			});
			useVisitStore
				.getState()
				.applyAiToothCodes(teethList, "planned", plannedMap);
		} catch {
			// store sync resilience
		}
		onApplyTier?.(currentTierKey, activeTierObj);
	};

	return (
		<div
			className="copilot-gen-card copilot-estimate-tier-card"
			data-testid="copilot-estimate-tier-card"
		>
			{/* Header */}
			<div className="copilot-et-header">
				<div>
					<h4 className="copilot-et-title">
						ДЕНТА предлагает план лечения: 3 тарифных варианта
					</h4>
					<div className="copilot-et-subtitle">
						{data.patientName && <span>Пациент: {data.patientName} • </span>}
						{data.teeth && data.teeth.length > 0 && (
							<span>Зубы: {data.teeth.join(", ")} • </span>
						)}
						<span>Расчёт по прейскуранту (без НДС)</span>
					</div>
				</div>
			</div>

			{/* 3-Package Comparator Strip */}
			<div className="copilot-et-segmented-control" role="tablist">
				{tiers.map((tier) => {
					const isSelected = tier.tierKey === currentTierKey;
					const badgeText = tier.badge || (tier.tierKey === "optimum" ? "Рекомендуемый" : tier.tierKey === "premium" ? "Премиум" : "Базовый");
					return (
						<button
							key={tier.tierKey}
							type="button"
							role="tab"
							aria-selected={isSelected}
							onClick={() => handleTierSwitch(tier.tierKey)}
							className={`copilot-et-segment-btn ${isSelected ? `active ${tier.tierKey}` : ""}`}
						>
							<span className="copilot-et-segment-name">
								{tier.tierKey === "optimum"
									? "Оптимум"
									: tier.tierKey === "premium"
										? "Премиум"
										: "Эконом"}
							</span>
							<span className="copilot-et-segment-material">{badgeText}</span>
							<span className="copilot-et-segment-price tabular-nums">
								{formatMoney(tier.totalRub)}
							</span>
						</button>
					);
				})}
			</div>

			{/* Active Tier Presentation Body */}
			{activeTierObj && (
				<div className={`copilot-et-tier-body ${activeTierObj.tierKey}`}>
					{/* Price & Technology Row */}
					<div className="copilot-et-price-row">
						<div>
							<div className="flex items-center gap-2 flex-wrap">
								<h5 className="copilot-et-tier-title">
									{activeTierObj.tierName}
								</h5>
								<span className={`copilot-et-badge ${activeTierObj.tierKey}`}>
									{activeTierObj.badge}
								</span>
							</div>
							{activeTierObj.materialsDescription && (
								<div className="copilot-et-crown-tech">
									<Layers size={13} className="text-[var(--teal)] inline mr-1" />
									<span>{activeTierObj.materialsDescription}</span>
								</div>
							)}
						</div>
						<div className="text-right">
							<span className="copilot-et-price tabular-nums">
								{formatMoney(activeTierObj.totalRub)}
							</span>
						</div>
					</div>

					{/* Tax Deduction & Installments Grid */}
					<div className="copilot-et-perks-grid">
						<div className="copilot-et-perk-box">
							<span className="copilot-et-perk-label flex items-center gap-1">
								<Percent size={11} className="text-[var(--teal)]" />
								<span>Вычет 13% НДФЛ</span>
							</span>
							<span className="copilot-et-perk-val text-[var(--teal)] tabular-nums">
								-{formatMoney(activeTierObj.taxDeductionRub)}
							</span>
							<span className="text-[10px] text-[var(--muted)]">
								К оплате: {formatMoney(activeTierObj.netCostAfterDeductionRub)}
							</span>
						</div>

						<div className="copilot-et-perk-box">
							<span className="copilot-et-perk-label flex items-center gap-1">
								<CreditCard size={11} className="text-[var(--amber)]" />
								<span>Рассрочка 0%</span>
							</span>
							<span className="copilot-et-perk-val text-[var(--ink)] tabular-nums">
								от{" "}
								{formatMoney(
									activeTierObj.monthlyInstallmentRub ||
										Math.round(activeTierObj.totalRub / 12),
								)}{" "}
								/ мес
							</span>
							<span className="text-[10px] text-[var(--muted)]">
								на {activeTierObj.installmentMonths || 12} месяцев
							</span>
						</div>
					</div>

					{/* Warranty & Materials */}
					<div className="copilot-et-materials">
						<div className="font-semibold text-[var(--ink)] mb-1 flex items-center gap-1.5">
							<ShieldCheck size={13} className="text-[var(--teal)]" />
							<span>{activeTierObj.warrantyDescription}</span>
						</div>
						<div>{activeTierObj.materialsDescription}</div>
					</div>

					{/* Stages Breakdown with Green Checkmarks */}
					<div className="copilot-et-stages-block">
						<div className="copilot-et-stages-header">
							<CheckCircle2 size={13} className="text-[var(--teal)]" />
							<span>Этапы плана лечения:</span>
						</div>
						<div className="copilot-et-stages-list">
							{(activeTierObj.stages && activeTierObj.stages.length > 0
								? activeTierObj.stages
								: [
										{
											stageName: "Терапевтическая подготовка и препарирование",
											proceduresCount: 2,
											totalRub: Math.round(activeTierObj.totalRub * 0.3),
										},
										{
											stageName: "Оптические слепки / сканирование и лаборатория",
											proceduresCount: 1,
											totalRub: Math.round(activeTierObj.totalRub * 0.25),
										},
										{
											stageName:
												activeTierObj.tierKey === "economy"
													? "Примерка и фиксация металлокерамики Co-Cr"
													: activeTierObj.tierKey === "optimum"
														? "Адгезивная фиксация керамической коронки e.max"
														: "Прецизионная посадка коронки из диоксида циркония",
											proceduresCount: 1,
											totalRub: Math.round(activeTierObj.totalRub * 0.45),
										},
									]
							).map((stage, idx) => (
								<div key={idx} className="copilot-et-stage-row">
									<div className="copilot-et-stage-info">
										<CheckCircle2
											size={14}
											className="text-[var(--teal)] flex-shrink-0"
										/>
										<span className="copilot-et-stage-name">
											{stage.stageName}
											{stage.proceduresCount ? (
												<span className="text-[var(--muted)] font-normal text-[11px] ml-1">
													({stage.proceduresCount} проц.)
												</span>
											) : null}
										</span>
									</div>
									<span className="copilot-et-stage-price tabular-nums">
										{formatMoney(stage.totalRub)}
									</span>
								</div>
							))}
						</div>
					</div>

					{/* Key Advantages */}
					<ul className="copilot-et-advantages-list">
						{activeTierObj.keyAdvantages.map((adv, i) => (
							<li key={i} className="copilot-et-adv-item">
								<CheckCircle2
									size={13}
									className="text-[var(--teal)] flex-shrink-0 mt-0.5"
								/>
								<span>{adv}</span>
							</li>
						))}
					</ul>

					{/* 1-Click Apply Tier Action Button */}
					<button
						type="button"
						onClick={handleApply}
						className={`copilot-et-apply-btn ${appliedTierKey === currentTierKey ? "applied" : ""}`}
						title={`Утвердить ${activeTierObj.tierName} в качестве активного плана лечения`}
					>
						{appliedTierKey === currentTierKey ? (
							<>
								<CheckCircle2 size={16} />
								<span>
									Тариф «{activeTierObj.tierName}» утверждён в план лечения
								</span>
							</>
						) : (
							<>
								<Check size={16} />
								<span>Выбрать вариант • Применить тариф в план лечения</span>
							</>
						)}
					</button>
				</div>
			)}
		</div>
	);
};

// ============================================================================
// 5. CopilotReactTracker COMPONENT (Animated ReAct Execution Cycle)
// ============================================================================

