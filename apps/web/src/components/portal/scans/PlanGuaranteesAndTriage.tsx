/**
 * DENTE CRM — Patient Portal Guarantees, Comfort Standards & Post-Treatment Triage FAQ
 * (DOMAIN: PATIENT PORTAL & CLINICAL TRANSPARENCY)
 *
 * Encapsulates official clinic guarantee obligations, gentle painless care standards,
 * and emergency postoperative triage guide.
 */

import { Award, ChevronDown, ChevronUp, Heart, Info } from "lucide-react";
import React, { useState } from "react";

export const CLINIC_GUARANTEE_ITEMS = [
	{
		id: "fillings",
		titleRu: "Светоотверждаемые пломбы и эстетические реставрации",
		materialsRu: "Estelite Asteria (Япония), Harmonize (США), Filtek Ultimate",
		warrantyPeriodRu: "1–2 года (12–24 мес.)",
		badgeColor: "var(--ok-fg, #10b981)",
		termsRu: "Полная бесплатная коррекция или замена пломбы при нарушении краевого прилегания или сколе.",
	},
	{
		id: "crowns",
		titleRu: "Коронки, виниры и вкладки из диоксида циркония и керамики E.max",
		materialsRu: "IPS e.max CAD (Ivoclar), Katana Zirconia HTML (Kuraray)",
		warrantyPeriodRu: "2–5 лет (24–60 мес.)",
		badgeColor: "var(--teal, #0d9488)",
		termsRu: "Гарантия на целостность ортопедической конструкции, анатомическое прилегание и цветовую стойкость.",
	},
	{
		id: "implants",
		titleRu: "Дентальная имплантация под ключ",
		materialsRu: "Dentium SuperLine (Южная Корея), Straumann BLX (Швейцария)",
		warrantyPeriodRu: "Пожизненная гарантия на титан + 3 года на работу",
		badgeColor: "var(--info-fg, #6366f1)",
		termsRu: "Пожизненная замена имплантата производителем при неприживлении. Бесплатная повторная установка хирургом.",
	},
	{
		id: "endodontics",
		titleRu: "Лечение и перелечивание корневых каналов под микроскопом",
		materialsRu: "Герметизация биокерамическим силером BioRoot RCS + гуттаперча",
		warrantyPeriodRu: "1 год диспансерного наблюдения",
		badgeColor: "var(--warn-fg, #f59e0b)",
		termsRu: "Динамический рентген-контроль через 6 и 12 месяцев. В случае сохранения периапикального очага — бесплатное консилиумное ведение.",
	},
] as const;

export const POST_TREATMENT_TRIAGE_FAQ = [
	{
		id: "normal_sensations",
		isEmergency: false,
		titleRu: "Что является нормой после лечения (не требует паники):",
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
		titleRu: "Повод срочно связаться с дежурным врачом:",
		pointsRu: [
			"Острая пульсирующая или нарастающая боль, не снимаемая обезболивающими более 2 часов.",
			"Быстро нарастающий отек щеки, губы или подчелюстной области, затруднение открывания рта или глотания.",
			"Повышение температуры тела выше 37.8 °C.",
			"Кровотечение из лунки удаленного зуба, продолжающееся более 30–40 минут после наложения марлевого тампона.",
			"Чувство онемения губы или языка, сохраняющееся дольше 8–10 часов после анестезии.",
		],
	},
] as const;

export const PATIENT_COMFORT_STANDARDS = [
	{
		id: "no_needle_pain",
		titleRu: "Охлаждающий обезболивающий гель перед уколом (0 боли)",
		descriptionRu: "Перед уколом десна обрабатывается охлаждающим гелем со вкусом вишни или мяты. Момент укола совершенно не чувствуется.",
		iconColor: "var(--ok-fg, #10b981)",
		detailRu: "0 боли: деликатная аппликационная премедикация зоны вкола за 60 секунд.",
	},
	{
		id: "septanest_depth",
		titleRu: "Анестезия Septanest 100% глубина",
		descriptionRu: "Премиальный французский анестетик глубокого действия. Полное отключение болевых рецепторов зуба за 90 секунд.",
		iconColor: "var(--info-fg, #6366f1)",
		detailRu: "100% глубина обезболивания с индивидуальным расчетом дозировки по весу.",
	},
	{
		id: "total_control",
		titleRu: "Стоп-сигнал левой рукой в любой момент",
		descriptionRu: "Если вы хотите передохнуть, прополоскать рот или задать вопрос — просто поднимите левую руку. Врач сразу же остановит работу.",
		iconColor: "var(--teal, #0d9488)",
		detailRu: "Полный контроль процесса в ваших руках. Никаких неожиданных действий.",
	},
	{
		id: "cofferdam_safety",
		titleRu: "Изоляция зуба коффердамом и микроскоп 30x",
		descriptionRu: "Латексная завеса изолирует зуб: растворы не попадают на язык и в горло, вам не нужно держать рот напряженным, можно спокойно сглатывать слюну, а оптика 30x сохраняет живую структуру зуба.",
		iconColor: "var(--warn-fg, #f59e0b)",
		detailRu: "30-кратный микроскоп и защита коффердамом для максимальной безопасности.",
	},
] as const;

/**
 * Section 4.1: Patient Comfort & Painless Care Standards
 */
