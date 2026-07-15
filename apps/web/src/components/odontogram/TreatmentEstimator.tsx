import { Calculator, FileText, PenTool, Save, Trash2 } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { SignaturePad } from "../SignaturePad";
import { type ToothData, ToothState } from "./ToothChart";

interface EstimatorProps {
	patientId: string;
	currentTeeth: ToothData[];
}

interface PlanItem {
	id?: string;
	toothNumber?: number;
	priceId: string;
	name: string;
	quantity: number;
	price: number;
	discount: number;
	phase: number;
	isAuto?: boolean;
}

interface SavedTreatmentPlan {
	id: string;
	name: string;
	totalPrice: number;
	patientSignature?: string | null;
	items: PlanItem[];
}

export const TreatmentEstimator: React.FC<EstimatorProps> = ({
	patientId,
	currentTeeth,
}) => {
	const [items, setItems] = useState<PlanItem[]>([]);
	const [total, setTotal] = useState(0);
	const [isSaving, setIsSaving] = useState(false);
	const [planId, setPlanId] = useState<string | null>(null);
	const [showSignModal, setShowSignModal] = useState(false);
	const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		setPlanId(null);
		setItems([]);
		setSignatureUrl(null);

		fetch(`/api/patients/${patientId}/treatment-plans`, {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then((response) => (response.ok ? response.json() : null))
			.then((data) => {
				const latestPlan = data?.plans?.[0] as SavedTreatmentPlan | undefined;
				if (!active || !latestPlan) return;
				setPlanId(latestPlan.id);
				setItems(Array.isArray(latestPlan.items) ? latestPlan.items : []);
				setSignatureUrl(latestPlan.patientSignature ?? null);
			})
			.catch((error) => {
				console.error("Treatment plan load failed", error);
			});

		return () => {
			active = false;
		};
	}, [patientId]);

	// Auto-suggestions based on currentTeeth - fully synchronized
	useEffect(() => {
		setItems((prevItems) => {
			let newItems = [...prevItems];
			let changed = false;

			// 1. Remove auto-items for teeth that no longer have that state
			const itemsToRemove: number[] = [];
			newItems.forEach((item, idx) => {
				if (!item.isAuto) return;
				const tooth = currentTeeth.find(
					(t) => t.toothNumber === item.toothNumber,
				);
				if (!tooth) {
					itemsToRemove.push(idx);
					return;
				}
				if (item.priceId === "service_caries_01" && tooth.state !== "Caries")
					itemsToRemove.push(idx);
				if (
					(item.priceId === "service_implant_osstem" ||
						item.priceId === "service_surgery_guide") &&
					tooth.state !== "Planned_Implant" &&
					tooth.state !== "Implant"
				)
					itemsToRemove.push(idx);
				if (
					item.priceId === "service_endo_pulpitis" &&
					tooth.state !== "Pulpitis"
				)
					itemsToRemove.push(idx);
				if (
					item.priceId === "service_crown_zirconia" &&
					tooth.state !== "Crown"
				)
					itemsToRemove.push(idx);
			});

			if (itemsToRemove.length > 0) {
				newItems = newItems.filter((_, i) => !itemsToRemove.includes(i));
				changed = true;
			}

			// 2. Add missing auto-items
			currentTeeth.forEach((t) => {
				const isBaby = t.toothNumber > 50;
				if (t.state === "Caries") {
					if (
						!newItems.find(
							(i) =>
								i.toothNumber === t.toothNumber &&
								i.priceId === "service_caries_01",
						)
					) {
						newItems.push({
							isAuto: true,
							toothNumber: t.toothNumber,
							priceId: "service_caries_01",
							name: isBaby
								? "Лечение кариеса (молочный зуб)"
								: "Лечение кариеса (восстановление)",
							quantity: 1,
							price: isBaby ? 4000 : 5500,
							discount: 0,
							phase: 1,
						});
						changed = true;
					}
				}
				if (t.state === "Planned_Implant" || t.state === "Implant") {
					if (
						!isBaby &&
						!newItems.find(
							(i) =>
								i.toothNumber === t.toothNumber &&
								i.priceId === "service_implant_osstem",
						)
					) {
						newItems.push({
							isAuto: true,
							toothNumber: t.toothNumber,
							priceId: "service_implant_osstem",
							name: "Установка имплантата Osstem TSIII",
							quantity: 1,
							price: 35000,
							discount: 0,
							phase: 2,
						});
						newItems.push({
							isAuto: true,
							toothNumber: t.toothNumber,
							priceId: "service_surgery_guide",
							name: "Хирургический шаблон",
							quantity: 1,
							price: 12000,
							discount: 0,
							phase: 2,
						});
						changed = true;
					}
				}
				if (t.state === "Pulpitis") {
					if (
						!newItems.find(
							(i) =>
								i.toothNumber === t.toothNumber &&
								i.priceId === "service_endo_pulpitis",
						)
					) {
						newItems.push({
							isAuto: true,
							toothNumber: t.toothNumber,
							priceId: "service_endo_pulpitis",
							name: isBaby
								? "Эндодонтическое лечение (молочный зуб)"
								: "Эндодонтическое лечение (Пульпит)",
							quantity: 1,
							price: isBaby ? 6000 : 12500,
							discount: 0,
							phase: 1,
						});
						changed = true;
					}
				}
				if (t.state === "Crown") {
					if (
						!newItems.find(
							(i) =>
								i.toothNumber === t.toothNumber &&
								i.priceId === "service_crown_zirconia",
						)
					) {
						newItems.push({
							isAuto: true,
							toothNumber: t.toothNumber,
							priceId: "service_crown_zirconia",
							name: isBaby
								? "Коронка детская стандартная"
								: "Коронка из диоксида циркония",
							quantity: 1,
							price: isBaby ? 5000 : 28000,
							discount: 0,
							phase: 3,
						});
						changed = true;
					}
				}
			});

			return changed ? newItems : prevItems;
		});
	}, [currentTeeth]);

	useEffect(() => {
		const t = items.reduce(
			(acc, curr) => acc + (curr.price * curr.quantity - curr.discount),
			0,
		);
		setTotal(t);
	}, [items]);

	const savePlan = async () => {
		setIsSaving(true);
		try {
			const res = await fetch(`/api/patients/${patientId}/treatment-plans`, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					id: planId,
					name: "Комплексный план лечения (КТ)",
					patientSignature: signatureUrl,
					items: items.map((i) => ({ ...i })),
				}),
			});
			const data = await res.json();
			if (data.success) {
				setPlanId(data.planId);
				if (data.plan?.items) setItems(data.plan.items);
				if (data.plan?.patientSignature !== undefined)
					setSignatureUrl(data.plan.patientSignature);
			}
		} catch (e) {
			console.error(e);
		} finally {
			setIsSaving(false);
		}
	};

	const removeItem = (idx: number) => {
		setItems(items.filter((_, i) => i !== idx));
	};

	const setPhase = (idx: number, phase: number) => {
		const n = [...items];
		if (n[idx]) n[idx].phase = phase;
		setItems(n);
	};

	const phases = [1, 2, 3];

	return (
		<div className="flex flex-col h-full bg-zinc-50/40 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-xl overflow-hidden text-slate-900 dark:text-zinc-100">
			<div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-100/30 dark:bg-zinc-900/30">
				<h2 className="flex items-center gap-2 text-lg font-bold">
					<FileText
						size={18}
						className="text-indigo-500 dark:text-indigo-400"
					/>
					План лечения
				</h2>
				<div className="flex gap-2">
					{signatureUrl && (
						<span className="px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-100/50 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-full border border-emerald-200/50 dark:border-emerald-500/30 flex items-center">
							ПОДПИСАНО
						</span>
					)}
					<button
						onClick={() => setShowSignModal(true)}
						className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-colors"
					>
						<PenTool size={14} />
						Подписать
					</button>
					<button
						onClick={savePlan}
						disabled={isSaving}
						className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 border border-indigo-500 rounded-lg shadow-md shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
					>
						<Save size={14} />
						{isSaving ? "Сохранение..." : "Сохранить"}
					</button>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
				{items.length === 0 && (
					<div className="flex flex-col items-center justify-center p-8 mx-2 my-8 rounded-2xl border border-dashed border-zinc-300/50 dark:border-zinc-700/50 bg-zinc-50/30 dark:bg-zinc-900/20 backdrop-blur-sm text-center">
						<div className="p-5 mb-4 rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 shadow-[0_0_30px_5px_rgba(99,102,241,0.1)] dark:shadow-[0_0_30px_5px_rgba(99,102,241,0.1)] border border-indigo-500/10 dark:border-indigo-500/20">
							<Calculator
								size={40}
								className="text-indigo-500 dark:text-indigo-400 opacity-40"
							/>
						</div>
						<h4 className="text-base font-bold text-slate-800 dark:text-zinc-100 mb-2">
							План лечения пуст
						</h4>
						<p className="text-sm leading-relaxed text-slate-500 dark:text-zinc-400 max-w-[320px]">
							Кликните на любой зуб на схеме слева, выберите патологию, и
							система автоматически подберет оптимальный набор процедур из
							прайс-листа
						</p>
					</div>
				)}

				{phases.map((phase) => {
					const phaseItems = items.filter((i) => i.phase === phase);
					if (phaseItems.length === 0) return null;

					return (
						<div key={phase} className="phase-section">
							<h3 className="phase-title">
								{phase === 1 && "I. Терапия (Санация)"}
								{phase === 2 && "II. Хирургия и Имплантация"}
								{phase === 3 && "III. Ортопедия (Протезирование)"}
							</h3>

							<div className="phase-items-list">
								{phaseItems.map((item, idx) => {
									const globalIdx = items.indexOf(item);
									return (
										<div key={globalIdx} className="plan-item-card">
											<div className="plan-item-row">
												<div className="plan-item-info">
													<div className="plan-item-header">
														{item.toothNumber && (
															<span
																className={`tooth-badge ${item.toothNumber > 50 ? "baby" : "adult"}`}
															>
																[{item.toothNumber}]
															</span>
														)}
														<span className="plan-item-name">{item.name}</span>
													</div>
													<div className="plan-item-price-quantity">
														{item.price.toLocaleString("ru-RU")} ₽ x{" "}
														{item.quantity}
													</div>
												</div>
												<button
													onClick={() => removeItem(globalIdx)}
													className="btn-remove-item"
													title="Удалить"
												>
													<Trash2 size={14} />
												</button>
											</div>
											<div className="plan-item-footer">
												<select
													value={item.phase}
													onChange={(e) =>
														setPhase(globalIdx, parseInt(e.target.value))
													}
													className="select-phase"
												>
													<option value={1}>Этап I: Терапия</option>
													<option value={2}>Этап II: Хирургия</option>
													<option value={3}>Этап III: Ортопедия</option>
												</select>
												<span className="plan-item-total-price">
													{(item.price * item.quantity).toLocaleString("ru-RU")}{" "}
													₽
												</span>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					);
				})}
			</div>

			<div className="flex justify-between items-center px-6 py-4 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-100/30 dark:bg-zinc-900/30">
				<div className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
					Итого по плану:
				</div>
				<div className="text-xl font-bold text-slate-900 dark:text-zinc-100 flex items-baseline gap-1">
					{total.toLocaleString("ru-RU")}{" "}
					<span className="text-sm font-medium text-slate-500 dark:text-zinc-500">
						₽
					</span>
				</div>
			</div>

			{showSignModal &&
				typeof window !== "undefined" &&
				createPortal(
					<div className="modal-overlay">
						<div className="modal-content" style={{ maxWidth: "800px" }}>
							<SignaturePad
								onSign={(dataUrl) => {
									setSignatureUrl(dataUrl);
									setShowSignModal(false);
								}}
								onCancel={() => setShowSignModal(false)}
							/>
						</div>
					</div>,
					document.body,
				)}
		</div>
	);
};
