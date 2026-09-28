/**
 * DENTE CRM — Patient Portal 3-Tier Treatment Plan Selector & Materials Matrix
 * (DOMAIN: PATIENT PORTAL & CLINICAL TRANSPARENCY)
 *
 * Compares Basic, Standard (Doctor's Choice), and Premium tiers with
 * transparent materials breakdown, warranty terms, and clinical benefits.
 */

import { Check, Sparkles } from "lucide-react";
import React from "react";
import {
	formatRubles,
	type ThreeTierTreatmentPlanModel,
} from "../patientCabinet/patientCabinetEngine.js";

export const DEFAULT_THREE_TIER_PLAN_MODEL: ThreeTierTreatmentPlanModel = {
	selectedTier: "standard",
	tiers: [
		{
			tierId: "basic",
			tierNameRu: "Базовый",
			subtitleRu: "Стандартная терапия и светоотверждаемый композит Filtek",
			totalCostRub: 58000,
			warrantyMonths: 12,
			durationWeeks: 2,
			benefits: [
				"Светоотверждаемый наногибридный композит Filtek Z250 (3M ESPE)",
				"Официальная гарантия клиники 1 год (12 месяцев)",
				"Стандартная анестезия Septanest без боли",
				"Эффективное устранение кариозных очагов и санация полости рта",
			],
			stages: [
				{
					id: "tier-basic-st1",
					orderIndex: 1,
					titleRu: "Этап 1: Комплексная профгигиена и снятие налета",
					categoryRu: "Гигиена",
					teethFdi: ["11-48"],
					costRub: 8000,
					status: "completed",
					procedures: ["Ультразвуковой скейлинг и полировка пастой"],
					targetDateRu: "Выполнен",
				},
				{
					id: "tier-basic-st2",
					orderIndex: 2,
					titleRu: "Этап 2: Терапевтическое лечение кариеса композитом Filtek",
					categoryRu: "Терапия",
					teethFdi: ["1.6", "2.5", "4.6"],
					costRub: 50000,
					status: "in_progress",
					procedures: ["Лечение кариеса и нанокомпозитная реставрация Filtek Z250"],
					targetDateRu: "В процессе",
				},
			],
		},
		{
			tierId: "standard",
			tierNameRu: "Оптимум (Выбор врача)",
			subtitleRu: "Премиальная эстетика, микроскоп 30x и диоксид циркония",
			totalCostRub: 135000,
			warrantyMonths: 36,
			durationWeeks: 4,
			benefits: [
				"Субмикрофильный японский нанокомпозит Estelite Asteria (эффект хамелеона)",
				"Монолитные коронки из диоксида циркония Katana HTML (Япония)",
				"Лечение каналов под дентальным микроскопом 30x",
				"Расширенная гарантия клиники 3 года (36 месяцев)",
				"Изоляция коффердамом и бестеневая оптика",
			],
			stages: [
				{
					id: "tier-std-st1",
					orderIndex: 1,
					titleRu: "Этап 1: Комплексная гигиена и реминерализация",
					categoryRu: "Гигиена",
					teethFdi: ["11-48"],
					costRub: 12000,
					status: "completed",
					procedures: ["Комплексная гигиена (УЗ + Air-Flow + реминерализация)"],
					targetDateRu: "Выполнен",
				},
				{
					id: "tier-std-st2",
					orderIndex: 2,
					titleRu: "Этап 2: Лечение каналов под микроскопом 30x и пломба Estelite",
					categoryRu: "Терапия",
					teethFdi: ["1.6", "2.5"],
					costRub: 55000,
					status: "in_progress",
					procedures: [
						"Лечение корневых каналов под микроскопом",
						"Лечение кариеса и светоотверждаемая пломба",
					],
					targetDateRu: "В процессе",
				},
				{
					id: "tier-std-st3",
					orderIndex: 3,
					titleRu: "Этап 3: Ортопедическое восстановление циркониевой коронкой",
					categoryRu: "Ортопедия",
					teethFdi: ["4.6"],
					costRub: 68000,
					status: "planned",
					procedures: ["Установка эстетической коронки (диоксид циркония / E.max)"],
					targetDateRu: "15.10.2026",
				},
			],
		},
		{
			tierId: "premium",
			tierNameRu: "Премиум",
			subtitleRu: "Керамика IPS e.max, имплантация Straumann и гарантия 5 лет",
			totalCostRub: 285000,
			warrantyMonths: 60,
			durationWeeks: 6,
			benefits: [
				"Ультратонкие цельнокерамические виниры и коронки IPS e.max CAD (Ivoclar)",
				"Премиальные швейцарские имплантаты Straumann BLX с гидрофильной поверхностью SLActive",
				"Максимальная официальная гарантия 5 лет + пожизненно на титановые имплантаты",
				"Индивидуальный персональный менеджер заботы 24/7",
				"Фотопротокол и цифровое моделирование улыбки Digital Smile Design",
			],
			stages: [
				{
					id: "tier-prem-st1",
					orderIndex: 1,
					titleRu: "Этап 1: SPA-профгигиена и отбеливание Flash",
					categoryRu: "Гигиена",
					teethFdi: ["11-48"],
					costRub: 25000,
					status: "completed",
					procedures: ["Комплексная гигиена (УЗ + Air-Flow + реминерализация)"],
					targetDateRu: "Выполнен",
				},
				{
					id: "tier-prem-st2",
					orderIndex: 2,
					titleRu: "Этап 2: Эндодонтия 3D под микроскопом и виниры IPS e.max",
					categoryRu: "Терапия",
					teethFdi: ["1.6", "2.5"],
					costRub: 110000,
					status: "in_progress",
					procedures: [
						"Лечение корневых каналов под микроскопом",
						"Керамический винир E.max (индивидуальная эстетика)",
					],
					targetDateRu: "В процессе",
				},
				{
					id: "tier-prem-st3",
					orderIndex: 3,
					titleRu: "Этап 3: Дентальная имплантация Straumann под ключ с коронкой E.max",
					categoryRu: "Хирургия",
					teethFdi: ["4.6"],
					costRub: 150000,
					status: "planned",
					procedures: [
						"Установка дентального имплантата под ключ",
						"Установка эстетической коронки (диоксид циркония / E.max)",
					],
					targetDateRu: "25.10.2026",
				},
			],
		},
	],
};

