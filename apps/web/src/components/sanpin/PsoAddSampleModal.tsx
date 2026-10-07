import { AlertTriangle, CheckCircle2, FlaskConical, X } from "lucide-react";
import React, { useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import {
	DENTAL_PSO_INSTRUMENT_CATEGORIES,
	STATUTORY_PSO_REAGENTS,
	evaluatePsoCleaningBatch,
} from "./sanpinAzopyramEngine";
import type { CreatePsoCleaningLogDto, PsoTestTypeEnum } from "@dental/shared";

export interface PsoAddSampleModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	defaultNurseName?: string;
}

export function PsoAddSampleModal({
	isOpen,
	onClose,
	onSuccess,
	defaultNurseName = "Сотрудник клиники",
}: PsoAddSampleModalProps) {
	const [formInstrument, setFormInstrument] = useState("Стоматологические боры, наконечники, зеркала, зонды");
	const [formTestType, setFormTestType] = useState<PsoTestTypeEnum>("both");
	const [formBatchCount, setFormBatchCount] = useState<number>(100);
	const [formSampleCount, setFormSampleCount] = useState<number>(3);
	const [formAzopyramNeg, setFormAzopyramNeg] = useState(true);
	const [formPhenolNeg, setFormPhenolNeg] = useState(true);
	const [formSudanNeg, setFormSudanNeg] = useState(true);
	const [formDetergent, setFormDetergent] = useState("Биолот 0.5% + Аламинол 1%");
	const [formNurseName] = useState(defaultNurseName);
	const [formReagentLot, setFormReagentLot] = useState<string>(STATUTORY_PSO_REAGENTS.azopyram.standardLotNumber);
	const [formSolutionPreparedAt, setFormSolutionPreparedAt] = useState<string>(() => new Date().toISOString());
	const [formNotes, setFormNotes] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const liveEval = useMemo(() => {
		return evaluatePsoCleaningBatch({
			batchItemCount: formBatchCount,
			testedSampleCount: formSampleCount,
			isAzopyramNegative: formAzopyramNeg,
			isPhenolphthaleinNegative: formPhenolNeg,
			isSudanNegative: formSudanNeg,
			azopyramSolutionPreparedAt: formSolutionPreparedAt,
			azopyramReagentLot: formReagentLot,
			detergentBrand: formDetergent,
		});
	}, [formBatchCount, formSampleCount, formAzopyramNeg, formPhenolNeg, formSudanNeg, formSolutionPreparedAt, formReagentLot, formDetergent]);

	if (!isOpen) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (submitting) return;

		if (liveEval.isSolutionExpired) {
			showToast("Срок годности рабочего раствора азопирама истек (> 2 часов). Запрещено использовать старый раствор! Приготовьте свежую порцию 1:1 с 3% H2O2.", "error");
			return;
		}

		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const solutionTime = new Date(formSolutionPreparedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

			const payload: CreatePsoCleaningLogDto = {
				instrumentName: formInstrument,
				testType: formTestType,
				batchItemCount: Number(formBatchCount),
				testedSampleCount: Number(formSampleCount),
				isAzopyramNegative: formAzopyramNeg,
				isPhenolphthaleinNegative: formPhenolNeg,
				isSudanNegative: formSudanNeg,
				detergentBrand: formDetergent || undefined,
				notes: formNotes
					? `${formNotes} | [Серия: ${formReagentLot}, Раствор: ${solutionTime}] [ЭЦП: ${formNurseName}]`
					: `[Серия: ${formReagentLot}, Раствор: ${solutionTime}] [ЭЦП: ${formNurseName}]`,
			};

			const res = await fetch("/api/registers/pso", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify(payload),
			});

			if (res.ok) {
				const isAllPassed = formAzopyramNeg && formPhenolNeg && formSudanNeg;
				showToast(
					isAllPassed
						? "Запись контроля ПСО внесена (норма, партия допущена)"
						: "ВНИМАНИЕ: Зафиксирован БРАК ПСО! Партия направлена на повторную очистку.",
					isAllPassed ? "success" : "warning",
				);
				onClose();
				onSuccess();
			} else {
				const err = await res.json();
				showToast(err.message || "Ошибка при сохранении ПСО", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка при сохранении", "error");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="sanpin-modal-overlay" role="dialog" aria-modal="true">
			<div className="sanpin-modal" style={{ maxWidth: "640px" }}>
				<div className="sanpin-modal-header" style={{ padding: "1.25rem 1.5rem" }}>
					<h3 style={{ fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<FlaskConical size={22} color="var(--brand-primary, #2563eb)" />
						Контроль качества ПСО (азопирамовая проба)
					</h3>
					<button
						type="button"
						onClick={onClose}
						style={{
							minWidth: "44px",
							minHeight: "44px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							background: "none",
							border: "none",
							cursor: "pointer",
							color: "var(--muted)",
						}}
					>
						<X size={20} />
					</button>
				</div>

				<form onSubmit={handleSubmit}>
					<div className="sanpin-modal-body" style={{ padding: "1.5rem", gap: "1.25rem" }}>
						<div className="sanpin-form-group">
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
								<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600, margin: 0 }}>
									Наименование обрабатываемого инструментария
								</label>
								<button
									type="button"
									onClick={() => {
										setFormInstrument("Стоматологические боры, наконечники, терапевтические и хирургические наборы (зеркала, зонды, гладилки)");
										setFormBatchCount(100);
										setFormSampleCount(3);
										setFormTestType("both");
										setFormAzopyramNeg(true);
										setFormPhenolNeg(true);
										setFormDetergent("Биолот 0.5% + Аламинол 1%");
										setFormNotes("Проба отрицательная, норма");
									}}
									className="sanpin-btn sanpin-btn-secondary touch-manipulation"
									style={{ fontSize: "0.8rem", padding: "0.25rem 0.6rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
								>
									<CheckCircle2 size={13} color="#16a34a" /> <span>Заполнить нормой</span>
								</button>
							</div>

							{/* Category presets per shift */}
							<div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.5rem" }}>
								{DENTAL_PSO_INSTRUMENT_CATEGORIES.map((cat) => (
									<button
										key={cat.id}
										type="button"
										onClick={() => {
											setFormInstrument(cat.nameRu);
											const minSample = cat.isSurgicalOrCritical ? 5 : 3;
											if (formSampleCount < minSample) {
												setFormSampleCount(minSample);
											}
										}}
										className="sanpin-btn touch-manipulation"
										style={{
											fontSize: "0.75rem",
											padding: "0.2rem 0.5rem",
											borderRadius: "4px",
											border: formInstrument === cat.nameRu ? "1.5px solid var(--brand-primary, #2563eb)" : "1px solid var(--border)",
											background: formInstrument === cat.nameRu ? "rgba(37, 99, 235, 0.08)" : "var(--paper)",
											color: formInstrument === cat.nameRu ? "var(--brand-primary, #2563eb)" : "var(--foreground)",
											fontWeight: formInstrument === cat.nameRu ? 600 : 400,
											cursor: "pointer",
										}}
									>
										{cat.nameRu.split(" (")[0]}
									</button>
								))}
							</div>

							<input
								type="text"
								required
								value={formInstrument}
								onChange={(e) => setFormInstrument(e.target.value)}
								className="sanpin-input"
								style={{ minHeight: "44px", fontSize: "0.9rem" }}
								placeholder="Стоматологические боры, зеркала, зонды, пинцеты, наконечники"
							/>
						</div>

						<div className="sanpin-form-row">
							<div className="sanpin-form-group">
								<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
									Объем партии (шт)
								</label>
								<input
									type="number"
									min={1}
									required
									value={formBatchCount}
									onChange={(e) => {
										const count = parseInt(e.target.value, 10) || 1;
										setFormBatchCount(count);
										const minSample = Math.max(3, Math.ceil(count * 0.01));
										if (formSampleCount < minSample) {
											setFormSampleCount(minSample);
										}
									}}
									className="sanpin-input"
									style={{ minHeight: "44px", fontSize: "0.95rem", fontWeight: 700 }}
								/>
								<span className="sanpin-form-hint" style={{ fontSize: "0.8rem" }}>
									Выборка от 1% партии (не менее 3-5 шт.)
								</span>
							</div>

							<div className="sanpin-form-group">
								<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
									Количество проверенных образцов (шт)
								</label>
								<input
									type="number"
									min={1}
									required
									value={formSampleCount}
									onChange={(e) => setFormSampleCount(parseInt(e.target.value, 10) || 1)}
									className="sanpin-input"
									style={{ minHeight: "44px", fontSize: "0.95rem", fontWeight: 700 }}
								/>
								<span className="sanpin-form-hint" style={{ fontSize: "0.8rem" }}>
									Минимум по формуле: {Math.max(3, Math.ceil(formBatchCount * 0.01))} шт.
								</span>
							</div>
						</div>

						<div className="sanpin-form-row">
							<div className="sanpin-form-group">
								<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
									Серия азопирама / реактивов
								</label>
								<input
									type="text"
									required
									value={formReagentLot}
									onChange={(e) => setFormReagentLot(e.target.value)}
									className="sanpin-input"
									style={{ minHeight: "44px", fontSize: "0.9rem" }}
									placeholder="АЗО-2026/08-114"
								/>
							</div>

							<div className="sanpin-form-group">
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
									<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600, margin: 0 }}>
										Приготовлен (макс. 2 ч)
									</label>
									<button
										type="button"
										onClick={() => {
											setFormSolutionPreparedAt(new Date().toISOString());
											showToast("Приготовлен свежий рабочий раствор 1:1 с 3% H2O2. Срок 2 ч обновлен.", "success");
										}}
										className="sanpin-btn sanpin-btn-secondary touch-manipulation"
										style={{ fontSize: "0.75rem", padding: "0.15rem 0.4rem" }}
										title="Обновить время приготовления раствора"
									>
										Свежий раствор
									</button>
								</div>
								<div
									style={{
										minHeight: "44px",
										display: "flex",
										alignItems: "center",
										padding: "0 0.75rem",
										borderRadius: "0.375rem",
										border: "1px solid var(--border)",
										background: liveEval.isSolutionExpired ? "rgba(239, 68, 68, 0.1)" : "var(--paper)",
										color: liveEval.isSolutionExpired ? "#dc2626" : "var(--foreground)",
										fontSize: "0.82rem",
										fontWeight: 600,
									}}
								>
									{new Date(formSolutionPreparedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} — {liveEval.isSolutionExpired ? "Раствор просрочен (>2 ч)" : `Годен еще ${liveEval.solutionTimeRemainingMinutes} мин.`}
								</div>
							</div>
						</div>

						<div className="sanpin-form-group">
							<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
								Вид химической пробы
							</label>
							<select
								value={formTestType}
								onChange={(e) => setFormTestType(e.target.value as PsoTestTypeEnum)}
								className="sanpin-select"
								style={{ minHeight: "44px", fontSize: "0.9rem" }}
							>
								<option value="both">Азопирамовая + Фенолфталеиновая (Рекомендуется)</option>
								<option value="sudan_iii">Проба с Суданом III (наконечники: остаточные масла и жиры)</option>
								<option value="all">Полный комплекс СанПиН 3.3686-21 (Азопирам + Фенолфталеин + Судан III)</option>
								<option value="azopyram">Только азопирамовая (на скрытую кровь / гемоглобин)</option>
								<option value="phenolphthalein">Только фенолфталеиновая (на остатки щелочных моющих средств)</option>
							</select>
						</div>

						<div className="sanpin-form-row">
							{(formTestType === "both" || formTestType === "all" || formTestType === "azopyram") && (
								<div className="sanpin-form-group">
									<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
										Азопирамовая проба (кровь)
									</label>
									<select
										value={formAzopyramNeg ? "negative" : "positive"}
										onChange={(e) => setFormAzopyramNeg(e.target.value === "negative")}
										className="sanpin-select"
										style={{ minHeight: "44px", fontSize: "0.9rem" }}
									>
										<option value="negative">Отрицательная (Окрашивания нет — НОРМА)</option>
										<option value="positive">Положительная (Фиолетовое окрашивание — КРОВЬ)</option>
									</select>
								</div>
							)}

							{(formTestType === "both" || formTestType === "all" || formTestType === "phenolphthalein") && (
								<div className="sanpin-form-group">
									<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
										Фенолфталеиновая проба (щелочь)
									</label>
									<select
										value={formPhenolNeg ? "negative" : "positive"}
										onChange={(e) => setFormPhenolNeg(e.target.value === "negative")}
										className="sanpin-select"
										style={{ minHeight: "44px", fontSize: "0.9rem" }}
									>
										<option value="negative">Отрицательная (Окрашивания нет — НОРМА)</option>
										<option value="positive">Положительная (Розовое окрашивание — ЩЕЛОЧЬ)</option>
									</select>
								</div>
							)}

							{(formTestType === "sudan_iii" || formTestType === "all") && (
								<div className="sanpin-form-group">
									<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
										Проба с Суданом III (масла / смазки)
									</label>
									<select
										value={formSudanNeg ? "negative" : "positive"}
										onChange={(e) => setFormSudanNeg(e.target.value === "negative")}
										className="sanpin-select"
										style={{ minHeight: "44px", fontSize: "0.9rem" }}
									>
										<option value="negative">Отрицательная (Окрашивания нет — НОРМА)</option>
										<option value="positive">Положительная (Желто-розовые капли — МАСЛО)</option>
									</select>
								</div>
							)}
						</div>

						{/* Clinical Protocol on Positive Test */}
						{(!formAzopyramNeg || !formPhenolNeg || !formSudanNeg) && (
							<div
								style={{
									padding: "0.85rem",
									borderRadius: "0.5rem",
									background: "rgba(239, 68, 68, 0.12)",
									border: "1.5px solid #ef4444",
									color: "#991b1b",
									fontSize: "0.85rem",
									lineHeight: "1.4",
								}}
							>
								<div style={{ fontWeight: 700, marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
									<AlertTriangle size={16} color="#dc2626" />
									КЛИНИЧЕСКИЙ РЕГЛАМЕНТ ПРИ ПОЛОЖИТЕЛЬНОЙ ПРОБЕ (МУ 287-113, СанПиН 3.3686-21):
								</div>
								{!formAzopyramNeg && (
									<div style={{ marginBottom: "0.35rem" }}>
										• <strong>Скрытая кровь (фиолетово-синее окрашивание):</strong> Вся партия изделий ({formBatchCount} шт.) бракуется на 100% и направляется на повторную дезинфекцию, ПСО и контроль качества.
									</div>
								)}
								{!formPhenolNeg && (
									<div style={{ marginBottom: "0.35rem" }}>
										• <strong>Щелочные остатки моющих средств (розовое окрашивание):</strong> Вся партия изделий ({formBatchCount} шт.) бракуется на 100% и направляется на повторное ополаскивание проточной и дистиллированной водой до нейтральной реакции.
									</div>
								)}
								{!formSudanNeg && (
									<div>
										• <strong>Масляные смазки и жировые пленки (желто-розовые пятна Судана III):</strong> Вся партия наконечников ({formBatchCount} шт.) бракуется и направляется на обезжиривание 70% спиртом, продувку и повторную ПСО.
									</div>
								)}
							</div>
						)}

						<div className="sanpin-form-group">
							<label className="sanpin-form-label" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
								Моющее / дезинфицирующее средство
							</label>
							<input
								type="text"
								value={formDetergent}
								onChange={(e) => setFormDetergent(e.target.value)}
								className="sanpin-input"
								style={{ minHeight: "44px", fontSize: "0.9rem" }}
								placeholder="Например: Биолот 0.5% + Аламинол 1%"
							/>
						</div>

						{/* Live regulatory validation box */}
						<div
							style={{
								padding: "1rem",
								borderRadius: "0.5rem",
								background: liveEval.isBatchApproved ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
								border: `1.5px solid ${liveEval.isBatchApproved ? "rgba(16, 185, 129, 0.35)" : "rgba(239, 68, 68, 0.35)"}`,
								display: "flex",
								alignItems: "flex-start",
								gap: "0.6rem",
							}}
							title="Соответствует санитарным нормам"
						>
							{liveEval.isBatchApproved ? (
								<CheckCircle2 size={20} color="#059669" style={{ flexShrink: 0, marginTop: "2px" }} />
							) : (
								<AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
							)}
							<div>
								<div style={{ fontWeight: 700, fontSize: "0.9rem", color: liveEval.isBatchApproved ? "#059669" : "#dc2626" }}>
									{liveEval.isBatchApproved
										? "Партия соответствует нормативам и допущена к стерилизации"
										: "ВНИМАНИЕ: Партия НЕ ДОПУСКАЕТСЯ к стерилизации"}
								</div>
								{liveEval.rejectionReasons.length > 0 && (
									<div style={{ marginTop: "0.35rem", fontSize: "0.85rem", color: "#dc2626" }}>
										{liveEval.rejectionReasons.join("; ")}
									</div>
								)}
							</div>
						</div>
					</div>

					<div className="sanpin-modal-footer" style={{ padding: "1.25rem 1.5rem", gap: "0.75rem" }}>
						<button
							type="button"
							onClick={onClose}
							className="sanpin-btn sanpin-btn-secondary"
							style={{ minHeight: "44px", padding: "0.6rem 1.25rem" }}
						>
							Отмена
						</button>
						<button
							type="submit"
							aria-busy={submitting}
							className="sanpin-btn sanpin-btn-primary"
							style={{ minHeight: "44px", padding: "0.6rem 1.5rem", fontSize: "0.95rem", fontWeight: 700 }}
						>
							{submitting ? "Сохранение..." : "Зафиксировать пробу в журнале"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
