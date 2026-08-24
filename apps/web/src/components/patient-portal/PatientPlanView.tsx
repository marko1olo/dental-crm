/**
 * DENTE CRM — Patient Treatment Plan View (Mobile-First 375px+ Responsive)
 * (DOMAIN: PATIENT PORTAL & CLINICAL TRANSPARENCY)
 *
 * Designed from the patient's perspective on a smartphone (375x667 – 390x844):
 * - Crystal clear progress bar: "Выполнено X из Y этапов • Оплачено: Z ₽ • Остаток: N ₽"
 * - Anti-hidden-fee guarantee: "Все включено" (анестезия, снимки, изоляция, полировка 0 ₽)
 * - 3-Tier Treatment Plan comparison (Базовый / Стандарт / Премиум)
 * - Interactive 2D Tooth Chart with clear human explanations
 * - Comprehensive Clinic Guarantee Obligations (1–2 года на пломбы, 2–5 лет на коронки, пожизненно на импланты)
 * - Emergency SOS & WhatsApp hotline for post-treatment pain with self-triage instructions
 * - 1-Click SBP Stage Payment
 */

import {
	AlertCircle,
	AlertTriangle,
	Award,
	Calendar,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	CreditCard,
	DollarSign,
	ExternalLink,
	Heart,
	HelpCircle,
	Info,
	MessageCircle,
	MessageSquare,
	Phone,
	PhoneCall,
	QrCode,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Zap,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import {
	formatRubles,
	formatRussianDateIso,
	type PatientTreatmentPlan,
	type ThreeTierTreatmentPlanModel,
	type TreatmentPlanStage,
	type TreatmentPlanTier,
} from "../portal/patientCabinet/patientCabinetEngine.js";
import { PatientFriendlyOdontogram, type PatientToothInfo } from "./PatientFriendlyOdontogram.js";
import { TreatmentPlanStageCard } from "./TreatmentPlanStageCard.js";

export interface PatientPlanViewProps {
	readonly plan?: PatientTreatmentPlan | undefined;
	readonly threeTierModel?: ThreeTierTreatmentPlanModel | undefined;
	readonly patientName?: string | undefined;
	readonly cardNumber?: string | undefined;
	readonly phone?: string | undefined;
	readonly onPayStageSbp?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onBookAppointment?: (() => void) | undefined;
	readonly emergencyPhone?: string | undefined;
	readonly emergencyWhatsappNumber?: string | undefined;
}

export const CLINIC_GUARANTEE_ITEMS = [
	{
		id: "fillings",
		titleRu: "Светоотверждаемые пломбы и эстетические реставрации",
		materialsRu: "Estelite Asteria (Япония), Harmonize (США), Filtek Ultimate",
		warrantyPeriodRu: "1–2 года (12–24 мес.)",
		badgeColor: "#10b981",
		termsRu: "Полная бесплатная коррекция или замена пломбы при нарушении краевого прилегания или сколе.",
	},
	{
		id: "crowns",
		titleRu: "Коронки, виниры и вкладки из диоксида циркония и керамики E.max",
		materialsRu: "IPS e.max CAD (Ivoclar), Katana Zirconia HTML (Kuraray)",
		warrantyPeriodRu: "2–5 лет (24–60 мес.)",
		badgeColor: "#0d9488",
		termsRu: "Гарантия на целостность ортопедической конструкции, анатомическое прилегание и цветовую стойкость.",
	},
	{
		id: "implants",
		titleRu: "Дентальная имплантация под ключ",
		materialsRu: "Dentium SuperLine (Южная Корея), Straumann BLX (Швейцария)",
		warrantyPeriodRu: "Пожизненная гарантия на титан + 3 года на работу",
		badgeColor: "#6366f1",
		termsRu: "Пожизненная замена имплантата производителем при неприживлении. Бесплатная повторная установка хирургом.",
	},
	{
		id: "endodontics",
		titleRu: "Лечение и перелечивание корневых каналов под микроскопом",
		materialsRu: "Герметизация биокерамическим силером BioRoot RCS + гуттаперча",
		warrantyPeriodRu: "1 год диспансерного наблюдения",
		badgeColor: "#f59e0b",
		termsRu: "Динамический рентген-контроль через 6 и 12 месяцев. В случае сохранения периапикального очага — бесплатное консилиумное ведение.",
	},
] as const;

export const POST_TREATMENT_TRIAGE_FAQ = [
	{
		id: "normal_sensations",
		isEmergency: false,
		titleRu: "🟢 Что является нормой после лечения (не требует паники):",
		pointsRu: [
			"Умеренная ноющая чувствительность при накусывании в течение 1–3 дней после пломбирования каналов или глубокого кариеса.",
			"Легкая болезненность в месте укола анестезии до 24–48 часов.",
			"Небольшой отек десны после сложного удаления зуба или имплантации (пик на 2–3 сутки, затем идет на спад).",
			"Рекомендация: принять Ибупрофен 400 мг или Нимесил (после еды) по назначению врача.",
		],
	},
	{
		id: "urgent_symptoms",
		isEmergency: true,
		titleRu: "🚨 Повод срочно связаться с дежурным врачом:",
		pointsRu: [
			"Острая пульсирующая или нарастающая боль, не снимаемая обезболивающими более 2 часов.",
			"Быстро нарастающий отек щеки, губы или подчелюстной области, затруднение открывания рта или глотания.",
			"Повышение температуры тела выше 37.8 °C.",
			"Кровотечение из лунки удаленного зуба, продолжающееся более 30–40 минут после наложения марлевого тампона.",
			"Чувство онемения губы или языка, сохраняющееся дольше 8–10 часов после анестезии.",
		],
	},
] as const;

export const PatientPlanView: React.FC<PatientPlanViewProps> = ({
	plan,
	threeTierModel,
	patientName = "Пациент",
	cardNumber = "10492",
	phone = "+7 (999) 000-00-00",
	onPayStageSbp,
	onBookAppointment,
	emergencyPhone = "+7 (800) 555-35-35",
	emergencyWhatsappNumber = "79991234567",
}) => {
	// Selected Tier Tab (Basic / Standard / Premium)
	const [selectedTierId, setSelectedTierId] = useState<"basic" | "standard" | "premium">(
		threeTierModel?.selectedTier || "standard",
	);

	// FAQ Accordion expansion
	const [expandedFaqId, setExpandedFaqId] = useState<string | null>("urgent_symptoms");

	// Active treatment stages derived from 3-Tier model or direct plan
	const activeStages: readonly TreatmentPlanStage[] = useMemo(() => {
		if (threeTierModel) {
			const tier = threeTierModel.tiers.find((t) => t.tierId === selectedTierId);
			if (tier?.stages && tier.stages.length > 0) {
				return tier.stages;
			}
		}
		if (plan?.stages && plan.stages.length > 0) {
			return plan.stages;
		}
		return [];
	}, [threeTierModel, selectedTierId, plan]);

	// Total and Paid calculations
	const stagesCount = activeStages.length;
	const completedStagesCount = activeStages.filter((s) => s.status === "completed").length;
	const inProgressStagesCount = activeStages.filter((s) => s.status === "in_progress").length;

	const totalCostRub = useMemo(() => {
		if (threeTierModel) {
			const tier = threeTierModel.tiers.find((t) => t.tierId === selectedTierId);
			if (tier) return tier.totalCostRub;
		}
		if (plan?.totalCostRub) return plan.totalCostRub;
		return activeStages.reduce((sum, s) => sum + s.costRub, 0);
	}, [threeTierModel, selectedTierId, plan, activeStages]);

	const paidCostRub = useMemo(() => {
		if (plan?.paidCostRub !== undefined) return plan.paidCostRub;
		return activeStages
			.filter((s) => s.status === "completed")
			.reduce((sum, s) => sum + s.costRub, 0);
	}, [plan, activeStages]);

	const remainingCostRub = Math.max(0, totalCostRub - paidCostRub);
	const progressPercent = stagesCount > 0 ? Math.round((completedStagesCount / stagesCount) * 100) : 0;

	// WhatsApp pre-filled emergency URL
	const whatsappUrl = useMemo(() => {
		const cleanNumber = emergencyWhatsappNumber.replace(/\D/g, "");
		const text = encodeURIComponent(
			`Здравствуйте! Я пациент клиники DENTE (${patientName}, карта № ${cardNumber}). После недавнего лечения у меня возникли болезненные ощущения / вопросы. Проконсультируйте, пожалуйста, дежурного врача.`,
		);
		return `https://wa.me/${cleanNumber}?text=${text}`;
	}, [emergencyWhatsappNumber, patientName, cardNumber]);

	return (
		<div
			className="patient-plan-view-container"
			data-testid="patient-plan-view"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "18px",
				width: "100%",
				maxWidth: "100%",
				boxSizing: "border-box",
			}}
		>
			{/* 1. EMERGENCY SOS & WHATSAPP BANNER (FOR POST-TREATMENT PAIN) */}
			<div
				className="pc-card emergency-hotline-card"
				data-testid="emergency-hotline-banner"
				style={{
					backgroundColor: "rgba(239, 68, 68, 0.08)",
					border: "1.5px solid var(--pc-danger, #ef4444)",
					borderRadius: "12px",
					padding: "14px 16px",
					display: "flex",
					flexDirection: "column",
					gap: "10px",
				}}
			>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						<div
							style={{
								width: "36px",
								height: "36px",
								borderRadius: "50%",
								backgroundColor: "var(--pc-danger, #ef4444)",
								color: "#ffffff",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
							}}
						>
							<ShieldAlert size={20} />
						</div>
						<div>
							<strong style={{ fontSize: "15px", color: "var(--pc-text-main, #f8fafc)" }}>
								Возникла боль или дискомфорт после приема?
							</strong>
							<p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)" }}>
								Круглосуточная прямая связь с дежурным врачом-стоматологом клиники DENTE:
							</p>
						</div>
					</div>

					<span
						style={{
							backgroundColor: "var(--pc-danger, #ef4444)",
							color: "#ffffff",
							fontSize: "11px",
							fontWeight: 800,
							padding: "3px 8px",
							borderRadius: "12px",
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<Zap size={12} />
						<span>24/7 Линия заботы</span>
					</span>
				</div>

				{/* Quick Contact Buttons */}
				<div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
					<a
						href={whatsappUrl}
						target="_blank"
						rel="noreferrer"
						data-testid="emergency-whatsapp-btn"
						style={{
							flex: 1,
							minWidth: "160px",
							minHeight: "44px",
							borderRadius: "8px",
							backgroundColor: "#25d366",
							color: "#ffffff",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "8px",
							fontWeight: 700,
							fontSize: "13px",
							textDecoration: "none",
							padding: "8px 16px",
							touchAction: "manipulation",
							boxShadow: "0 2px 8px rgba(37, 211, 102, 0.3)",
						}}
					>
						<MessageCircle size={18} />
						<span>Написать в WhatsApp дежурному</span>
					</a>

					<a
						href={`tel:${emergencyPhone.replace(/\D/g, "")}`}
						data-testid="emergency-phone-btn"
						style={{
							flex: 1,
							minWidth: "160px",
							minHeight: "44px",
							borderRadius: "8px",
							backgroundColor: "var(--pc-surface, #1e293b)",
							color: "var(--pc-text-main, #f8fafc)",
							border: "1px solid var(--pc-border, #334155)",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "8px",
							fontWeight: 700,
							fontSize: "13px",
							textDecoration: "none",
							padding: "8px 16px",
							touchAction: "manipulation",
						}}
					>
						<PhoneCall size={18} style={{ color: "var(--pc-danger, #ef4444)" }} />
						<span>Позвонить в клинику ({emergencyPhone})</span>
					</a>
				</div>
			</div>

			{/* 2. PROGRESS BAR & FINANCIAL SUMMARY (EXACT REQUIRED SPEC) */}
			<div
				className="pc-card plan-progress-hero-card"
				data-testid="treatment-plan-progress-hero"
				style={{
					backgroundColor: "var(--pc-surface, #1e293b)",
					border: "1.5px solid var(--pc-primary, #0d9488)",
					borderRadius: "12px",
					padding: "18px",
					display: "flex",
					flexDirection: "column",
					gap: "14px",
				}}
			>
				{/* Top progress header label */}
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "8px" }}>
					<div>
						<span style={{ fontSize: "12px", fontWeight: 700, color: "var(--pc-primary, #0d9488)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
							Текущий прогресс реабилитации
						</span>
						<h3 style={{ margin: "2px 0 0 0", fontSize: "16px", fontWeight: 800, color: "var(--pc-text-main, #f8fafc)" }}>
							{plan?.titleRu || "Комплексный план стоматологического лечения"}
						</h3>
					</div>

					<span
						style={{
							backgroundColor: "var(--pc-primary-light, rgba(13, 148, 136, 0.15))",
							color: "var(--pc-primary, #0d9488)",
							border: "1px solid var(--pc-primary, #0d9488)",
							padding: "4px 10px",
							borderRadius: "12px",
							fontWeight: 800,
							fontSize: "13px",
						}}
					>
						{progressPercent}% готово
					</span>
				</div>

				{/* Primary Metric Banner: "Выполнено X из Y этапов • Оплачено: Z ₽ • Остаток: N ₽" */}
				<div
					style={{
						backgroundColor: "var(--pc-bg, #0f172a)",
						border: "1px solid var(--pc-border, #334155)",
						borderRadius: "10px",
						padding: "12px 14px",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						flexWrap: "wrap",
						gap: "10px",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<CheckCircle2 size={20} style={{ color: "var(--pc-success, #10b981)" }} />
						<strong style={{ fontSize: "14px", color: "var(--pc-text-main, #f8fafc)" }}>
							Выполнено {completedStagesCount} из {stagesCount} этапов
						</strong>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", flexWrap: "wrap" }}>
						<span style={{ color: "var(--pc-success, #10b981)", fontWeight: 700 }}>
							Оплачено: {formatRubles(paidCostRub)}
						</span>
						<span style={{ color: "var(--pc-text-muted, #94a3b8)" }}>&bull;</span>
						<span style={{ color: remainingCostRub > 0 ? "var(--pc-warning, #f59e0b)" : "var(--pc-success, #10b981)", fontWeight: 700 }}>
							{remainingCostRub > 0 ? `Остаток: ${formatRubles(remainingCostRub)}` : "Полностью оплачен"}
						</span>
					</div>
				</div>

				{/* Stepped Progress Bar */}
				<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
					<div className="pc-progress-bar-bg" style={{ height: "12px", borderRadius: "6px" }}>
						<div
							className="pc-progress-bar-fill"
							style={{
								width: `${progressPercent}%`,
								backgroundColor: progressPercent === 100 ? "var(--pc-success, #10b981)" : "var(--pc-primary, #0d9488)",
								transition: "width 0.5s ease",
							}}
						/>
					</div>

					<div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--pc-text-muted, #94a3b8)" }}>
						<span>0% (Старт)</span>
						<span>Итоговая стоимость плана: <strong>{formatRubles(totalCostRub)}</strong></span>
						<span>100% (Финал)</span>
					</div>
				</div>

				{/* Anti-Hidden-Fee Transparency Badge */}
				<div
					style={{
						backgroundColor: "rgba(16, 185, 129, 0.08)",
						border: "1px solid rgba(16, 185, 129, 0.25)",
						borderRadius: "8px",
						padding: "10px 12px",
						display: "flex",
						alignItems: "flex-start",
						gap: "10px",
					}}
				>
					<ShieldCheck size={20} style={{ color: "var(--pc-success, #10b981)", flexShrink: 0, marginTop: "1px" }} />
					<div style={{ fontSize: "12px", color: "var(--pc-text-main, #f8fafc)", lineHeight: "1.4" }}>
						<strong style={{ color: "var(--pc-success, #10b981)" }}>Честная прозрачная цена «Под ключ»:</strong>{" "}
						Стоимость зафиксирована в плане лечения. В каждый этап уже включены: премиальная анестезия (Septanest), контрольные прицельные снимки визиографа (RVG), изоляция коффердамом и гарантийный сертификат. <strong>Никаких доплат на кассе клиники.</strong>
					</div>
				</div>
			</div>

			{/* 3. 3-TIER COMPARISON TABS (IF AVAILABLE) */}
			{threeTierModel && threeTierModel.tiers.length > 0 && (
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
						gap: "12px",
					}}
				>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
						<div>
							<h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--pc-text-main, #f8fafc)" }}>
								3 Варианта плана реабилитации (Выбор материалов)
							</h4>
							<p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)" }}>
								Сравните уровень эстетики, гарантии и используемых материалов:
							</p>
						</div>
					</div>

					<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px" }}>
						{threeTierModel.tiers.map((tier) => {
							const isSelected = selectedTierId === tier.tierId;
							return (
								<button
									key={tier.tierId}
									type="button"
									onClick={() => setSelectedTierId(tier.tierId)}
									data-testid={`plan-tier-btn-${tier.tierId}`}
									style={{
										padding: "12px",
										minHeight: "44px",
										borderRadius: "10px",
										border: `2px solid ${isSelected ? "var(--pc-primary, #0d9488)" : "var(--pc-border, #334155)"}`,
										backgroundColor: isSelected ? "var(--pc-primary-light, rgba(13, 148, 136, 0.15))" : "var(--pc-bg, #0f172a)",
										color: "var(--pc-text-main, #f8fafc)",
										textAlign: "left",
										cursor: "pointer",
										display: "flex",
										flexDirection: "column",
										gap: "4px",
										transition: "all 0.15s ease",
										touchAction: "manipulation",
									}}
								>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
										<strong style={{ fontSize: "13px", color: isSelected ? "var(--pc-primary, #0d9488)" : "inherit" }}>
											{tier.tierNameRu}
										</strong>
										{isSelected && <Check size={14} style={{ color: "var(--pc-primary, #0d9488)" }} />}
									</div>
									<span style={{ fontSize: "15px", fontWeight: 800 }}>
										{formatRubles(tier.totalCostRub)}
									</span>
									<span style={{ fontSize: "11px", color: "var(--pc-text-muted, #94a3b8)" }}>
										Гарантия: {tier.warrantyMonths} мес.
									</span>
								</button>
							);
						})}
					</div>

					{/* Tier Highlights */}
					{(() => {
						const curTier = threeTierModel.tiers.find((t) => t.tierId === selectedTierId);
						if (!curTier) return null;
						return (
							<div
								style={{
									backgroundColor: "var(--pc-bg, #0f172a)",
									border: "1px solid var(--pc-border, #334155)",
									borderRadius: "8px",
									padding: "10px 14px",
									fontSize: "12px",
								}}
							>
								<strong style={{ color: "var(--pc-primary, #0d9488)", display: "block", marginBottom: "4px" }}>
									Преимущества уровня {curTier.tierNameRu}:
								</strong>
								<ul style={{ margin: 0, paddingLeft: "18px", color: "var(--pc-text-main, #f8fafc)", display: "flex", flexDirection: "column", gap: "2px" }}>
									{curTier.benefits.map((b, bIdx) => (
										<li key={bIdx}>{b}</li>
									))}
								</ul>
							</div>
						);
					})()}
				</div>
			)}

			{/* 4. INTERACTIVE DENTAL ODONTOGRAM */}
			<div
				className="pc-card odontogram-container-card"
				data-testid="interactive-odontogram-card"
				style={{
					backgroundColor: "var(--pc-surface, #1e293b)",
					borderRadius: "12px",
					border: "1px solid var(--pc-border, #334155)",
					padding: "16px",
					display: "flex",
					flexDirection: "column",
					gap: "12px",
				}}
			>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
					<div>
						<h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--pc-text-main, #f8fafc)" }}>
							Интерактивная зубная формула пациента
						</h4>
						<p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)" }}>
							Нажмите на любой зуб для расшифровки диагноза, проведенного лечения и гарантийного сертификата:
						</p>
					</div>
				</div>

				<PatientFriendlyOdontogram />
			</div>

			{/* 5. STAGES LIST WITH TRANSPARENT CARDS */}
			<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "var(--pc-text-main, #f8fafc)" }}>
						Этапы лечения и онлайн-оплата ({activeStages.length})
					</h4>
					<span style={{ fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)" }}>
						СБП 0% комиссии
					</span>
				</div>

				{activeStages.map((stage) => (
					<TreatmentPlanStageCard
						key={stage.id}
						stage={stage}
						onPaySbp={onPayStageSbp ? () => onPayStageSbp(stage) : undefined}
					/>
				))}
			</div>

			{/* 6. CLINICAL WARRANTY OBLIGATIONS SECTION */}
			<div
				className="pc-card clinic-guarantee-section"
				data-testid="clinic-guarantee-section"
				style={{
					backgroundColor: "var(--pc-surface, #1e293b)",
					borderRadius: "12px",
					border: "1.5px solid var(--pc-border, #334155)",
					padding: "18px",
					display: "flex",
					flexDirection: "column",
					gap: "14px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<Award size={20} style={{ color: "var(--pc-primary, #0d9488)" }} />
						<h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "var(--pc-text-main, #f8fafc)" }}>
							Официальные гарантийные обязательства клиники DENTE
						</h4>
					</div>
					<span style={{ fontSize: "11px", color: "var(--pc-text-muted, #94a3b8)" }}>
						Закон РФ № 2300-1 • Положение СтАР
					</span>
				</div>

				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "10px" }}>
					{CLINIC_GUARANTEE_ITEMS.map((item) => (
						<div
							key={item.id}
							style={{
								backgroundColor: "var(--pc-bg, #0f172a)",
								border: "1px solid var(--pc-border, #334155)",
								borderRadius: "10px",
								padding: "12px 14px",
								display: "flex",
								flexDirection: "column",
								gap: "6px",
							}}
						>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
								<strong style={{ fontSize: "13px", color: "var(--pc-text-main, #f8fafc)" }}>
									{item.titleRu}
								</strong>
								<span
									style={{
										backgroundColor: "rgba(13, 148, 136, 0.15)",
										color: item.badgeColor,
										border: `1px solid ${item.badgeColor}`,
										padding: "2px 8px",
										borderRadius: "10px",
										fontSize: "11px",
										fontWeight: 800,
										whiteSpace: "nowrap",
									}}
								>
									{item.warrantyPeriodRu}
								</span>
							</div>

							<div style={{ fontSize: "11px", color: "var(--pc-primary, #0d9488)" }}>
								Материалы: {item.materialsRu}
							</div>

							<div style={{ fontSize: "11px", color: "var(--pc-text-muted, #94a3b8)", lineHeight: "1.4" }}>
								{item.termsRu}
							</div>
						</div>
					))}
				</div>

				{/* Warranty Terms Preservation Callout */}
				<div
					style={{
						backgroundColor: "var(--pc-bg, #0f172a)",
						borderRadius: "8px",
						padding: "10px 14px",
						fontSize: "12px",
						color: "var(--pc-text-muted, #94a3b8)",
						display: "flex",
						alignItems: "center",
						gap: "8px",
					}}
				>
					<Info size={16} style={{ color: "var(--pc-primary, #0d9488)", flexShrink: 0 }} />
					<span>
						<strong>Условие сохранения гарантии:</strong> Прохождение бесплатного контрольного осмотра и профгигиены у лечащего врача не реже 1 раза в 6 месяцев.
					</span>
				</div>
			</div>

			{/* 7. SELF-TRIAGE POST-TREATMENT PAIN FAQ */}
			<div
				className="pc-card triage-faq-card"
				data-testid="post-treatment-triage-faq"
				style={{
					backgroundColor: "var(--pc-surface, #1e293b)",
					borderRadius: "12px",
					border: "1px solid var(--pc-border, #334155)",
					padding: "16px",
					display: "flex",
					flexDirection: "column",
					gap: "10px",
				}}
			>
				<h4 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "var(--pc-text-main, #f8fafc)" }}>
					Памятка самоконтроля при боли после лечения
				</h4>

				<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
					{POST_TREATMENT_TRIAGE_FAQ.map((faq) => {
						const isExpanded = expandedFaqId === faq.id;
						return (
							<div
								key={faq.id}
								style={{
									backgroundColor: "var(--pc-bg, #0f172a)",
									border: `1px solid ${faq.isEmergency ? "rgba(239, 68, 68, 0.4)" : "var(--pc-border, #334155)"}`,
									borderRadius: "8px",
									overflow: "hidden",
								}}
							>
								<button
									type="button"
									onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
									style={{
										width: "100%",
										minHeight: "44px",
										padding: "10px 14px",
										backgroundColor: "transparent",
										border: "none",
										color: "var(--pc-text-main, #f8fafc)",
										textAlign: "left",
										cursor: "pointer",
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										fontWeight: 700,
										fontSize: "13px",
										touchAction: "manipulation",
									}}
								>
									<span>{faq.titleRu}</span>
									{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
								</button>

								{isExpanded && (
									<div style={{ padding: "0 14px 12px 14px", fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)" }}>
										<ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>
											{faq.pointsRu.map((p, idx) => (
												<li key={idx}>{p}</li>
											))}
										</ul>
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};
