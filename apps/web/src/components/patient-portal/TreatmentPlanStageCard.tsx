/**
 * DENTE CRM — Patient-Friendly Treatment Plan Stage Card (Anti-Anxiety & Transparency)
 * (DOMAIN: PATIENT PORTAL & CLINICAL TRANSPARENCY)
 *
 * Features:
 * - Prominent human-friendly title + statutory Order 804n code
 * - Transparent "Все включено" (All Inclusive) cost breakdown: 0 ₽ for anesthesia, RVG scans, cofferdam isolation
 * - Anti-fear / Painless Care Guarantee badge (аппликационный гель, бесшумный наконечник, коффердам)
 * - Stage warranty obligation badge (1–2 years for fillings/therapy, 2–5 years for crowns/prosthetics)
 * - Plain-Russian procedure explanation reducing patient anxiety ("Что вы почувствуете")
 * - 1-Click SBP Stage Payment button
 */

import {
	Check,
	CheckCircle2,
	Clock,
	CreditCard,
	FileText,
	Heart,
	HelpCircle,
	Info,
	Shield,
	ShieldCheck,
	Smile,
	Sparkles,
	Zap,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { formatRubles } from "../portal/patientCabinet/patientCabinetEngine.js";

export interface DualServiceItem {
	readonly code804n: string;
	readonly humanTitleRu: string;
	readonly technicalTitleRu: string;
	readonly explanationRu?: string | undefined;
	readonly sensationRu?: string | undefined;
	readonly quantity: number;
	readonly priceRub: number;
	readonly totalRub: number;
	readonly toothFdi?: string | undefined;
	readonly isAllInclusive?: boolean | undefined;
}

export interface PatientTreatmentStageProps {
	readonly stage: {
		readonly id: string;
		readonly orderIndex: number;
		readonly titleRu: string;
		readonly categoryRu?: string | undefined;
		readonly teethFdi: readonly string[];
		readonly costRub: number;
		readonly status: "completed" | "in_progress" | "planned";
		readonly procedures: readonly string[];
		readonly targetDateRu?: string | undefined;
		readonly warrantyMonths?: number | undefined;
		readonly durationMinutes?: number | undefined;
	};
	readonly onPaySbp?: (() => void) | undefined;
	readonly showDetailedBreakdown?: boolean | undefined;
}

export interface DualServiceFormatResult {
	readonly humanTitleRu: string;
	readonly statutoryCode804n: string;
	readonly explanationRu: string;
	readonly sensationRu: string;
	readonly defaultWarrantyRu: string;
}

/**
 * Maps statutory Ministry of Health 804n nomenclature codes and dental jargon
 * into clear, transparent, and reassuring Russian terms for patients.
 */
export function formatDualServiceName(code: string, rawTitle: string): DualServiceFormatResult {
	const lower = rawTitle.toLowerCase();

	// 1. Caries & Fillings
	if (code.startsWith("A16.07.002") || lower.includes("пломб") || lower.includes("кариес") || lower.includes("реставрац")) {
		return {
			humanTitleRu: "Лечение кариеса и светоотверждаемая пломба",
			statutoryCode804n: code || "A16.07.002.001",
			explanationRu: "Бережное удаление кариеса, антисептическая обработка и восстановление анатомической формы зуба прочным нанокомпозитом.",
			sensationRu: "100% безболезненно: глубокая анестезия за 90 сек, легкая вибрация без давления.",
			defaultWarrantyRu: "Гарантия 1–2 года",
		};
	}

	// 2. Root Canals & Endodontics / Pulpitis / Periodontitis
	if (code.startsWith("A16.07.004") || lower.includes("канал") || lower.includes("пульпит") || lower.includes("периодонтит") || lower.includes("эндодонт")) {
		return {
			humanTitleRu: "Лечение корневых каналов под микроскопом",
			statutoryCode804n: code || "A16.07.004.001",
			explanationRu: "Высокоточное 3D-очищение и герметичное пломбирование каналов зуба под дентальным микроскопом с контролем визиографа.",
			sensationRu: "Полный покой: изоляция коффердамом позволяет свободно сглатывать и дышать.",
			defaultWarrantyRu: "Диспансерное наблюдение 1 год",
		};
	}

	// 3. Crowns & Orthopedics / Zirconia / E.max
	if (code.startsWith("A16.07.006") || lower.includes("коронк") || lower.includes("циркони") || lower.includes("e.max") || lower.includes("металлокерам")) {
		return {
			humanTitleRu: "Установка эстетической коронки (диоксид циркония / E.max)",
			statutoryCode804n: code || "A16.07.006.001",
			explanationRu: "Изготовление и постоянная фиксация сверхпрочной монолитной коронки, точно повторяющей цвет и анатомию естественного зуба.",
			sensationRu: "Комфортная примерка: врач тщательно проверяет прикус до микрометров.",
			defaultWarrantyRu: "Гарантия 2–5 лет",
		};
	}

	// 4. Veneers & Esthetics
	if (code.startsWith("A16.07.003") || lower.includes("винир") || lower.includes("люминир") || lower.includes("накладк")) {
		return {
			humanTitleRu: "Керамический винир E.max (индивидуальная эстетика)",
			statutoryCode804n: code || "A16.07.003",
			explanationRu: "Тончайшая керамическая пластинка для создания безупречной зоны улыбки, исправления формы и цвета зуба.",
			sensationRu: "Бережная микро-обработка в пределах эмали, полное сохранение витальности зуба.",
			defaultWarrantyRu: "Гарантия 2–5 лет",
		};
	}

	// 5. Implants & Surgery
	if (code.startsWith("A16.07.054") || lower.includes("имплант") || lower.includes("dentium") || lower.includes("straumann") || lower.includes("osstem")) {
		return {
			humanTitleRu: "Установка дентального имплантата под ключ",
			statutoryCode804n: code || "A16.07.054",
			explanationRu: "Установка премиального титанового имплантата с пожизненной гарантией производителя по 3D-навигационному шаблону.",
			sensationRu: "Быстрее, чем лечение кариеса: установка занимает 15–20 мин без малейшей боли.",
			defaultWarrantyRu: "Пожизненная гарантия на титан + 3 года на работу",
		};
	}

	// 6. Professional Hygiene & Air-Flow
	if (code.startsWith("A16.07.051") || lower.includes("гигиен") || lower.includes("air-flow") || lower.includes("чистк") || lower.includes("ультразвук")) {
		return {
			humanTitleRu: "Комплексная гигиена (УЗ + Air-Flow + реминерализация)",
			statutoryCode804n: code || "A16.07.051",
			explanationRu: "Удаление твердого зубного камня ультразвуком, снятие мягкого налета порошком Air-Flow и укрепление эмали фторлаком.",
			sensationRu: "Освежающая спа-процедура для зубов с мягким ягодным/мятным вкусом порошка.",
			defaultWarrantyRu: "Рекомендованный интервал 6 мес.",
		};
	}

	// 7. Extractions
	if (code.startsWith("A16.07.001") || lower.includes("удален") || lower.includes("экстракц") || lower.includes("мудрост")) {
		return {
			humanTitleRu: "Атравматичное удаление зуба с сохранением костной ткани",
			statutoryCode804n: code || "A16.07.001",
			explanationRu: "Безболезненное извлечение зуба с бережным сохранением лунки и костных стенок для комфортного заживления.",
			sensationRu: "Глубокая анестезия: чувствуется только легкое покачивание, без острой боли.",
			defaultWarrantyRu: "Бесплатный контрольный осмотр",
		};
	}

	// 8. Inlays / Onlays
	if (code.startsWith("A16.07.005") || lower.includes("вкладк")) {
		return {
			humanTitleRu: "Керамическая культевая / восстановительная вкладка",
			statutoryCode804n: code || "A16.07.005",
			explanationRu: "Лабораторная керамическая микро-вставка для восстановления сильно разрушенного зуба перед установкой коронки.",
			sensationRu: "Полная защита зуба от раскалывания при жевании.",
			defaultWarrantyRu: "Гарантия 2 года",
		};
	}

	return {
		humanTitleRu: rawTitle,
		statutoryCode804n: code || "Номенклатура МЗ РФ 804н",
		explanationRu: "Медицинская манипуляция по клиническим протоколам СтАР и Минздрава РФ.",
		sensationRu: "Процедура выполняется под индивидуально подобранной анестезией.",
		defaultWarrantyRu: "Гарантия клиники DENTE",
	};
}

export const TreatmentPlanStageCard: React.FC<PatientTreatmentStageProps> = ({
	stage,
	onPaySbp,
	showDetailedBreakdown = true,
}) => {
	const isCompleted = stage.status === "completed";
	const isInProgress = stage.status === "in_progress";

	// Determine warranty label
	const warrantyText = stage.warrantyMonths
		? `Гарантия ${Math.round(stage.warrantyMonths / 12)} ${stage.warrantyMonths >= 24 ? "года" : "год"} (${stage.warrantyMonths} мес.)`
		: stage.titleRu.toLowerCase().includes("коронк") || stage.titleRu.toLowerCase().includes("ортопед")
			? "Гарантия 2–5 лет"
			: stage.titleRu.toLowerCase().includes("имплант")
				? "Пожизненная гарантия на титан"
				: "Гарантия 1–2 года";

	const estimatedDuration = stage.durationMinutes || (stage.titleRu.toLowerCase().includes("имплант") ? 45 : 60);

	return (
		<div
			className="treatment-plan-stage-card"
			data-testid={`stage-card-${stage.id}`}
			style={{
				padding: "16px",
				borderRadius: "12px",
				backgroundColor: "var(--pc-surface, #1e293b)",
				border: `1.5px solid ${isCompleted ? "var(--pc-success, #10b981)" : isInProgress ? "var(--pc-warning, #f59e0b)" : "var(--pc-border, #334155)"}`,
				display: "flex",
				flexDirection: "column",
				gap: "12px",
				transition: "all 0.2s ease",
				boxShadow: isInProgress ? "0 4px 12px rgba(245, 158, 11, 0.15)" : "none",
			}}
		>
			{/* Stage Header */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
				<div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: 1, minWidth: "220px" }}>
					<span
						style={{
							width: "30px",
							height: "30px",
							minWidth: "30px",
							borderRadius: "50%",
							backgroundColor: isCompleted ? "var(--pc-success, #10b981)" : isInProgress ? "var(--pc-warning, #f59e0b)" : "var(--muted, #475569)",
							color: "var(--on-teal, #ffffff)",
							fontWeight: 800,
							fontSize: "13px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
						}}
					>
						{isCompleted ? <Check size={16} strokeWidth={3} /> : stage.orderIndex}
					</span>

					<div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
							<strong style={{ fontSize: "15px", color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
								{stage.titleRu}
							</strong>
							<span
								className={`pc-status-badge ${isCompleted ? "paid" : isInProgress ? "unpaid" : ""}`}
								style={{ fontSize: "11px", padding: "2px 8px" }}
							>
								{isCompleted ? "Завершен" : isInProgress ? "В процессе лечения" : "Запланирован"}
							</span>
						</div>

						{stage.teethFdi.length > 0 && (
							<div style={{ fontSize: "12px", color: "var(--pc-primary, #0d9488)", fontWeight: 600 }}>
								Область лечения: зубы № {stage.teethFdi.join(", ")}
							</div>
						)}

						<div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", fontSize: "11px", color: "var(--pc-text-muted, #94a3b8)" }}>
							{stage.targetDateRu && (
								<span>Ориентировочный срок: <strong>{stage.targetDateRu}</strong></span>
							)}
							<span>&bull;</span>
							<span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
								<Clock size={12} />
								<span>Время в кресле: ~{estimatedDuration} мин</span>
							</span>
						</div>
					</div>
				</div>

				{/* Price & Payment Action */}
				<div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
					<div style={{ textAlign: "right" }}>
						<span style={{ fontSize: "17px", fontWeight: 800, color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
							{formatRubles(stage.costRub)}
						</span>
						<div style={{ fontSize: "11px", color: "var(--pc-success, #10b981)", fontWeight: 600 }}>
							Фиксированная цена
						</div>
					</div>

					{!isCompleted && onPaySbp && (
						<button
							type="button"
							onClick={onPaySbp}
							data-testid={`pay-stage-btn-${stage.id}`}
							style={{
								padding: "10px 16px",
								minHeight: "44px",
								borderRadius: "8px",
								border: "none",
								backgroundColor: "var(--pc-primary, #0d9488)",
								color: "var(--on-teal, #ffffff)",
								fontSize: "13px",
								fontWeight: 700,
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								gap: "6px",
								touchAction: "manipulation",
								boxShadow: "0 2px 6px rgba(13, 148, 136, 0.3)",
							}}
						>
							<CreditCard size={16} />
							<span>Оплатить СБП</span>
						</button>
					)}
				</div>
			</div>

			{/* All-Inclusive & Anti-Pain Guarantee Banner */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "6px",
					backgroundColor: "rgba(13, 148, 136, 0.08)",
					border: "1px solid rgba(13, 148, 136, 0.25)",
					borderRadius: "8px",
					padding: "8px 12px",
					fontSize: "12px",
					color: "var(--pc-text-main, var(--ink, #0f172a))",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--pc-primary, #0d9488)", fontWeight: 700 }}>
						<ShieldCheck size={16} />
						<span>Всё включено (без доплат на кассе):</span>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--pc-success, #10b981)", fontWeight: 700, fontSize: "11px" }}>
						<Sparkles size={13} />
						<span>{warrantyText}</span>
					</div>
				</div>

				<div style={{ display: "flex", flexWrap: "wrap", gap: "10px", fontSize: "11px", color: "var(--pc-text-muted, #94a3b8)" }}>
					<span>✓ Аппликационный гель (0% боли от укола)</span>
					<span>✓ Анестезия Septanest (0 ₽ • включено)</span>
					<span>✓ Снимки визиографа RVG (0 ₽ • включено)</span>
					<span>✓ Изоляция коффердамом (0 ₽ • включено)</span>
					<span>✓ Шлифовка и полировка (0 ₽ • включено)</span>
				</div>
			</div>

			{/* Procedures list with human explanations & sensation guidance */}
			{showDetailedBreakdown && (
				<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
					{stage.procedures.map((proc, pIdx) => {
						const dual = formatDualServiceName(`A16.07.00${pIdx + 1}`, proc);
						return (
							<div
								key={pIdx}
								style={{
									padding: "10px 12px",
									backgroundColor: "var(--pc-bg, #0f172a)",
									borderRadius: "8px",
									border: "1px solid var(--pc-border, #334155)",
									display: "flex",
									flexDirection: "column",
									gap: "4px",
								}}
							>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
									<div style={{ fontSize: "13px", fontWeight: 700, color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
										{dual.humanTitleRu}
									</div>
								</div>

								<div style={{ fontSize: "11px", color: "var(--pc-text-muted, #94a3b8)", lineHeight: "1.4" }}>
									{dual.explanationRu}
								</div>

								{/* Reassuring sensation guidance reducing anxiety */}
								<div
									style={{
										fontSize: "11px",
										color: "var(--pc-primary, #0d9488)",
										display: "flex",
										alignItems: "center",
										gap: "4px",
										marginTop: "2px",
									}}
								>
									<Smile size={13} style={{ flexShrink: 0 }} />
									<span><strong>Ощущения:</strong> {dual.sensationRu}</span>
								</div>

								<div style={{ fontSize: "10px", color: "var(--pc-text-muted, #64748b)", marginTop: "2px" }}>
									Минздрав 804н: {dual.statutoryCode804n} &bull; {proc}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default TreatmentPlanStageCard;
