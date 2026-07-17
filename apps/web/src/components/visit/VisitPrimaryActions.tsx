import React from "react";
import { Bot, Check, AlertTriangle, Mic, Lock } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

export function VisitPrimaryActions({ isSignDialogOpen, setIsSignDialogOpen, isSigned }: any) {
	const {
		visitPrimaryAction,
		visitWorkflowSteps,
	} = useAppLogicContext();

	return (
		<details
						className="clinical-rules-toggle"
						style={{
							border: "1px solid #e2e8f0",
							borderRadius: "12px",
							overflow: "hidden",
							margin: "0.75rem 0",
						}}
					>
						<summary
							style={{
								padding: "0.75rem 1rem",
								background: "var(--paper)",
								fontSize: "0.85rem",
								fontWeight: 700,
								color: "#475569",
								cursor: "pointer",
								outline: "none",
							}}
						>
							🧭 Шаги приема и статус: {visitPrimaryAction.label}
						</summary>
						<div style={{ marginTop: "1rem", padding: "0 1rem 1rem 1rem" }}>
							<section
								className="visit-next-step"
								data-testid="visit-next-step-panel"
								aria-label="Следующий шаг приема"
							>
								<div className="visit-next-step-main">
									<div>
										<p className="eyebrow">Сейчас сделать</p>
										<h3>{visitPrimaryAction.label}</h3>
										<p id="visit-primary-action-detail">
											{visitPrimaryAction.detail}
										</p>
									</div>
									<button
										className="primary-button visit-primary-action"
										type="button"
										onClick={visitPrimaryAction.onClick}
										disabled={visitPrimaryAction.disabled}
										aria-describedby="visit-primary-action-detail"
										data-testid="visit-primary-action"
										style={{
											padding: "16px 24px",
											fontSize: "1.2rem",
											fontWeight: "bold",
											textTransform: "uppercase",
											width: "100%",
											justifyContent: "center",
											borderRadius: "12px",
										}}
									>
										{visitPrimaryAction.kind === "dictation" ? (
											<Mic aria-hidden="true" />
										) : null}
										{visitPrimaryAction.kind === "draft" ? (
											<Bot aria-hidden="true" />
										) : null}
										{visitPrimaryAction.kind === "save" ||
										visitPrimaryAction.kind === "close" ? (
											<Check aria-hidden="true" />
										) : null}
										{visitPrimaryAction.kind === "review" ? (
											<AlertTriangle aria-hidden="true" />
										) : null}
										{visitPrimaryAction.label}
									</button>

									{isSigned ? (
										<div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px", color: "var(--teal)", fontWeight: "bold" }}>
											<Lock size={16} /> Документ подписан УКЭП
										</div>
									) : (
										<button
											className="secondary-button"
											type="button"
											onClick={() => setIsSignDialogOpen(true)}
											style={{
												marginTop: "12px",
												padding: "16px 24px",
												fontSize: "1rem",
												fontWeight: "bold",
												width: "100%",
												justifyContent: "center",
												borderRadius: "12px",
												display: "flex",
												alignItems: "center",
												gap: "8px",
												border: "1px solid var(--border-color)"
											}}
										>
											<Lock size={18} /> Подписать ЭЦП
										</button>
									)}

								</div>
								<div
									className="visit-progress-strip"
									data-testid="visit-progress-strip"
									aria-label="Прогресс приема"
								>
									{visitWorkflowSteps.map((step, index) => (
										<article
											className={`visit-progress-step step-${step.state}`}
											key={step.key}
										>
											<span>{index + 1}</span>
											<div>
												<strong>{step.label}</strong>
												<p>{step.detail}</p>
											</div>
										</article>
									))}
								</div>
							</section>
						</div>
					</details>
	);
}