export const PlanComfortStandards: React.FC = () => {
	return (
		<div
			className="pc-card patient-comfort-standards-card"
			data-testid="patient-comfort-standards"
			style={{
				backgroundColor: "var(--pc-surface, #1e293b)",
				borderRadius: "12px",
				border: "1.5px solid rgba(13, 148, 136, 0.3)",
				padding: "16px",
				display: "flex",
				flexDirection: "column",
				gap: "12px",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
				<Heart size={20} style={{ color: "var(--pc-primary, #0d9488)" }} />
				<div>
					<h4
						style={{
							margin: 0,
							fontSize: "15px",
							fontWeight: 800,
							color: "var(--pc-text-main, var(--ink, #0f172a))",
						}}
					>
						Бережная стоматология: лечение без боли и страха
					</h4>
					<p
						style={{
							margin: "2px 0 0 0",
							fontSize: "12px",
							color: "var(--pc-text-muted, #94a3b8)",
						}}
					>
						Стандарты заботы DENTE для 100% спокойствия пациента во время приема:
					</p>
				</div>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
					gap: "10px",
				}}
			>
				{PATIENT_COMFORT_STANDARDS.map((std) => (
					<div
						key={std.id}
						style={{
							backgroundColor: "var(--pc-surface, var(--paper-strong, #ffffff))",
							border: "1px solid var(--pc-border, #334155)",
							borderRadius: "8px",
							padding: "10px 12px",
							display: "flex",
							flexDirection: "column",
							gap: "4px",
						}}
					>
						<strong style={{ fontSize: "13px", color: std.iconColor }}>
							{std.titleRu}
						</strong>
						<p
							style={{
								margin: 0,
								fontSize: "12px",
								color: "var(--pc-text-muted, #94a3b8)",
								lineHeight: "1.4",
							}}
						>
							{std.descriptionRu}
						</p>
					</div>
				))}
			</div>
		</div>
	);
};

/**
 * Section 6: Clinic Warranty Obligations
 */
export const PlanClinicGuarantees: React.FC = () => {
	return (
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
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: "8px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<Award size={20} style={{ color: "var(--pc-primary, #0d9488)" }} />
					<h4
						style={{
							margin: 0,
							fontSize: "16px",
							fontWeight: 800,
							color: "var(--pc-text-main, var(--ink, #0f172a))",
						}}
					>
						Официальные гарантийные обязательства клиники DENTE
					</h4>
				</div>
				<span style={{ fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)" }}>
					Закон РФ № 2300-1 • Положение СтАР
				</span>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
					gap: "10px",
				}}
			>
				{CLINIC_GUARANTEE_ITEMS.map((item) => (
					<div
						key={item.id}
						style={{
							backgroundColor: "var(--pc-surface, var(--paper-strong, #ffffff))",
							border: "1px solid var(--pc-border, #334155)",
							borderRadius: "10px",
							padding: "12px 14px",
							display: "flex",
							flexDirection: "column",
							gap: "6px",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "flex-start",
								gap: "8px",
							}}
						>
							<strong
								style={{
									fontSize: "13px",
									color: "var(--pc-text-main, var(--ink, #0f172a))",
								}}
							>
								{item.titleRu}
							</strong>
							<span
								style={{
									backgroundColor: "rgba(13, 148, 136, 0.15)",
									color: item.badgeColor,
									border: `1px solid ${item.badgeColor}`,
									padding: "2px 8px",
									borderRadius: "10px",
									fontSize: "12px",
									fontWeight: 800,
									whiteSpace: "nowrap",
								}}
							>
								{item.warrantyPeriodRu}
							</span>
						</div>

						<div style={{ fontSize: "12px", color: "var(--pc-primary, #0d9488)" }}>
							Материалы: {item.materialsRu}
						</div>

						<div
							style={{
								fontSize: "12px",
								color: "var(--pc-text-muted, #94a3b8)",
								lineHeight: "1.4",
							}}
						>
							{item.termsRu}
						</div>
					</div>
				))}
			</div>

			{/* Warranty Terms Preservation Callout */}
			<div
				style={{
					backgroundColor: "var(--pc-surface, var(--paper-strong, #ffffff))",
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
	);
};

/**
 * Section 7: Post-Treatment Triage FAQ
 */
export const PlanPostTreatmentTriageFaq: React.FC = () => {
	const [expandedFaqId, setExpandedFaqId] = useState<string | null>("urgent_symptoms");

	return (
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
			<h4
				style={{
					margin: 0,
					fontSize: "15px",
					fontWeight: 800,
					color: "var(--pc-text-main, var(--ink, #0f172a))",
				}}
			>
				Памятка самоконтроля при боли после лечения
			</h4>

			<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
				{POST_TREATMENT_TRIAGE_FAQ.map((faq) => {
					const isExpanded = expandedFaqId === faq.id;
					return (
						<div
							key={faq.id}
							style={{
								backgroundColor: "var(--pc-surface, var(--paper-strong, #ffffff))",
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
									color: "var(--pc-text-main, var(--ink, #0f172a))",
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
								<div
									style={{
										padding: "0 14px 12px 14px",
										fontSize: "12px",
										color: "var(--pc-text-muted, #94a3b8)",
									}}
								>
									<ul
										style={{
											margin: 0,
											paddingLeft: "18px",
											display: "flex",
											flexDirection: "column",
											gap: "4px",
										}}
									>
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
	);
};