export interface PlanThreeTierSelectorProps {
	readonly threeTierModel: ThreeTierTreatmentPlanModel;
	readonly selectedTierId: "basic" | "standard" | "premium";
	readonly onSelectTier: (tierId: "basic" | "standard" | "premium") => void;
}

export const PlanThreeTierSelector: React.FC<PlanThreeTierSelectorProps> = ({
	threeTierModel,
	selectedTierId,
	onSelectTier,
}) => {
	const curTier = threeTierModel.tiers.find((t) => t.tierId === selectedTierId);

	return (
		<div
			className="pc-card three-tier-selector-card"
			data-testid="three-tier-selector"
			style={{
				backgroundColor: "var(--pc-surface, #1e293b)",
				borderRadius: "12px",
				border: "1px solid var(--pc-border, #334155)",
				padding: "16px",
				display: "flex",
				flexDirection: "column",
				gap: "14px",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: "8px",
				}}
			>
				<div>
					<h4
						style={{
							margin: 0,
							fontSize: "15px",
							fontWeight: 800,
							color: "var(--pc-text-main, var(--ink, #0f172a))",
						}}
					>
						3 Варианта плана реабилитации (Сравнение материалов и гарантии)
					</h4>
					<p
						style={{
							margin: "2px 0 0 0",
							fontSize: "12px",
							color: "var(--pc-text-muted, #94a3b8)",
						}}
					>
						Выберите подходящий уровень эстетики, биосовместимости и срока гарантийных обязательств:
					</p>
				</div>
			</div>

			{/* 3-Tier Switcher Buttons: [Базовый] | [Оптимум (Выбор врача)] | [Премиум] */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
					gap: "10px",
				}}
			>
				{threeTierModel.tiers.map((tier) => {
					const isSelected = selectedTierId === tier.tierId;
					const isDoctorChoice = tier.tierId === "standard";
					const tierDisplayName =
						tier.tierId === "standard" && !tier.tierNameRu.includes("Оптимум")
							? "Оптимум (Выбор врача)"
							: tier.tierNameRu;

					return (
						<button
							key={tier.tierId}
							type="button"
							onClick={() => onSelectTier(tier.tierId as "basic" | "standard" | "premium")}
							data-testid={`plan-tier-btn-${tier.tierId}`}
							style={{
								padding: "12px 14px",
								minHeight: "52px",
								borderRadius: "10px",
								border: `2px solid ${
									isSelected
										? "var(--pc-primary, #0d9488)"
										: isDoctorChoice
											? "rgba(13, 148, 136, 0.4)"
											: "var(--pc-border, #334155)"
								}`,
								backgroundColor: isSelected
									? "var(--pc-primary-light, rgba(13, 148, 136, 0.15))"
									: "var(--pc-surface, var(--paper-strong, #ffffff))",
								color: "var(--pc-text-main, var(--ink, #0f172a))",
								textAlign: "left",
								cursor: "pointer",
								display: "flex",
								flexDirection: "column",
								gap: "4px",
								transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
								touchAction: "manipulation",
								position: "relative",
								boxShadow: isSelected ? "0 0 12px rgba(13, 148, 136, 0.3)" : "none",
								transform: isSelected ? "scale(1.02)" : "scale(1)",
							}}
						>
							{isDoctorChoice && (
								<span
									style={{
										position: "absolute",
										top: "-9px",
										right: "8px",
										backgroundColor: "var(--pc-primary, #0d9488)",
										color: "var(--on-teal, #ffffff)",
										fontSize: "12px",
										fontWeight: 800,
										padding: "1px 6px",
										borderRadius: "8px",
										display: "inline-flex",
										alignItems: "center",
										gap: "3px",
										boxShadow: "0 2px 4px rgba(0, 0, 0, 0.25)",
									}}
								>
									<Sparkles size={10} />
									<span>Выбор врача</span>
								</span>
							)}

							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
								}}
							>
								<strong
									style={{
										fontSize: "13px",
										color: isSelected ? "var(--pc-primary, #0d9488)" : "inherit",
									}}
								>
									{tierDisplayName}
								</strong>
								{isSelected && (
									<Check
										size={16}
										strokeWidth={3}
										style={{ color: "var(--pc-primary, #0d9488)" }}
									/>
								)}
							</div>

							<span
								style={{
									fontSize: "16px",
									fontWeight: 800,
									color: "var(--pc-text-main, var(--ink, #0f172a))",
								}}
							>
								{formatRubles(tier.totalCostRub)}
							</span>

							<span
								style={{
									fontSize: "12px",
									color: isSelected
										? "var(--pc-success, #10b981)"
										: "var(--pc-text-muted, #94a3b8)",
									fontWeight: 700,
								}}
							>
								Гарантия: {tier.warrantyMonths} мес.
							</span>
						</button>
					);
				})}
			</div>

			{/* 3-Tier Materials & Warranty Comparison Matrix */}
			<div
				className="three-tier-comparison-matrix"
				data-testid="three-tier-materials-comparison"
				style={{
					backgroundColor: "var(--pc-surface, var(--paper-strong, #ffffff))",
					border: "1px solid var(--pc-border, #334155)",
					borderRadius: "10px",
					padding: "12px 14px",
					display: "flex",
					flexDirection: "column",
					gap: "10px",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						flexWrap: "wrap",
						gap: "6px",
					}}
				>
					<strong
						style={{
							fontSize: "13px",
							color: "var(--pc-primary, #0d9488)",
						}}
					>
						Сравнение используемых материалов и гарантии (Текущий выбор):
					</strong>
					<span
						style={{
							fontSize: "12px",
							color: "var(--pc-text-muted, #94a3b8)",
						}}
					>
						Закон РФ № 2300-1 &bull; Положение СтАР
					</span>
				</div>

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
						gap: "8px",
						fontSize: "12px",
					}}
				>
					<div
						style={{
							padding: "8px 10px",
							borderRadius: "6px",
							backgroundColor: "rgba(255, 255, 255, 0.02)",
							border: "1px solid var(--pc-border, #334155)",
						}}
					>
						<div style={{ color: "var(--pc-text-muted, #94a3b8)", fontSize: "12px" }}>
							Материалы пломб / реставраций:
						</div>
						<strong style={{ color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
							{selectedTierId === "basic" && "Нанокомпозит Filtek Z250 (3M ESPE)"}
							{selectedTierId === "standard" && "Субмикрофил Estelite Asteria (Tokuyama, Япония)"}
							{selectedTierId === "premium" && "Ультратонкие керамические виниры IPS e.max CAD"}
						</strong>
					</div>

					<div
						style={{
							padding: "8px 10px",
							borderRadius: "6px",
							backgroundColor: "rgba(255, 255, 255, 0.02)",
							border: "1px solid var(--pc-border, #334155)",
						}}
					>
						<div style={{ color: "var(--pc-text-muted, #94a3b8)", fontSize: "12px" }}>
							Официальный срок гарантии:
						</div>
						<strong style={{ color: "var(--pc-success, #10b981)" }}>
							{selectedTierId === "basic" && "1 год (12 месяцев)"}
							{selectedTierId === "standard" && "3 года (36 месяцев)"}
							{selectedTierId === "premium" && "5 лет на ортопедию + пожизненно на титан"}
						</strong>
					</div>

					<div
						style={{
							padding: "8px 10px",
							borderRadius: "6px",
							backgroundColor: "rgba(255, 255, 255, 0.02)",
							border: "1px solid var(--pc-border, #334155)",
						}}
					>
						<div style={{ color: "var(--pc-text-muted, #94a3b8)", fontSize: "12px" }}>
							Ортопедические конструкции:
						</div>
						<strong style={{ color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
							{selectedTierId === "basic" && "Металлокерамика на Co-Cr каркасе"}
							{selectedTierId === "standard" && "Монолитный диоксид циркония Katana HTML"}
							{selectedTierId === "premium" && "Бескаркасная керамика E.max CAD / Straumann"}
						</strong>
					</div>
				</div>
			</div>

			{/* Tier Highlights */}
			{curTier && (
				<div
					style={{
						backgroundColor: "var(--pc-surface, var(--paper-strong, #ffffff))",
						border: "1px solid var(--pc-border, #334155)",
						borderRadius: "8px",
						padding: "10px 14px",
						fontSize: "12px",
					}}
				>
					<strong
						style={{
							color: "var(--pc-primary, #0d9488)",
							display: "block",
							marginBottom: "4px",
						}}
					>
						Ключевые преимущества плана ({curTier.tierNameRu}):
					</strong>
					<ul
						style={{
							margin: 0,
							paddingLeft: "18px",
							color: "var(--pc-text-main, var(--ink, #0f172a))",
							display: "flex",
							flexDirection: "column",
							gap: "3px",
						}}
					>
						{curTier.benefits.map((b, bIdx) => (
							<li key={bIdx}>{b}</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
};

export const PatientPlanThreeTierSelector = PlanThreeTierSelector;
export default PlanThreeTierSelector;
