import React, { useState, useMemo } from "react";
import {
  Check,
  CheckCircle2,
  Layers,
  ShieldCheck,
} from "lucide-react";
import type { EstimateTierCardProps, EstimateTierOption } from "./types";
import { useVisitStore } from "../../../store/visitStore";
import { formatMoney } from "../useCopilotFormat";
import { EstimateTierComparatorStrip } from "./estimate/EstimateTierComparatorStrip";
import { EstimateTierPerksGrid } from "./estimate/EstimateTierPerksGrid";
import { EstimateTierStagesList } from "./estimate/EstimateTierStagesList";

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
			<EstimateTierComparatorStrip
				tiers={tiers}
				currentTierKey={currentTierKey}
				onSelectTier={handleTierSwitch}
			/>

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
					<EstimateTierPerksGrid activeTierObj={activeTierObj} />

					{/* Warranty & Materials */}
					<div className="copilot-et-materials">
						<div className="font-semibold text-[var(--ink)] mb-1 flex items-center gap-1.5">
							<ShieldCheck size={13} className="text-[var(--teal)]" />
							<span>{activeTierObj.warrantyDescription}</span>
						</div>
						<div>{activeTierObj.materialsDescription}</div>
					</div>

					{/* Stages Breakdown & Key Advantages */}
					<EstimateTierStagesList activeTierObj={activeTierObj} />

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
