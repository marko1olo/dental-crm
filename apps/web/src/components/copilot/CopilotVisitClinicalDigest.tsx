/**
 * CopilotVisitClinicalDigest.tsx — Клинический дайджест визита и реактивная гидратация состояния для Копайлота DENTE.
 * Мандаты:
 * - Мандат 8e: Автономия врача, отсутствие блокировок, 0-клик сценарии.
 * - Мандат 8am: Строго 1 Primary CTA на видимый контекст.
 * - Мандат 8wy: Честный продакшн, чтение реального состояния одонтограммы из useVisitStore и одонтограммы пациента.
 * - Apple HIG: Сенсорные таргеты >= 44px на мобильных, плотные 36px на десктопе, аккуратная типографика без капслока.
 */

import React, { useMemo, useState, useEffect } from "react";
import { Sparkles, CheckCircle2, Activity, Receipt, FileText, Zap } from "lucide-react";
import { useVisitStore } from "../../store/visitStore";
import { showToast } from "../GlobalToast";
import { loadStoredTeethData } from "../odontogram/odontogramStorage";
import type { ToothState } from "../../store/visit/types";
import {
	type FindingItem,
	normalizeToothStateKey,
	TOOTH_STATE_NAMES,
} from "./clinicalDigestConstants";

export { normalizeToothStateKey, TOOTH_STATE_NAMES };
export type { FindingItem };

interface CopilotVisitClinicalDigestProps {
	activeTooth?: number | null | undefined;
	patientId?: string | null | undefined;
	onSendMessage: (prompt: string) => void;
	showEmptyStateIfNoFindings?: boolean;
}

