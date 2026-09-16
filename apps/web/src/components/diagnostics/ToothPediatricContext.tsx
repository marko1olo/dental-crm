import React, { useState, useEffect } from "react";
import {
	Check,
	FileText,
	Heart,
	Printer,
} from "lucide-react";
import {
	type FranklRating,
	type FranklRatingDefinition,
	getFranklDefinition,
} from "../odontogram/pediatricDentitionEngine";
import { FranklBehaviorBadge } from "../pediatric/FranklBehaviorBadge";
import type { ToothData } from "../odontogram/ToothChart";
import type { RootResorptionStage } from "../odontogram/anatomicalToothGeometries";
import { showToast } from "../GlobalToast";

export interface ToothPediatricContextProps {
	toothNumber: number;
	toothData?: ToothData | undefined;
	patientName?: string | undefined;
	patientAgeYears?: number | undefined;
	doctorName?: string | undefined;
	initialFrankl?: FranklRating | undefined;
	onUpdateTooth?: ((updates: Partial<ToothData>) => void) | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
	onOpenParentMemo?: (() => void) | undefined;
}

export interface PediatricResorptionStageOption {
	readonly id: RootResorptionStage;
	readonly stage: RootResorptionStage;
	readonly percent: number;
	readonly label: string;
	readonly sub: string;
	readonly stageName: string;
}

export const RESORPTION_STAGES: readonly PediatricResorptionStageOption[] = [
	{
		id: 25,
		stage: 25,
		percent: 25,
		label: "I стадия (25%)",
		sub: "Апикальная резорбция (25% длины корня)",
		stageName: "I стадия — апикальная резорбция",
	},
	{
		id: 50,
		stage: 50,
		percent: 50,
		label: "II стадия (50%)",
		sub: "Средняя резорбция (50% длины корня)",
		stageName: "II стадия — средняя резорбция",
	},
	{
		id: 75,
		stage: 75,
		percent: 75,
		label: "III стадия (75%)",
		sub: "Пришеечная резорбция (сохранена 1/3)",
		stageName: "III стадия — пришеечная резорбция",
	},
	{
		id: 100,
		stage: 100,
		percent: 100,
		label: "IV стадия (100%)",
		sub: "Полная резорбция / эксфолиация (выпадение)",
		stageName: "IV стадия — полная резорбция / эксфолиация",
	},
] as const;

export interface PediatricMemoPrintData {
	readonly patientName?: string | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly franklRating?: FranklRating | undefined;
	readonly toothNumber?: number | undefined;
	readonly resorptionStage?: RootResorptionStage | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicPhone?: string | undefined;
}

/**
 * Generates clean, publication-grade printable HTML for the pediatric parent memo.
 * Adheres to Mandate 8d item 7: zero cartoon emojis, strictly professional vector/typography.
 */
