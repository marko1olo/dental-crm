/**
 * @file CabinetReadinessActions.tsx
 * @description Layer 4: Verdict banner, operator sign-off and submit CTA for Cabinet Readiness.
 */

import {
	Award,
	Check,
	CheckCircle2,
	Info,
	Zap,
} from "lucide-react";
import React from "react";
import type { CabinetReadinessActionsProps } from "./types";

export function CabinetReadinessActions({
	isFullyReady,
	statusMessageRu,
	missingItems,
	nurseName,
	setNurseName,
	notes,
	setNotes,
	onSaveChecklist,
	onStartAppointmentPaperLogNorm,
	onQuickFillAllReady,
}: CabinetReadinessActionsProps) {
	return (
		<div className="cabinet-readiness-actions-wrap" style={{ marginTop: "0.75rem" }}>
			{/* Readiness Verdict & Signature Card */}
			<div
				style={{
					background: "var(--paper, #ffffff)",
					border: "1px solid var(--paper-border, #e2e8f0)",
					borderRadius: "0.75rem",
					padding: "1rem 1.15rem",
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-between",
				}}
			>
				<div>
					<h3
						style={{
							fontSize: "0.95rem",
							fontWeight: 700,
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
							marginBottom: "0.75rem",
							color: "var(--brand-primary, #2563eb)",
						}}
					>
						<Award size={18} /> Шаг 3: Статус готовности и фиксация
					</h3>

					{/* Verdict Banner */}
					<div
						style={{
							padding: "0.75rem 1rem",
							borderRadius: "0.5rem",
							background: isFullyReady ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
							border: isFullyReady ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)",
							marginBottom: "0.75rem",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.5rem",
								fontSize: "0.95rem",
								fontWeight: 800,
								color: isFullyReady ? "var(--ok-fg, #059669)" : "var(--warn-fg, #b45309)",
							}}
						>
							{isFullyReady ? <CheckCircle2 size={18} /> : <Info size={18} />}
							<span>{statusMessageRu}</span>
						</div>

						{missingItems.length > 0 && (
							<div style={{ marginTop: "0.5rem" }}>
								<p style={{ margin: "0 0 0.3rem 0", fontSize: "0.82rem", fontWeight: 700, color: "var(--warn-fg, #b45309)" }}>
									Не заполнены пункты экспресс-проверки (при использовании бумажных журналов приём разрешён):
								</p>
								<ul style={{ margin: "0 0 0.5rem 1.25rem", padding: 0, fontSize: "0.8rem", color: "var(--muted, #64748b)" }}>
									{missingItems.map((item, idx) => (
										<li key={idx} style={{ marginBottom: "0.2rem" }}>
											{item}
										</li>
									))}
								</ul>
								<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
									<button
										type="button"
										onClick={onStartAppointmentPaperLogNorm}
										className="sanpin-btn sanpin-btn-primary"
										style={{
											flex: 1,
											minHeight: "44px",
											padding: "0.5rem 1rem",
											fontSize: "0.88rem",
											background: "var(--teal, #0d9488)",
											color: "var(--on-teal, #ffffff)",
											fontWeight: 800,
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											gap: "0.4rem",
											borderRadius: "0.5rem",
										}}
										title="Начать приём в штатном режиме (бумажный журнал)"
									>
										<CheckCircle2 size={16} /> <span>Начать приём (норма)</span>
									</button>
									<button
										type="button"
										onClick={onQuickFillAllReady}
										className="sanpin-btn sanpin-btn-secondary"
										style={{
											flex: 1,
											minHeight: "44px",
											padding: "0.5rem 1rem",
											fontSize: "0.88rem",
											fontWeight: 700,
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											gap: "0.4rem",
											borderRadius: "0.5rem",
										}}
										title="Отметить все недостающие пункты чек-листа как готовые"
									>
										<Zap size={16} /> <span>Заполнить чек-лист по норме</span>
									</button>
								</div>
							</div>
						)}
					</div>

					{/* Operator & Notes inputs + Primary Submit CTA */}
					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							gap: "0.75rem",
							alignItems: "flex-end",
						}}
					>
						<div style={{ flex: "1 1 220px", minWidth: 0 }}>
							<label style={{ fontSize: "0.78rem", color: "var(--muted, #64748b)", display: "block", marginBottom: "0.25rem" }}>
								ФИО ассистента / медсестры (опционально):
							</label>
							<input
								type="text"
								value={nurseName}
								onChange={(e) => setNurseName(e.target.value)}
								placeholder="Персонал клиники"
								className="sanpin-input"
								style={{ minHeight: "44px", fontSize: "0.85rem", width: "100%" }}
							/>
						</div>

						<div style={{ flex: "1.2 1 240px", minWidth: 0 }}>
							<label style={{ fontSize: "0.78rem", color: "var(--muted, #64748b)", display: "block", marginBottom: "0.25rem" }}>
								Примечания / Особые указания:
							</label>
							<input
								type="text"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="например: стерильный набор имплантации"
								className="sanpin-input"
								style={{ minHeight: "44px", fontSize: "0.85rem", width: "100%" }}
							/>
						</div>

						<button
							type="button"
							onClick={onSaveChecklist}
							className="sanpin-btn sanpin-btn-primary"
							style={{
								flex: "0 0 auto",
								minHeight: "44px",
								padding: "0.55rem 1.35rem",
								fontSize: "0.9rem",
								fontWeight: 800,
								background: "var(--teal, #0d9488)",
								color: "var(--on-teal, #ffffff)",
								cursor: "pointer",
								boxShadow: "0 2px 8px rgba(13, 148, 136, 0.35)",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "0.45rem",
								borderRadius: "0.5rem",
								whiteSpace: "nowrap",
							}}
							data-testid="submit-cabinet-readiness-btn"
						>
							<Check size={18} style={{ flexShrink: 0 }} />
							<span>{isFullyReady ? "Кабинет готов к приёму — зафиксировать" : "Сохранить статус проверки"}</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
