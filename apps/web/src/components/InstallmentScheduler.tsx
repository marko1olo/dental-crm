import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./InstallmentScheduler.css";
import { denteAdminSecretRequestHeaders } from "../AppHelpers.js";
import { showToast } from "./GlobalToast.js";

interface Installment {
	month: number;
	dueDate: string;
	dueDateIso: string;
	amount: number;
}

function buildSchedule(
	total: number,
	downPayment: number,
	months: number,
	discount: number,
): Installment[] {
	const discountedTotal = total * (1 - discount / 100);
	const remainder = discountedTotal - downPayment;
	if (remainder <= 0 || months <= 0) return [];

	const monthly = remainder / months;
	const now = new Date();
	return Array.from({ length: months }, (_, i) => {
		const d = new Date(now);
		d.setMonth(d.getMonth() + i + 1);
		return {
			month: i + 1,
			dueDate: d.toLocaleDateString("ru-RU", {
				day: "2-digit",
				month: "short",
				year: "numeric",
			}),
			dueDateIso: d.toISOString(),
			amount: Math.round(monthly),
		};
	});
}

export const InstallmentScheduler: React.FC<{ totalEstimate: number; patientId?: string | null | undefined }> = ({
	totalEstimate,
	patientId,
}) => {
	const [downPct, setDownPct] = useState(0); // 0-100 %
	const [months, setMonths] = useState(6);
	const [discount, setDiscount] = useState(0);
	const [expanded, setExpanded] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	// Reset when the estimate changes (new patient / plan)
	useEffect(() => {
		setDownPct(0);
		setMonths(6);
		setDiscount(0);
	}, [totalEstimate]);

	const downPayment = useMemo(
		() => Math.round((totalEstimate * downPct) / 100),
		[totalEstimate, downPct],
	);
	const discounted = useMemo(
		() => Math.round(totalEstimate * (1 - discount / 100)),
		[totalEstimate, discount],
	);
	const remainder = Math.max(0, discounted - downPayment);
	const monthly =
		months > 0 && remainder > 0 ? Math.round(remainder / months) : 0;
	const schedule = useMemo(
		() => buildSchedule(totalEstimate, downPayment, months, discount),
		[totalEstimate, downPayment, months, discount],
	);

	const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setDownPct(Number(e.target.value));
	}, []);

	const saveInstallmentPlan = async () => {
		if (!patientId) {
			showToast("Сначала выберите пациента.", "error");
			return;
		}
		if (schedule.length === 0) return;

		setIsSaving(true);
		try {
			const res = await fetch(`/api/patients/${patientId}/installments`, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					installments: schedule.map((item) => ({
						dueDate: item.dueDateIso,
						amount: item.amount,
					})),
				}),
			});
			if (res.ok) {
				showToast("План рассрочки успешно сохранен!", "success");
			} else {
				const err = await res.json();
				showToast(err.message || "Ошибка при сохранении рассрочки", "error");
			}
		} catch (err) {
			console.error(err);
			showToast("Не удалось сохранить план рассрочки", "error");
		} finally {
			setIsSaving(false);
		}
	};

	// Thumb color track fill via CSS variable trick
	const sliderFill = `${downPct}%`;

	return (
		<div className="inst-wrap">
			<div className="inst-header" onClick={() => setExpanded((x) => !x)}>
				<div className="inst-header-left">
					<span className="inst-icon">💳</span>
					<h3 className="inst-title">Калькулятор рассрочки</h3>
					<span className="inst-total-badge">
						{totalEstimate.toLocaleString()} ₽
					</span>
				</div>
				<span className="inst-chevron">{expanded ? "▲" : "▼"}</span>
			</div>

			{expanded && (
				<div className="inst-body">
					{/* ── Down Payment Slider ── */}
					<div className="inst-section">
						<div className="inst-row-label">
							<label className="inst-label">Первоначальный взнос</label>
							<div className="inst-value-badge">
								<span className="inst-pct">{downPct}%</span>
								<span className="inst-rub">
									{downPayment.toLocaleString()} ₽
								</span>
							</div>
						</div>

						<div className="inst-slider-wrap">
							<input
								type="range"
								min="0"
								max="100"
								step="1"
								value={downPct}
								onChange={handleSlider}
								className="inst-slider"
								style={{ "--fill": sliderFill } as React.CSSProperties}
								aria-label="Первоначальный взнос в процентах"
							/>
							<div className="inst-slider-labels">
								<span>0%</span>
								<span>25%</span>
								<span>50%</span>
								<span>75%</span>
								<span>100%</span>
							</div>
						</div>
					</div>

					{/* ── Months + Discount ── */}
					<div className="inst-controls-row">
						<div className="inst-control">
							<label className="inst-label">Срок рассрочки</label>
							<div className="inst-month-stepper">
								<button
									onClick={() => setMonths((m) => Math.max(1, m - 1))}
									className="inst-step-btn"
								>
									−
								</button>
								<span className="inst-step-val">{months} мес.</span>
								<button
									onClick={() => setMonths((m) => Math.min(36, m + 1))}
									className="inst-step-btn"
								>
									+
								</button>
							</div>
						</div>
						<div className="inst-control">
							<label className="inst-label">Скидка</label>
							<div className="inst-discount-wrap">
								<input
									type="number"
									min="0"
									max="50"
									value={discount}
									onChange={(e) =>
										setDiscount(
											Math.min(50, Math.max(0, Number(e.target.value))),
										)
									}
									className="inst-discount-input"
								/>
								<span className="inst-discount-pct">%</span>
							</div>
						</div>
					</div>

					{/* ── Live Summary ── */}
					<div className="inst-summary">
						<div className="inst-summary-item">
							<span className="inst-summary-label">Сумма со скидкой</span>
							<span className="inst-summary-val">
								{discounted.toLocaleString()} ₽
							</span>
						</div>
						<div className="inst-summary-item">
							<span className="inst-summary-label">Остаток к рассрочке</span>
							<span className="inst-summary-val inst-summary-val--accent">
								{remainder.toLocaleString()} ₽
							</span>
						</div>
						<div className="inst-summary-item inst-summary-item--monthly">
							<span className="inst-summary-label">Ежемесячный платёж</span>
							<span className="inst-summary-val inst-summary-val--big">
								{monthly > 0 ? monthly.toLocaleString() + " ₽" : "—"}
							</span>
						</div>
					</div>

					{/* ── Payment Schedule ── */}
					{schedule.length > 0 && (
						<div className="inst-schedule">
							<h4 className="inst-schedule-title">График платежей</h4>
							<div className="inst-schedule-list">
								{schedule.map((inst, idx) => (
									<div
										key={inst.month}
										className="inst-row"
										style={{ animationDelay: `${idx * 0.04}s` }}
									>
										<div className="inst-row-month">
											<span className="inst-month-dot" />
											Месяц {inst.month}
										</div>
										<div className="inst-row-date">{inst.dueDate}</div>
										<div className="inst-row-amount">
											{inst.amount.toLocaleString()} ₽
										</div>
									</div>
								))}
							</div>

							<button
								onClick={saveInstallmentPlan}
								disabled={isSaving}
								className="inst-save-btn"
							>
								💾 {isSaving ? "Сохранение..." : "Сохранить план рассрочки"}
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
};