export function generatePediatricMemoHtml(data: PediatricMemoPrintData): string {
	const patientName = data.patientName || "Юный пациент";
	const patientAgeYears = data.patientAgeYears ?? 6;
	const doctorName = data.doctorName || "Детский врач-стоматолог";
	const toothNumber = data.toothNumber;
	const franklRating = data.franklRating ?? 3;
	const franklDef = getFranklDefinition(franklRating);
	const clinicName = data.clinicName || "ООО «Стоматологическая клиника DENTE» (Детское отделение)";
	const clinicPhone = data.clinicPhone || "+7 (495) 000-00-00";
	const todayStr = new Date().toLocaleDateString("ru-RU", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	const resorptionItem = data.resorptionStage
		? RESORPTION_STAGES.find((s) => s.stage === data.resorptionStage)
		: undefined;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8" />
	<title>Памятка для родителей — ${patientName}</title>
	<style>
		@page { size: A4; margin: 15mm 15mm 15mm 15mm; }
		* { box-sizing: border-box; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
			font-size: 11pt;
			line-height: 1.45;
			color: #1e293b;
			background: #ffffff;
			margin: 0;
			padding: 12px;
		}
		.memo-header {
			border-bottom: 2px solid #0d9488;
			padding-bottom: 10px;
			margin-bottom: 14px;
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
		}
		.clinic-title {
			font-size: 13pt;
			font-weight: 800;
			color: #0f766e;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}
		.doc-title {
			font-size: 15pt;
			font-weight: 800;
			color: #0f172a;
			margin: 4px 0 2px 0;
		}
		.doc-subtitle {
			font-size: 10pt;
			color: #64748b;
		}
		.date-badge {
			font-size: 9.5pt;
			color: #475569;
			text-align: right;
		}
		.info-grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 8px 16px;
			background: #f8fafc;
			border: 1px solid #e2e8f0;
			border-radius: 8px;
			padding: 10px 14px;
			margin-bottom: 14px;
			font-size: 10pt;
		}
		.info-item {
			display: flex;
			gap: 6px;
		}
		.info-label {
			font-weight: 600;
			color: #64748b;
			white-space: nowrap;
		}
		.info-val {
			font-weight: 700;
			color: #0f172a;
		}
		.section-card {
			border: 1px solid #e2e8f0;
			border-radius: 8px;
			padding: 12px 14px;
			margin-bottom: 12px;
			background: #ffffff;
		}
		.section-title {
			font-size: 11pt;
			font-weight: 700;
			color: #0f766e;
			margin-bottom: 6px;
			border-bottom: 1px solid #f1f5f9;
			padding-bottom: 4px;
		}
		.alert-box {
			background: #fffbeb;
			border-left: 4px solid #f59e0b;
			padding: 8px 12px;
			border-radius: 4px;
			margin: 8px 0;
			font-size: 10pt;
			color: #92400e;
		}
		ul {
			margin: 6px 0;
			padding-left: 20px;
		}
		li {
			margin-bottom: 4px;
			text-align: justify;
		}
		.signatures-row {
			display: flex;
			justify-content: space-between;
			margin-top: 24px;
			padding-top: 14px;
			border-top: 1px dashed #cbd5e1;
			font-size: 10pt;
		}
		.sig-col {
			width: 48%;
		}
		.sig-line {
			border-bottom: 1px solid #0f172a;
			margin-top: 28px;
			display: flex;
			justify-content: space-between;
			font-size: 8.5pt;
			color: #64748b;
			padding-top: 2px;
		}
		@media print {
			body { padding: 0; }
			.no-print { display: none; }
		}
	</style>
</head>
<body>
	<div class="no-print" style="background:#f0fdfa; border:1px solid #0d9488; padding:10px 14px; border-radius:8px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
		<span style="font-size:12px; color:#0f766e;"><strong>Памятка для родителей после детского стоматологического приёма</strong></span>
		<button onclick="window.print()" style="padding:6px 14px; background:#0d9488; color:#ffffff; border:none; border-radius:6px; font-weight:700; cursor:pointer; font-size:12px;">Печать (Ctrl+P)</button>
	</div>

	<div class="memo-header">
		<div>
			<div class="clinic-title">${clinicName}</div>
			<div class="doc-title">ПАМЯТКА ДЛЯ РОДИТЕЛЕЙ</div>
			<div class="doc-subtitle">Рекомендации по уходу и режиму после детского стоматологического приёма</div>
		</div>
		<div class="date-badge">
			<div>Дата: <strong>${todayStr}</strong></div>
			<div>Тел. клиники: ${clinicPhone}</div>
		</div>
	</div>

	<div class="info-grid">
		<div class="info-item">
			<span class="info-label">Пациент:</span>
			<span class="info-val">${patientName}, ${patientAgeYears} лет</span>
		</div>
		<div class="info-item">
			<span class="info-label">Лечащий врач:</span>
			<span class="info-val">${doctorName}</span>
		</div>
		<div class="info-item">
			<span class="info-label">Зуб (FDI):</span>
			<span class="info-val">${toothNumber ? `#${toothNumber}` : "Осмотр зубного ряда"}</span>
		</div>
		<div class="info-item">
			<span class="info-label">Шкала Франкла:</span>
			<span class="info-val">${franklDef.symbol} (${franklDef.nameRu})</span>
		</div>
	</div>

	<div class="section-card">
		<div class="section-title">1. ПОВЕДЕНИЕ НА ПРИЕМЕ И ПСИХОЛОГИЧЕСКАЯ АДАПТАЦИЯ</div>
		<p style="margin: 4px 0 6px 0; font-size: 10pt;">
			<strong>Оценка контакта:</strong> ${franklDef.descriptionRu}
		</p>
		<p style="margin: 4px 0; font-size: 10pt;">
			На приеме успешно применены техники психологической адаптации Tell-Show-Do («Сказать — Показать — Сделать»).
			<strong>Обязательно похвалите ребенка</strong> за смелость и сотрудничество с доктором — позитивное подкрепление формирует спокойное отношение к стоматологии на всю жизнь!
		</p>
	</div>

	${resorptionItem ? `
	<div class="section-card">
		<div class="section-title">2. СТАТУС СМЕНЫ ЗУБА #${toothNumber} (ФИЗИОЛОГИЧЕСКАЯ РЕЗОРБЦИЯ)</div>
		<p style="margin: 4px 0; font-size: 10pt;">
			Зафиксирована <strong>${resorptionItem.stageName}</strong> (${resorptionItem.percent}% длины корня).
			Это естественный физиологический процесс подготовки к прорезыванию постоянного зуба.
			При появлении физиологической подвижности зуба рекомендуется избегать откусывания твердых предметов (орехи, сухари) данной стороной.
		</p>
	</div>
	` : ""}

	<div class="section-card">
		<div class="section-title">${resorptionItem ? "3" : "2"}. ВАЖНЫЕ РЕКОМЕНДАЦИИ ПОСЛЕ АНЕСТЕЗИИ И ЛЕЧЕНИЯ</div>
		<div class="alert-box">
			<strong>ВНИМАНИЕ — КОНТРОЛЬ ОНЕМЕНИЯ!</strong><br />
			Действие местной анестезии продолжается от 1.5 до 2.5 часов.
			Внимательно следите, чтобы ребенок <strong>не кусал и не жевал онемевшую губу, щеку или язык</strong>!
			Это самая частая детская травма после лечения. Не позволяйте ребенку трогать губу руками.
		</div>
		<ul>
			<li><strong>Прием пищи:</strong> воздержитесь от приема твердой и горячей пищи до полного окончания действия анестезии (пока не вернется полная чувствительность).</li>
			<li><strong>Питьевой режим:</strong> можно пить негазированную воду комнатной температуры (желательно через трубочку).</li>
			<li><strong>Первые сутки:</strong> исключите слишком горячие, кислые, соленые и острые блюда.</li>
			<li><strong>При болезненности:</strong> при возникновении дискомфорта после отхождения анестезии возможен прием детского обезболивающего (Ибупрофен / Парацетамол в возрастной дозировке по инструкции).</li>
		</ul>
	</div>

	<div class="section-card">
		<div class="section-title">${resorptionItem ? "4" : "3"}. ДОМАШНЯЯ ГИГИЕНА И ПРОФИЛАКТИКА</div>
		<ul>
			<li><strong>Контроль родителей:</strong> до возраста 8–9 лет родители ОБЯЗАТЕЛЬНО контролируют и дочищают зубы ребенку минимум 1 раз в день (перед сном).</li>
			<li><strong>Зубная паста:</strong> используйте пасту с фторидами, соответствующую возрасту ребенка (до 6 лет — 1000 ppm F-, старше 6 лет — 1450 ppm F-).</li>
			<li><strong>Сладости:</strong> ограничьте липкие сладости (ириски, леденцы, чупа-чупсы, жевательный мармелад) и сладкие газированные напитки между приемами пищи.</li>
			<li><strong>Профилактический осмотр:</strong> контрольный осмотр у детского стоматолога рекомендуется каждые 3–4 месяца.</li>
		</ul>
	</div>

	<div class="signatures-row">
		<div class="sig-col">
			<div>Врач-стоматолог детский:</div>
			<div class="sig-line">
				<span>Подпись: ________________________</span>
				<span>/ ${doctorName} /</span>
			</div>
		</div>
		<div class="sig-col">
			<div>Памятку получил(а), рекомендации понятны:</div>
			<div class="sig-line">
				<span>Подпись родителя: __________________</span>
				<span>/ ________________________ /</span>
			</div>
		</div>
	</div>

	<script>
		if (window.opener) {
			setTimeout(function() { window.print(); }, 250);
		}
	</script>
</body>
</html>`;
}

/**
 * Triggers instant 1-click printing of the pediatric parent memo.
 * Uses window.open with iframe fallback to bypass popup blockers.
 */
export function printPediatricParentMemo(data: PediatricMemoPrintData): void {
	if (typeof window === "undefined") {
		return;
	}

	const html = generatePediatricMemoHtml(data);
	const printWindow = window.open("", "_blank");

	if (printWindow) {
		printWindow.document.write(html);
		printWindow.document.close();
		printWindow.focus();
		showToast("Памятка для родителей открыта для печати", "success");
	} else {
		const iframe = document.createElement("iframe");
		iframe.style.position = "fixed";
		iframe.style.right = "0";
		iframe.style.bottom = "0";
		iframe.style.width = "0";
		iframe.style.height = "0";
		iframe.style.border = "0";
		document.body.appendChild(iframe);
		iframe.contentDocument?.write(html);
		iframe.contentDocument?.close();
		iframe.contentWindow?.focus();
		iframe.contentWindow?.print();
		setTimeout(() => {
			if (iframe.parentNode) {
				document.body.removeChild(iframe);
			}
		}, 1000);
		showToast("Памятка для родителей отправлена на печать", "success");
	}
}

export const ToothPediatricContext: React.FC<ToothPediatricContextProps> = ({
	toothNumber,
	toothData,
	patientName = "Юный пациент",
	patientAgeYears = 6,
	doctorName = "Детский врач-стоматолог",
	initialFrankl = 3,
	onUpdateTooth,
	onInsertToProtocol,
	onOpenParentMemo,
}) => {
	const [franklRating, setFranklRating] = useState<FranklRating>(initialFrankl);

	const initialResorption: RootResorptionStage | undefined =
		(toothData?.rootResorptionStage && toothData.rootResorptionStage > 0)
			? toothData.rootResorptionStage
			: (toothData?.rootResorption && toothData.rootResorption > 0)
				? toothData.rootResorption
				: undefined;

	const [selectedResorption, setSelectedResorption] = useState<RootResorptionStage | undefined>(
		initialResorption,
	);

	useEffect(() => {
		const currentResorption: RootResorptionStage | undefined =
			(toothData?.rootResorptionStage && toothData.rootResorptionStage > 0)
				? toothData.rootResorptionStage
				: (toothData?.rootResorption && toothData.rootResorption > 0)
					? toothData.rootResorption
					: undefined;
		setSelectedResorption(currentResorption);
	}, [toothData?.rootResorptionStage, toothData?.rootResorption]);

	const activeFranklDef: FranklRatingDefinition = getFranklDefinition(franklRating);

	const handleFranklChange = (rating: FranklRating) => {
		setFranklRating(rating);
		const def = getFranklDefinition(rating);
		showToast(`Шкала Франкла обновлена: ${def.symbol} (${def.nameRu})`, "info");
	};

	const handleResorptionChange = (stage: RootResorptionStage) => {
		const next: RootResorptionStage | undefined = selectedResorption === stage ? undefined : stage;
		setSelectedResorption(next);
		onUpdateTooth?.({
			rootResorptionStage: next as RootResorptionStage,
		});
		if (next) {
			const stageItem = RESORPTION_STAGES.find((s) => s.stage === next);
			const label = stageItem?.label || `${next}%`;
			showToast(`Физиологическая резорбция зуба #${toothNumber}: ${label}`, "info");
		} else {
			showToast(`Физиологическая резорбция зуба #${toothNumber} сброшена`, "info");
		}
	};

	const handleInsertResorptionProtocol = () => {
		const currentStageItem = selectedResorption
			? RESORPTION_STAGES.find((s) => s.stage === selectedResorption)
			: undefined;

		const stageName = currentStageItem?.stageName || "Физиологическая резорбция корней";
		const percent = currentStageItem?.percent ?? (selectedResorption ?? 25);

		const text = currentStageItem
			? `Физиологическая резорбция корней зуба #${toothNumber}: ${stageName} (${percent}%). Физиологическая смена прикуса.`
			: `Физиологическая резорбция корней зуба #${toothNumber}: признаки резорбции корней отсутствуют (0%). Физиологическая норма.`;

		if (onInsertToProtocol) {
			onInsertToProtocol(text);
			showToast(`Запись о резорбции зуба #${toothNumber} внесена в 043/у!`, "success");
		} else {
			try {
				navigator.clipboard.writeText(text);
				showToast("Протокол резорбции скопирован", "success");
			} catch {
				showToast("Не удалось скопировать", "error");
			}
		}
	};

	const handleInsertPsychologicalProtocol = () => {
		const text = `Психоэмоциональный статус ребенка (Шкала Франкла): ${activeFranklDef.symbol} (${activeFranklDef.nameRu}). Применены техники психологической адаптации Tell-Show-Do («Сказать-Показать-Сделать»). Контакт установлен продуктивно.`;
		if (onInsertToProtocol) {
			onInsertToProtocol(text);
			showToast(`Психологический статус Франкла внесен в 043/у!`, "success");
		} else {
			try {
				navigator.clipboard.writeText(text);
				showToast("Протокол адаптации скопирован", "success");
			} catch {
				showToast("Не удалось скопировать", "error");
			}
		}
	};

	return (
		<div className="dente-warm-tool-card" data-testid="tooth-pediatric-context">
			<div className="dente-warm-tool-header">
				<div className="dente-warm-tool-title-group">
					<Heart size={18} color="#ec4899" />
					<h3 className="dente-warm-tool-title">
						Детский прием: Шкала Франкла & Резорбция (FDI #{toothNumber})
					</h3>
				</div>
				<div
					className="dente-warm-tag"
					style={{
						backgroundColor: activeFranklDef.badgeBg,
						color: activeFranklDef.badgeColor,
						borderColor: activeFranklDef.badgeBorder,
					}}
				>
					<span>Франкл {activeFranklDef.symbol}</span>
				</div>
			</div>

			{/* Frankl Rating Badge with Tell-Show-Do Strategies */}
			<div className="dente-pediatric-badge-wrapper">
				<FranklBehaviorBadge
					rating={franklRating}
					onChange={handleFranklChange}
					showStrategies={true}
					compact={false}
				/>
			</div>

			{/* Physiological Root Resorption Staging (For Deciduous Teeth) */}
			<div className="dente-resorption-box">
				<div className="dente-surface-label-row">
					<label className="dente-field-label" style={{ marginBottom: 0 }}>
						Физиологическая резорбция корней молочного зуба:
					</label>
					<button
						type="button"
						onClick={handleInsertResorptionProtocol}
						className="dente-secondary-btn"
						style={{ minHeight: "32px", height: "32px", padding: "4px 10px", fontSize: "12px", gap: "6px" }}
						title={`Внести запись о резорбции корней зуба #${toothNumber} в карту 043/у`}
					>
						<FileText size={14} />
						<span>Внести в 043/у</span>
					</button>
				</div>
				<div className="dente-resorption-grid">
					{RESORPTION_STAGES.map((st) => {
						const isSelected = selectedResorption === st.stage;
						return (
							<button
								key={st.id}
								type="button"
								onClick={() => handleResorptionChange(st.stage)}
								className={`dente-resorption-btn ${isSelected ? "selected" : ""}`}
							>
								<span className="resorption-title">{st.label}</span>
								<span className="resorption-sub">{st.sub}</span>
								{isSelected && <Check size={13} className="resorption-check" />}
							</button>
						);
					})}
				</div>
			</div>

			{/* Actions Row: TSD to 043/u and Parent Memo */}
			<div className="dente-pediatric-footer">
				<button
					type="button"
					onClick={handleInsertPsychologicalProtocol}
					className="dente-secondary-btn"
					style={{ minHeight: "32px", height: "32px", padding: "0 10px", fontSize: "12px" }}
				>
					<FileText size={15} />
					<span>Вставить статус Франкла в 043/у</span>
				</button>

				<button
					type="button"
					onClick={() => {
						if (onOpenParentMemo) {
							onOpenParentMemo();
						}
						printPediatricParentMemo({
							patientName,
							patientAgeYears,
							doctorName,
							franklRating,
							toothNumber,
							resorptionStage: selectedResorption,
						});
					}}
					className="dente-primary-action-btn"
					style={{ minHeight: "36px", height: "36px", padding: "0 14px", fontSize: "13px" }}
				>
					<Printer size={15} />
					<span>Печать памятки для родителей...</span>
				</button>
			</div>
		</div>
	);
};

export default ToothPediatricContext;
