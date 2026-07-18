import { Calculator, FileText, PenTool, Save, Trash2 } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast.js";
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

	const { dashboard } = useAppLogicContext();
	const [activeContract, setActiveContract] = useState<any | null>(null);

	const patient = dashboard?.patients?.find((p: any) => p.id === patientId);
	const insuranceContractId =
		patient?.insuranceContractId ||
		patient?.administrativeProfile?.insuranceContractId;

	useEffect(() => {
		if (!insuranceContractId) {
			setActiveContract(null);
			return;
		}

		fetch(`/api/insurance/contracts/${insuranceContractId}`, {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				setActiveContract(data);
			})
			.catch((err) => {
				console.error("Failed to load active insurance contract", err);
				setActiveContract(null);
			});
	}, [insuranceContractId]);

	const getCoverageInfo = (item: PlanItem) => {
		if (!activeContract) return null;

		let pct = 0;
		const nameLower = item.name.toLowerCase();
		const isHygiene =
			nameLower.includes("гигиен") || nameLower.includes("чистк");

		if (isHygiene) {
			pct = activeContract.coverageHygienePct;
		} else if (item.phase === 1) {
			pct = activeContract.coverageTherapyPct;
		} else if (item.phase === 2) {
			pct = activeContract.coverageSurgeryPct;
		} else if (item.phase === 3) {
			pct = activeContract.coverageOrthoPct;
		}

		if (pct === 0) {
			return {
				covered: false,
				pct: 0,
				label: "Вне покрытия ДМС",
				copayPct: 100,
			};
		}
		return {
			covered: true,
			pct,
			label: `Покрытие ДМС ${pct}%`,
			copayPct: 100 - pct,
		};
	};

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

			const catalog = dashboard?.serviceCatalog || [];

			// Helper to find service by category and keywords
			const findService = (
				category: string,
				isBaby: boolean,
				keywords: string[],
			) => {
				const candidates = catalog.filter((s) => s.category === category);
				let best = candidates.find((s) =>
					keywords.some((k) => s.title.toLowerCase().includes(k)),
				);
				if (!best && candidates.length > 0) best = candidates[0]; // fallback to any in category
				return best;
			};

			const cariesServiceBaby = findService("therapy", true, [
				"кариес",
				"молочн",
			]) || {
				id: "service_caries_01",
				title: "Лечение кариеса (молочный зуб)",
				priceRub: 4000,
			};
			const cariesServiceAdult = findService("therapy", false, [
				"кариес",
				"восстановл",
			]) || {
				id: "service_caries_01",
				title: "Лечение кариеса (восстановление)",
				priceRub: 5500,
			};

			const pulpitisServiceBaby = findService("therapy", true, [
				"пульпит",
				"молочн",
				"эндо",
			]) || {
				id: "service_endo_pulpitis",
				title: "Эндодонтическое лечение (молочный зуб)",
				priceRub: 6000,
			};
			const pulpitisServiceAdult = findService("therapy", false, [
				"пульпит",
				"эндо",
			]) || {
				id: "service_endo_pulpitis",
				title: "Эндодонтическое лечение (Пульпит)",
				priceRub: 12500,
			};

			const implantService = findService("surgery", false, [
				"имплант",
				"установка",
			]) || {
				id: "service_implant_osstem",
				title: "Установка имплантата",
				priceRub: 35000,
			};
			const guideService = findService("surgery", false, [
				"шаблон",
				"хирург",
			]) || {
				id: "service_surgery_guide",
				title: "Хирургический шаблон",
				priceRub: 12000,
			};

			const crownBaby = findService("prosthetics", true, [
				"коронка",
				"детск",
				"молочн",
			]) || {
				id: "service_crown_zirconia",
				title: "Коронка детская стандартная",
				priceRub: 5000,
			};
			const crownAdult = findService("prosthetics", false, [
				"коронка",
				"циркон",
				"керамик",
			]) || {
				id: "service_crown_zirconia",
				title: "Коронка из диоксида циркония",
				priceRub: 28000,
			};

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
				if (
					(item.priceId === cariesServiceBaby.id ||
						item.priceId === cariesServiceAdult.id) &&
					tooth.state !== "Caries"
				)
					itemsToRemove.push(idx);
				if (
					(item.priceId === implantService.id ||
						item.priceId === guideService.id) &&
					tooth.state !== "Planned_Implant" &&
					tooth.state !== "Implant"
				)
					itemsToRemove.push(idx);
				if (
					(item.priceId === pulpitisServiceBaby.id ||
						item.priceId === pulpitisServiceAdult.id) &&
					tooth.state !== "Pulpitis"
				)
					itemsToRemove.push(idx);
				if (
					(item.priceId === crownBaby.id || item.priceId === crownAdult.id) &&
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
				const surfaceSuffix =
					t.surfaces && t.surfaces.length > 0
						? ` (Поверхности: ${t.surfaces.join(", ")})`
						: "";

				if (t.state === "Caries") {
					const svc = isBaby ? cariesServiceBaby : cariesServiceAdult;
					if (
						!newItems.find(
							(i) => i.toothNumber === t.toothNumber && i.priceId === svc.id,
						)
					) {
						newItems.push({
							isAuto: true,
							toothNumber: t.toothNumber,
							priceId: svc.id,
							name: svc.title + surfaceSuffix,
							quantity: 1,
							price: svc.priceRub,
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
								i.priceId === implantService.id,
						)
					) {
						newItems.push({
							isAuto: true,
							toothNumber: t.toothNumber,
							priceId: implantService.id,
							name: implantService.title,
							quantity: 1,
							price: implantService.priceRub,
							discount: 0,
							phase: 2,
						});
						newItems.push({
							isAuto: true,
							toothNumber: t.toothNumber,
							priceId: guideService.id,
							name: guideService.title,
							quantity: 1,
							price: guideService.priceRub,
							discount: 0,
							phase: 2,
						});
						changed = true;
					}
				}
				if (t.state === "Pulpitis") {
					const svc = isBaby ? pulpitisServiceBaby : pulpitisServiceAdult;
					if (
						!newItems.find(
							(i) => i.toothNumber === t.toothNumber && i.priceId === svc.id,
						)
					) {
						newItems.push({
							isAuto: true,
							toothNumber: t.toothNumber,
							priceId: svc.id,
							name: svc.title + surfaceSuffix,
							quantity: 1,
							price: svc.priceRub,
							discount: 0,
							phase: 1,
						});
						changed = true;
					}
				}
				if (t.state === "Crown") {
					const svc = isBaby ? crownBaby : crownAdult;
					if (
						!newItems.find(
							(i) => i.toothNumber === t.toothNumber && i.priceId === svc.id,
						)
					) {
						newItems.push({
							isAuto: true,
							toothNumber: t.toothNumber,
							priceId: svc.id,
							name: svc.title,
							quantity: 1,
							price: svc.priceRub,
							discount: 0,
							phase: 3,
						});
						changed = true;
					}
				}
			});

			return changed ? newItems : prevItems;
		});
	}, [currentTeeth, dashboard?.serviceCatalog]);

	useEffect(() => {
		const t = items.reduce((acc, curr) => {
			const coverage = getCoverageInfo(curr);
			const price = coverage
				? (curr.price * coverage.copayPct) / 100
				: curr.price;
			return acc + (price * curr.quantity - curr.discount);
		}, 0);
		setTotal(t);
	}, [items, activeContract]);

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
				showToast("План лечения успешно сохранен!", "success");
			} else {
				showToast(data.message || "Ошибка сохранения плана лечения", "error");
			}
		} catch (e) {
			console.error(e);
			showToast("Не удалось сохранить план лечения", "error");
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
		<div className="treatment-estimator">
			<div className="estimator-header">
				<h2 className="estimator-title">
					<FileText
						size={18}
						style={{ color: "#6366f1" }}
					/>
					План лечения
				</h2>
				<div className="estimator-actions">
					{signatureUrl && (
						<span className="status-signed">
							ПОДПИСАНО
						</span>
					)}
					<button
						onClick={() => setShowSignModal(true)}
						className="btn-secondary"
					>
						<PenTool size={14} />
						Подписать
					</button>
					<button
						onClick={savePlan}
						disabled={isSaving}
						className="btn-primary"
					>
						<Save size={14} />
						{isSaving ? "Сохранение..." : "Сохранить"}
					</button>
				</div>
			</div>

			<div className="estimator-content custom-scrollbar">
				{items.length === 0 && (
					<div className="empty-state-card">
						<div className="empty-state-icon-wrapper">
							<Calculator size={40} />
						</div>
						<h4 className="empty-state-title">
							План лечения пуст
						</h4>
						<p className="empty-state-desc">
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
														{(() => {
															const coverage = getCoverageInfo(item);
															if (coverage && !coverage.covered) {
																return (
																	<span className="price-tag-uncovered">
																		<span>
																			{item.price.toLocaleString("ru-RU")} ₽
																		</span>
																		<span className="price-badge-uncovered">
																			Вне покрытия ДМС
																		</span>
																	</span>
																);
															}
															if (coverage && coverage.pct < 100) {
																const copayPrice =
																	(item.price * coverage.copayPct) / 100;
																return (
																	<span className="price-tag-covered">
																		<span className="price-strike">
																			{item.price.toLocaleString("ru-RU")} ₽
																		</span>
																		<span className="price-copay">
																			{copayPrice.toLocaleString("ru-RU")} ₽
																		</span>
																		<span className="price-badge-covered">
																			Со-оплата {coverage.copayPct}%
																		</span>
																	</span>
																);
															}
															if (coverage && coverage.pct === 100) {
																return (
																	<span className="price-tag-covered">
																		<span className="price-strike">
																			{item.price.toLocaleString("ru-RU")} ₽
																		</span>
																		<span className="price-copay">
																			0 ₽
																		</span>
																		<span className="price-badge-covered">
																			ДМС 100%
																		</span>
																	</span>
																);
															}
															return (
																<span>
																	{item.price.toLocaleString("ru-RU")} ₽ x{" "}
																	{item.quantity}
																</span>
															);
														})()}
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
													{(() => {
														const coverage = getCoverageInfo(item);
														const price = coverage
															? (item.price * coverage.copayPct) / 100
															: item.price;
														return (price * item.quantity).toLocaleString(
															"ru-RU",
														);
													})()} ₽
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

			<div className="estimator-footer">
				<div className="estimator-footer-label">
					Итого по плану:
				</div>
				<div className="estimator-total">
					{total.toLocaleString("ru-RU")}{" "}
					<span>
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
									showToast("Подпись добавлена. Нажмите 'Сохранить'.", "info");
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
