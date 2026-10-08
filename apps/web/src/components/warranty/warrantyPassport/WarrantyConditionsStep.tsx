/**
 * ============================================================================
 * WARRANTY PASSPORT STUDIO — LAYER 1: CONDITIONS & CHECKUPS STEP
 * График обязательных чекапов и условия сохранения гарантии (Закон РФ № 2300-1 & СтАР)
 * ============================================================================
 */

import type React from "react";
import type { WarrantyCalculationResult } from "../warrantyEngine.js";
import { MANDATORY_WARRANTY_CONDITIONS } from "../warrantyPresets.js";

export interface WarrantyConditionsStepProps {
	mode: "schedule" | "conditions";
	calculation: WarrantyCalculationResult;
}

export const WarrantyConditionsStep: React.FC<WarrantyConditionsStepProps> = ({
	mode,
	calculation,
}) => {
	if (mode === "schedule") {
		return (
			<div style={{ maxWidth: "800px", margin: "0 auto" }}>
				<h3 style={{ fontSize: "16px", marginBottom: "12px", color: "var(--ink)" }}>
					Индивидуальный график контрольных осмотров и профгигиены
				</h3>
				<p style={{ fontSize: "13px", color: "var(--ink-2)", marginBottom: "16px" }}>
					Периодичность контрольных визитов: каждые {calculation.checkupIntervalMonths} мес. для сохранения
					гарантийных обязательств клиники.
				</p>

				<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
					{calculation.checkupSchedule.map((chk) => (
						<div
							key={chk.index}
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								padding: "12px 16px",
								background: "var(--paper-soft)",
								border: "1px solid var(--line)",
								borderRadius: "8px",
							}}
						>
							<div>
								<strong style={{ fontSize: "14px", color: "var(--teal)" }}>Визит #{chk.index}</strong>
								<div style={{ fontSize: "12px", color: "var(--ink-2)", marginTop: "2px" }}>
									{chk.recommendedProcedures.join(" • ")}
								</div>
							</div>
							<div style={{ textAlign: "right" }}>
								<strong style={{ fontSize: "15px", color: "var(--ink)" }}>{chk.formattedDate}</strong>
								<div style={{ fontSize: "11px", color: "var(--ok-fg)", fontWeight: 700 }}>ОБЯЗАТЕЛЬНЫЙ ВИЗИТ</div>
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div style={{ maxWidth: "860px", margin: "0 auto" }}>
			<h3 style={{ fontSize: "16px", marginBottom: "8px", color: "var(--ink)" }}>
				Обязательные условия сохранения гарантийных обязательств (Закон РФ № 2300-1 & СтАР)
			</h3>
			<p style={{ fontSize: "13px", color: "var(--ink-2)", marginBottom: "16px" }}>
				Гарантия клиники действует при строгом соблюдении пациентом следующих медицинских и эксплуатационных
				требований:
			</p>

			<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
				{MANDATORY_WARRANTY_CONDITIONS.map((cond) => (
					<div
						key={cond.id}
						style={{
							padding: "12px 16px",
							background: "var(--paper-soft)",
							border: "1px solid var(--line)",
							borderRadius: "8px",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
							<span
								style={{
									width: "22px",
									height: "22px",
									borderRadius: "50%",
									background: "var(--teal)",
									color: "var(--on-teal)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: "11px",
									fontWeight: "bold",
								}}
							>
								{cond.number}
							</span>
							<strong style={{ fontSize: "13.5px", color: "var(--ink)" }}>{cond.title}</strong>
						</div>
						<p style={{ fontSize: "12.5px", color: "var(--ink-2)", margin: "4px 0 6px 30px" }}>
							{cond.description}
						</p>
						<div style={{ fontSize: "11.5px", color: "var(--bad-fg)", marginLeft: "30px" }}>
							<strong>Последствия нарушения:</strong> {cond.penaltyDescription}
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
