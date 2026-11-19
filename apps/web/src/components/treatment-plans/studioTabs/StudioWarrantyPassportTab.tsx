/**
 * StudioWarrantyPassportTab.tsx — Вкладка «Гарантийный паспорт и срок службы» в студии планов лечения (SSOT).
 * Мандаты 8b, 8e, 8x: Чистый клинический язык без канцелярита, автономия врача, 0 disabled кнопок.
 * Канонические сроки: Эконом — 1 год / 5 лет, Оптимум — 3 года / 10 лет, Премиум — 10 лет / 25 лет.
 */

import React from "react";
import { ShieldCheck, Award, Calendar, CheckCircle2, FileText, Printer, Sparkles } from "lucide-react";
import type { TreatmentPlanTier } from "../treatmentPlanTypes";
import { printHtmlViaIframe } from "../../documents/printHtmlViaIframe";

export interface StudioWarrantyPassportTabProps {
	readonly activeTier: TreatmentPlanTier;
	readonly patientName?: string | undefined;
	readonly doctorFullName?: string | undefined;
}

export const StudioWarrantyPassportTab: React.FC<StudioWarrantyPassportTabProps> = ({
	activeTier,
	patientName = "Пациент",
	doctorFullName = "Лечащий врач",
}) => {
	const sanitizedTitle = activeTier.title.replace(/^[^a-zA-Zа-яА-Я0-9]+/, "");

	// Определение сервисных сроков по тарифу
	const serviceLifeYears = activeTier.tierId === "premium" ? 25 : activeTier.tierId === "optimum" ? 10 : 5;

	// Динамическое формирование стандартов на основе реальных услуг, входящих в тариф
	const materialStandards = React.useMemo(() => {
		const allItems = activeTier.stages?.flatMap((s) => s.items ?? []) ?? [];
		const materialsList = activeTier.materialsList ?? [];

		const matchesKeywords = (keywords: readonly string[]) => {
			return allItems.some((it) => {
				const text = `${it.name ?? ""} ${it.category ?? ""}`.toLowerCase();
				return keywords.some((kw) => text.includes(kw));
			}) || materialsList.some((mat) => {
				const text = mat.toLowerCase();
				return keywords.some((kw) => text.includes(kw));
			});
		};

		const hasImplant = matchesKeywords(["имплант", "имплантат", "абатмент", "синус-лифтинг", "остеопластик", "кость"]);
		const hasOrthopedics = matchesKeywords(["коронк", "винир", "протез", "вкладк", "накладк", "керамик", "циркони", "e.max", "металлокерамик", "мостовидн"]);
		const hasTherapy = matchesKeywords(["кариес", "пломб", "реставраци", "композит", "эндодонти", "пульпит", "периодонтит", "канал"]);
		const hasHygiene = matchesKeywords(["гигиен", "чистк", "air-flow", "air flow", "ультразвук", "фторирован", "отбеливан", "полировк", "gbt"]);

		const standards: Array<{ name: string; cert: string; warranty: string }> = [];

		if (hasImplant) {
			if (activeTier.tierId === "premium") {
				standards.push({
					name: "Премиальная имплантационная система с гидрофильной поверхностью",
					cert: "ISO 13485 / CE 0123 / ASTM F136",
					warranty: "Пожизненная гарантия завода",
				});
			} else if (activeTier.tierId === "optimum") {
				standards.push({
					name: "Дентальные имплантаты с микропористой SLA-поверхностью",
					cert: "SLA поверхность / ISO 13485",
					warranty: "Гарантия производителя 15 лет",
				});
			} else {
				standards.push({
					name: "Стандартная имплантационная система базового класса",
					cert: "Остеокондуктивная титановая резьба Grade 4",
					warranty: "Гарантия производителя 5 лет",
				});
			}
		}

		if (hasOrthopedics) {
			if (activeTier.tierId === "premium") {
				standards.push(
					{
						name: "Высокотранслюцентный диоксид циркония с многослойным градиентом",
						cert: "Многослойный градиент прочности 1100 МПа",
						warranty: "10 лет клинической стойкости",
					},
					{
						name: "Прессованная керамика из дисиликата лития высокой прочности",
						cert: "Медицинский дисиликат лития 530 МПа",
						warranty: "10 лет клинической гарантии",
					},
				);
			} else if (activeTier.tierId === "optimum") {
				standards.push({
					name: "Керамические коронки и виниры из дисиликата лития CAD/CAM",
					cert: "Дисиликат лития / CAD-CAM фрезерование",
					warranty: "3 года гарантии клиники",
				});
			} else {
				standards.push({
					name: "Металлокерамические коронки на биосовместимом Co-Cr каркасе",
					cert: "Медицинский сплав Co-Cr без никеля",
					warranty: "1 год клинической гарантии",
				});
			}
		}

		if (hasTherapy) {
			if (activeTier.tierId === "premium") {
				standards.push({
					name: "Нанокомпозитный реставрационный материал премиум-класса с опалесценцией",
					cert: "Субмикронный наполнитель 84% / ISO 4049",
					warranty: "5 лет клинической гарантии",
				});
			} else if (activeTier.tierId === "optimum") {
				standards.push({
					name: "Наногибридный композит светового отверждения повышенной полируемости",
					cert: "Субмикронный сферический наполнитель 82%",
					warranty: "3 года гарантии клиники",
				});
			} else {
				standards.push({
					name: "Светоотверждаемый микрогибридный композит",
					cert: "ГОСТ Р 56924-2016 / CE",
					warranty: "1 год клинической гарантии",
				});
			}
		}

		if (hasHygiene) {
			if (activeTier.tierId === "premium") {
				standards.push({
					name: "Протокол бережной гигиены GBT с низкоабразивным эритритолом",
					cert: "Guided Biofilm Therapy / Швейцарский стандарт",
					warranty: "Контроль биопленки 6 месяцев",
				});
			} else {
				standards.push({
					name: "Профессиональная гигиена полости рта (Air-Flow + ультразвук)",
					cert: "Биосовместимый порошок глицина / ГОСТ",
					warranty: "Гарантия гигиенической нормы 6 месяцев",
				});
			}
		}

		// Если ни одна категория не определена (пустой план или консультация), возвращаем базовый стандарт тарифа
		if (standards.length === 0) {
			if (activeTier.tierId === "premium") {
				return [
					{ name: "Премиальные сертифицированные биосовместимые материалы", cert: "ISO 13485 / CE 0123", warranty: "10 лет клинической гарантии" },
					{ name: "Высокоточная CAD/CAM обработка и индивидуальная эстетика", cert: "Многослойный градиент прочности", warranty: "Повышенная износостойкость" },
				];
			}
			if (activeTier.tierId === "optimum") {
				return [
					{ name: "Сертифицированные наногибридные и керамические материалы", cert: "ISO 13485 / ГОСТ Р", warranty: "3 года гарантии клиники" },
				];
			}
			return [
				{ name: "Базовые сертифицированные стоматологические материалы", cert: "ГОСТ Р 56924-2016 / CE", warranty: "1 год клинической гарантии" },
			];
		}

		return standards;
	}, [activeTier]);

	const handlePrintPassport = () => {
		const standardsRows = materialStandards
			.map(
				(m) =>
					`<tr><td><strong>${m.name}</strong><br/><small style="color:#64748b">${m.cert}</small></td><td style="color:#0f766e;font-weight:600">${m.warranty}</td></tr>`,
			)
			.join("");

		const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<title>Гарантийный паспорт — Тариф «${sanitizedTitle}»</title>
<style>
  @page { size: A4 portrait; margin: 15mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.5; margin: 0; padding: 0; font-size: 13px; }
  .header { border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end; }
  .clinic-name { font-size: 16px; font-weight: 800; color: #0d9488; letter-spacing: 0.5px; }
  .doc-title { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; font-size: 13px; }
  .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
  .highlight-row { display: flex; gap: 16px; margin-bottom: 18px; }
  .highlight-card { flex: 1; border: 1.5px solid #0d9488; border-radius: 8px; padding: 12px; background: #f0fdfa; text-align: center; }
  .highlight-val { font-size: 22px; font-weight: 800; color: #0f766e; }
  .highlight-lbl { font-size: 11px; color: #64748b; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 12px; }
  th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
  th { background: #f1f5f9; font-weight: 700; color: #334155; }
  .rules-box { border: 1px dashed #0d9488; border-radius: 8px; padding: 12px; font-size: 11px; color: #334155; margin-bottom: 20px; background: #fafafa; }
  .rules-box ul { margin: 6px 0 0 16px; padding: 0; }
  .footer-sign { display: flex; justify-content: space-between; margin-top: 28px; font-size: 12px; }
  .sign-col { width: 220px; }
  .sign-line { border-bottom: 1px solid #0f172a; margin-top: 40px; }
  .sign-hint { font-size: 10px; color: #64748b; text-align: center; margin-top: 4px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="clinic-name">Стоматологическая клиника ДЕНТЕ</div>
      <div class="doc-title">Гарантийный паспорт и сертификат качества</div>
    </div>
    <div style="text-align: right; font-size: 11px; color: #64748b;">
      Дата выдачи: ${new Date().toLocaleDateString("ru-RU")}<br/>
      Тариф лечения: <strong>«${sanitizedTitle}»</strong>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-box">
      <span style="color: #64748b; font-size: 11px;">Пациент:</span><br/>
      <strong>${patientName}</strong>
    </div>
    <div class="meta-box">
      <span style="color: #64748b; font-size: 11px;">Лечащий врач-стоматолог:</span><br/>
      <strong>${doctorFullName}</strong>
    </div>
  </div>

  <div class="highlight-row">
    <div class="highlight-card">
      <div class="highlight-val">${activeTier.warrantyYears} ${activeTier.warrantyYears === 1 ? "год" : activeTier.warrantyYears === 3 ? "года" : "лет"}</div>
      <div class="highlight-lbl">Безусловная гарантия клиники</div>
    </div>
    <div class="highlight-card">
      <div class="highlight-val">до ${serviceLifeYears} лет</div>
      <div class="highlight-lbl">Прогнозируемый срок службы</div>
    </div>
  </div>

  <h4 style="margin: 0 0 8px; font-size: 13px; color: #0f172a;">Спецификация сертифицированных биосовместимых материалов</h4>
  <table>
    <thead>
      <tr>
        <th style="width: 70%;">Материал и стандарт сертификации</th>
        <th style="width: 30%;">Гарантийное обязательство</th>
      </tr>
    </thead>
    <tbody>
      ${standardsRows}
    </tbody>
  </table>

  <div class="rules-box">
    <strong>Правила сохранения и пролонгации гарантии:</strong>
    <ul>
      <li>Прохождение профилактического осмотра и профессиональной гигиены не реже 1 раза в 6 месяцев.</li>
      <li>Соблюдение рекомендаций врача по индивидуальной домашней гигиене полости рта.</li>
      <li>При возникновении любого дискомфорта — немедленное обращение в клинику без самостоятельных вмешательств.</li>
    </ul>
  </div>

  <div class="footer-sign">
    <div class="sign-col">
      Врач: ____________________<br/>
      <div class="sign-line"></div>
      <div class="sign-hint">подпись / личная печать врача</div>
    </div>
    <div class="sign-col">
      Пациент: ____________________<br/>
      <div class="sign-line"></div>
      <div class="sign-hint">с условиями гарантии ознакомлен(а)</div>
    </div>
  </div>
</body>
</html>`;

		printHtmlViaIframe(html, "dente-studio-warranty-print-iframe");
	};

	return (
		<div className="space-y-5 max-w-3xl mx-auto" data-testid="studio-warranty-passport-tab">
			{/* 1. Главная карточка гарантийного статуса */}
			<div className="p-5 rounded-2xl border border-[var(--teal,#0d9488)]/40 bg-[var(--paper-soft)] shadow-xs space-y-4">
				<div className="flex items-center justify-between flex-wrap gap-3">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
							<ShieldCheck className="w-6 h-6" />
						</div>
						<div>
							<span className="text-[11px] font-bold text-[var(--teal,#0d9488)] tracking-wider block">
								Гарантийный сертификат качества DENTE
							</span>
							<h3 className="text-base sm:text-lg font-black text-[var(--ink)] m-0 flex items-center gap-1.5">
								{activeTier.isRecommended && <ShieldCheck className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />}
								<span>Тариф «{sanitizedTitle}»</span>
							</h3>
						</div>
					</div>

					<button
						type="button"
						onClick={handlePrintPassport}
						className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line-subtle)] text-xs font-bold text-[var(--ink)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
						data-testid="print-warranty-passport-btn"
					>
						<Printer className="w-4 h-4 text-[var(--muted)]" />
						<span>Печать гарантийного паспорта</span>
					</button>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--line)]">
					<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center gap-3">
						<Award className="w-5 h-5 text-[var(--teal,#0d9488)] shrink-0" />
						<div>
							<div className="text-[11px] text-[var(--muted)] font-medium">Безусловная гарантия клиники</div>
							<div className="text-base font-black text-[var(--ink)]">
								{`${activeTier.warrantyYears} ${activeTier.warrantyYears === 1 ? "год" : activeTier.warrantyYears === 3 ? "года" : "лет"}`}
							</div>
						</div>
					</div>

					<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center gap-3">
						<Calendar className="w-5 h-5 text-[var(--teal,#0d9488)] shrink-0" />
						<div>
							<div className="text-[11px] text-[var(--muted)] font-medium">Прогнозируемый срок службы</div>
							<div className="text-base font-black text-[var(--ink)]">
								{`до ${serviceLifeYears} лет службы`}
							</div>
						</div>
					</div>
				</div>

				<div className="text-xs text-[var(--muted)] leading-relaxed">
					Пациент: <strong className="text-[var(--ink)]">{patientName}</strong> · Лечащий врач:{" "}
					<strong className="text-[var(--ink)]">{doctorFullName}</strong>.
					При возникновении любых вопросов по состоянию выполненных работ гарантийное обслуживание проводится бесплатно в приоритетном порядке.
				</div>
			</div>

			{/* 2. Сертификаты и спецификация материалов */}
			<div className="p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
				<h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] m-0 flex items-center gap-2">
					<FileText className="w-4 h-4 text-[var(--teal,#0d9488)]" />
					<span>Сертифицированные биосовместимые материалы тарифа</span>
				</h4>

				<div className="space-y-2.5">
					{materialStandards.map((mat, idx) => (
						<div key={idx} className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-start justify-between gap-3 text-xs">
							<div className="space-y-0.5 min-w-0">
								<div className="font-bold text-[var(--ink)]">{mat.name}</div>
								<div className="text-[11px] text-[var(--muted)]">{mat.cert}</div>
							</div>
							<span className="text-[11px] font-bold text-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.1))] px-2 py-0.5 rounded-md shrink-0">
								{mat.warranty}
							</span>
						</div>
					))}
				</div>
			</div>

			{/* 3. Условия сохранения и пролонгации гарантии */}
			<div className="p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-3">
				<h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] m-0 flex items-center gap-2">
					<CheckCircle2 className="w-4 h-4 text-[var(--teal,#0d9488)]" />
					<span>Простые правила сохранения гарантии</span>
				</h4>

				<ul className="space-y-2 text-xs text-[var(--muted)] m-0 pl-0 list-none">
					<li className="flex items-start gap-2">
						<CheckCircle2 className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
						<span>Контрольный осмотр и профессиональная гигиена полости рта 1 раз в 6 месяцев.</span>
					</li>
					<li className="flex items-start gap-2">
						<CheckCircle2 className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
						<span>Соблюдение индивидуальных рекомендаций лечащего врача по ежедневной домашней гигиене.</span>
					</li>
					<li className="flex items-start gap-2">
						<CheckCircle2 className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
						<span>Своевременное обращение в клинику при возникновении дискомфорта без самостоятельного вмешательства.</span>
					</li>
				</ul>
			</div>
		</div>
	);
};

export default StudioWarrantyPassportTab;