export const CopilotVisitClinicalDigest: React.FC<CopilotVisitClinicalDigestProps> = ({
	activeTooth,
	patientId,
	onSendMessage,
	showEmptyStateIfNoFindings = true,
}) => {
	const storeToothStates = useVisitStore((s) => s.visitToothStateByCode);
	const storeToothRecords = useVisitStore((s) => s.visitToothRecordsByCode);
	const storeActiveTooth = useVisitStore((s) => s.activeToothNumber);

	// Поддержка реактивного хука и прямого снимка getState() (включая SSR и тесты)
	const visitToothStateByCode =
		storeToothStates && Object.keys(storeToothStates).length > 0
			? storeToothStates
			: useVisitStore.getState().visitToothStateByCode;
	const visitToothRecordsByCode =
		storeToothRecords && Object.keys(storeToothRecords).length > 0
			? storeToothRecords
			: useVisitStore.getState().visitToothRecordsByCode;
	const effectiveTooth =
		activeTooth ??
		storeActiveTooth ??
		useVisitStore.getState().activeToothNumber ??
		null;

	const [digestVersion, setDigestVersion] = useState(0);

	// Реактивная подписка на обновления одонтограммы из любых источников
	useEffect(() => {
		if (typeof window === "undefined") return;
		const onUpdate = () => setDigestVersion((v) => v + 1);
		window.addEventListener("dente-odontogram-update", onUpdate);
		window.addEventListener("dente-update-tooth-state", onUpdate);
		return () => {
			window.removeEventListener("dente-odontogram-update", onUpdate);
			window.removeEventListener("dente-update-tooth-state", onUpdate);
		};
	}, []);

	// Извлекаем все активные находки осмотра из одонтограммы пациента и useVisitStore
	const findings: FindingItem[] = useMemo(() => {
		const map = new Map<number, FindingItem>();

		// 1. Читаем постоянное состояние одонтограммы пациента (если задан patientId)
		if (patientId) {
			const stored = loadStoredTeethData(patientId);
			if (stored && Array.isArray(stored)) {
				for (const t of stored) {
					if (!t || !t.toothNumber) continue;
					const st = String(t.state || "");
					const normKey = normalizeToothStateKey(st);
					if (normKey === "healthy" || normKey === "idle" || normKey === "0" || normKey === "") continue;

					const meta = TOOTH_STATE_NAMES[normKey] || {
						title: `Статус: ${st}`,
						icd10: "K02.1",
						treatment: "Лечение по протоколу СтАР",
						priceKopecks: 500000,
					};

					map.set(t.toothNumber, {
						tooth: t.toothNumber,
						state: normKey as ToothState,
						stateTitle: meta.title,
						icd10: meta.icd10,
						diagnosisLabel: `${meta.title} (${meta.icd10})`,
						treatmentSummary: meta.treatment,
						priceKopecks: meta.priceKopecks,
					});
				}
			}
		}

		// 2. Накладываем оперативное состояние визита из useVisitStore
		for (const [codeStr, state] of Object.entries(visitToothStateByCode)) {
			if (!state) continue;
			const normKey = normalizeToothStateKey(state);
			const toothNum = parseInt(codeStr, 10);
			if (Number.isNaN(toothNum)) continue;

			if (normKey === "healthy" || normKey === "idle") {
				map.delete(toothNum);
				continue;
			}

			const meta = TOOTH_STATE_NAMES[normKey] || {
				title: `Статус: ${state}`,
				icd10: "K02.1",
				treatment: "Лечение по протоколу СтАР",
				priceKopecks: 500000,
			};
			const rec = visitToothRecordsByCode[codeStr];

			map.set(toothNum, {
				tooth: toothNum,
				state: normKey as ToothState,
				stateTitle: rec?.diagnosis || meta.title,
				icd10: rec?.diagnosisIcd10 || meta.icd10,
				diagnosisLabel: `${rec?.diagnosis || meta.title} (${rec?.diagnosisIcd10 || meta.icd10})`,
				treatmentSummary: rec?.treatmentPlan || meta.treatment,
				priceKopecks: meta.priceKopecks,
			});
		}

		return Array.from(map.values()).sort((a, b) => a.tooth - b.tooth);
	}, [visitToothStateByCode, visitToothRecordsByCode, patientId, digestVersion]);

	// Комплексное применение по всем найденным зубам (1-клик мандат 8e)
	const handleBatchApplyAllTeeth = () => {
		if (findings.length === 0) return;

		// 1. Диспатчим события SOAP для каждого зуба
		for (const f of findings) {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						tooth: f.tooth,
						toothNumber: f.tooth,
						state: f.state,
						diagnosis: f.diagnosisLabel,
						diagnosisIcd10: f.icd10,
						treatmentPlan: f.treatmentSummary,
						finding: {
							toothNumber: f.tooth,
							state: f.state,
							icd10Override: f.icd10,
						},
					},
				}),
			);
		}

		// 2. Диспатчим добавление услуг в смету / кассу по всем зубам с ценой > 0
		const billableServices = findings
			.filter((f) => f.priceKopecks > 0)
			.map((f) => ({
				code: `srv-${f.tooth}-${f.state}`,
				name: `Лечение зуба ${f.tooth}: ${f.stateTitle}`,
				toothNumber: f.tooth,
				toothCode: String(f.tooth),
				price: f.priceKopecks / 100,
				unitPriceRub: f.priceKopecks / 100,
			}));

		if (billableServices.length > 0) {
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						patientId: patientId || undefined,
						toothNumber: findings[0]?.tooth,
						services: billableServices,
						items: billableServices,
					},
				}),
			);
		}

		// 3. Отправляем в чат Копайлота структурированный отчет
		const summaryText = `Сформирован комплексный протокол приёма по ${findings.length} зубам (${findings.map((f) => f.tooth).join(", ")}): дневник SOAP обновлен, услуги внесены в смету визита.`;
		onSendMessage(summaryText);
		showToast(`Оформлен приём по ${findings.length} зубам (SOAP + Смета)`, "success");
	};

	// 1-клик вставка только в дневник SOAP
	const handleApplySoapOnly = () => {
		for (const f of findings) {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						tooth: f.tooth,
						toothNumber: f.tooth,
						state: f.state,
						diagnosis: f.diagnosisLabel,
						diagnosisIcd10: f.icd10,
						treatmentPlan: f.treatmentSummary,
					},
				}),
			);
		}
		showToast(`Дневник приёма SOAP обновлён по ${findings.length} зубам`, "success");
	};

	// 1-клик вставка только в смету
	const handleApplyInvoiceOnly = () => {
		const billableServices = findings
			.filter((f) => f.priceKopecks > 0)
			.map((f) => ({
				code: `srv-${f.tooth}-${f.state}`,
				name: `Лечение зуба ${f.tooth}: ${f.stateTitle}`,
				toothNumber: f.tooth,
				toothCode: String(f.tooth),
				price: f.priceKopecks / 100,
				unitPriceRub: f.priceKopecks / 100,
			}));

		if (billableServices.length > 0) {
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						patientId: patientId || undefined,
						toothNumber: findings[0]?.tooth,
						services: billableServices,
						items: billableServices,
					},
				}),
			);
			showToast(`Смета пополнена на ${billableServices.length} услуг`, "success");
		}
	};

	// СЦЕНАРИЙ А: Врач расставил зубы на одонтограмме (2 и более зубов)
	if (findings.length >= 2) {
		const totalEstimatedRub = findings.reduce((acc, f) => acc + f.priceKopecks, 0) / 100;

		return (
			<div className="copilot-visit-digest-batch p-4 rounded-2xl bg-[var(--paper-soft,#f4f7f6)] border border-[var(--teal,#0d9488)]/25 space-y-3.5" data-testid="copilot-batch-visit-digest">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<div className="w-7 h-7 rounded-lg bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
							<Activity size={15} />
						</div>
						<div>
							<h4 className="text-xs font-bold text-[var(--ink)] m-0">Результаты осмотра визита</h4>
							<p className="text-[11px] text-[var(--muted)] m-0">На одонтограмме отмечено {findings.length} зуба(ов)</p>
						</div>
					</div>
					<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--paper)] text-[var(--teal,#0d9488)] border border-[var(--line)]">
						~{totalEstimatedRub.toLocaleString("ru-RU")} ₽
					</span>
				</div>

				{/* Список найденных патологий */}
				<div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
					{findings.map((f) => (
						<div key={f.tooth} className="p-2 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between text-xs gap-2">
							<div className="flex items-center gap-2 min-w-0">
								<span className="w-6 h-6 rounded-md bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] font-bold text-[11px] flex items-center justify-center shrink-0">
									{f.tooth}
								</span>
								<div className="min-w-0">
									<div className="font-semibold text-[var(--ink)] truncate">{f.stateTitle}</div>
									<div className="text-[10px] text-[var(--muted)] truncate">{f.treatmentSummary}</div>
								</div>
							</div>
							<span className="text-[11px] font-mono font-medium text-[var(--muted)] shrink-0">
								{f.icd10}
							</span>
						</div>
					))}
				</div>

				{/* Ровно 1 Primary CTA кнопка и вторичные нейтральные действия */}
				<div className="space-y-2 pt-1">
					<button
						type="button"
						onClick={handleBatchApplyAllTeeth}
						className="copilot-primary-cta w-full h-11 min-h-[44px] px-4 rounded-xl bg-[var(--teal,#0d9488)] hover:opacity-95 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
						data-testid="copilot-batch-apply-btn"
					>
						<Zap size={15} />
						<span>Оформить приём по всем зубам (SOAP + Смета)</span>
					</button>

					<div className="grid grid-cols-2 gap-2">
						<button
							type="button"
							onClick={handleApplySoapOnly}
							className="h-10 min-h-[40px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line)] text-[var(--ink)] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
						>
							<FileText size={13} className="text-[var(--teal,#0d9488)] shrink-0" />
							<span>Только в SOAP</span>
						</button>
						<button
							type="button"
							onClick={handleApplyInvoiceOnly}
							className="h-10 min-h-[40px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line)] text-[var(--ink)] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
						>
							<Receipt size={13} className="text-[var(--teal,#0d9488)] shrink-0" />
							<span>Только в смету</span>
						</button>
					</div>
				</div>
			</div>
		);
	}

	// СЦЕНАРИЙ Б: Отмечен ровно 1 зуб (или выбран конкретный зуб с известной патологией)
	const singleFinding = findings.length === 1 ? findings[0] : (effectiveTooth ? findings.find((f) => f.tooth === effectiveTooth) : null);
	if (singleFinding) {
		const f = singleFinding;
		return (
			<div className="copilot-visit-digest-single p-4 rounded-2xl bg-[var(--paper-soft,#f4f7f6)] border border-[var(--teal,#0d9488)]/25 space-y-3" data-testid="copilot-single-tooth-digest">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-xl bg-[var(--teal,#0d9488)] text-white font-bold text-sm flex items-center justify-center shrink-0">
							{f.tooth}
						</div>
						<div>
							<h4 className="text-xs font-bold text-[var(--ink)] m-0">{f.stateTitle}</h4>
							<p className="text-[11px] text-[var(--muted)] m-0">Диагноз МКБ-10: {f.icd10}</p>
						</div>
					</div>
					<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--paper)] text-[var(--teal,#0d9488)] border border-[var(--line)]">
						~{(f.priceKopecks / 100).toLocaleString("ru-RU")} ₽
					</span>
				</div>

				<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-xs space-y-1">
					<div className="text-[11px] text-[var(--muted)]">Рекомендуемый клинический протокол СтАР:</div>
					<div className="font-medium text-[var(--ink)] leading-snug">{f.treatmentSummary}</div>
				</div>

				<div className="space-y-2 pt-1">
					<button
						type="button"
						onClick={() => {
							window.dispatchEvent(
								new CustomEvent("dente-apply-soap-protocol", {
									detail: {
										tooth: f.tooth,
										toothNumber: f.tooth,
										state: f.state,
										diagnosis: f.diagnosisLabel,
										diagnosisIcd10: f.icd10,
										treatmentPlan: f.treatmentSummary,
									},
								}),
							);
							window.dispatchEvent(
								new CustomEvent("dente-add-services-to-invoice", {
									detail: {
										patientId: patientId || undefined,
										toothNumber: f.tooth,
										services: [{ code: `srv-${f.tooth}`, name: `Лечение зуба ${f.tooth}: ${f.stateTitle}`, toothNumber: f.tooth, price: f.priceKopecks / 100 }],
									},
								}),
							);
							onSendMessage(`Оформлено лечение зуба ${f.tooth}: ${f.stateTitle} (${f.icd10}). Протокол и смета добавлены.`);
							showToast(`Зуб ${f.tooth}: протокол и смета применены`, "success");
						}}
						className="copilot-primary-cta w-full h-11 min-h-[44px] px-4 rounded-xl bg-[var(--teal,#0d9488)] hover:opacity-95 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
					>
						<Zap size={15} />
						<span>Оформить зуб {f.tooth} (SOAP + Смета)</span>
					</button>

					<div className="grid grid-cols-2 gap-2">
						<button
							type="button"
							onClick={() => onSendMessage(`Сформируй протокол приёма SOAP для зуба ${f.tooth}: ${f.stateTitle}`)}
							className="h-10 min-h-[40px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line)] text-[var(--ink)] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
						>
							<FileText size={13} className="text-[var(--teal,#0d9488)] shrink-0" />
							<span>Дневник SOAP</span>
						</button>
						<button
							type="button"
							onClick={() => onSendMessage(`Сформируй смету на лечение зуба ${f.tooth}`)}
							className="h-10 min-h-[40px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line)] text-[var(--ink)] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
						>
							<Receipt size={13} className="text-[var(--teal,#0d9488)] shrink-0" />
							<span>Смета лечения</span>
						</button>
					</div>
				</div>
			</div>
		);
	}

	// Если находок нет и показ пустого состояния отключен (например, внутри идущего чата)
	if (!showEmptyStateIfNoFindings) {
		return null;
	}

	// СЦЕНАРИЙ В: Чистая одонтограмма (ничего еще не отмечено, пациент только сел)
	const toothTarget = effectiveTooth || 36;
	return (
		<div className="copilot-visit-digest-empty flex flex-col items-center justify-center text-center py-4 px-2 h-full" data-testid="copilot-dialog-empty-state">
			<div className="w-10 h-10 rounded-2xl bg-[var(--teal-soft,rgba(13,148,136,0.12))] border border-[var(--teal,#0d9488)]/25 flex items-center justify-center text-[var(--teal,#0d9488)] mb-2 shrink-0">
				<Sparkles size={20} />
			</div>
			<h3 className="text-sm font-bold text-[var(--ink)] m-0">Клинический диалог пуст</h3>
			<p className="text-xs text-[var(--muted)] max-w-[340px] mt-1 mb-3 leading-relaxed">
				Задайте клинический вопрос или начните диктовку приёма («36 кариес, септанест, биодентин, эстелайт») либо выберите сценарий:
			</p>

			<div className="grid grid-cols-2 gap-2 w-full max-w-[440px]" data-testid="copilot-empty-starters">
				{[
					{
						id: "st-norm",
						label: `✓ Норма (Зуб ${toothTarget})`,
						prompt: `Зафиксируй зуб ${toothTarget}: норма, интактный, без патологии`,
						icon: <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />,
					},
					{
						id: "st-caries",
						label: `Кариес ${toothTarget} (Эстелайт)`,
						prompt: `Зафиксируй кариес дентина зуба ${toothTarget}, препарирование полости и нанокомпозит Estelite Asteria`,
						icon: <Activity size={13} className="text-[var(--teal,#0d9488)] shrink-0" />,
					},
					{
						id: "st-anes",
						label: `Артикаин 1.7 мл (${toothTarget})`,
						prompt: `Инфильтрационная анестезия: Артикаин 1:100 000, 1.7 мл (Зуб ${toothTarget})`,
						icon: <Zap size={13} className="text-amber-600 shrink-0" />,
					},
					{
						id: "st-hygiene",
						label: "Профгигиена (УЗ + AirFlow)",
						prompt: "Профессиональная гигиена полости рта: снятие зубных отложений УЗ-скейлером, Air-Flow, полировка пастой",
						icon: <Sparkles size={13} className="text-blue-600 shrink-0" />,
					},
				].map((s) => (
					<button
						key={s.id}
						type="button"
						onClick={() => onSendMessage(s.prompt)}
						className="p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f4f7f6)] hover:bg-[var(--line)] text-left text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all flex items-center gap-2 shadow-2xs"
					>
						{s.icon}
						<span className="whitespace-normal leading-tight">{s.label}</span>
					</button>
				))}
			</div>
		</div>
	);
};

export default CopilotVisitClinicalDigest;
