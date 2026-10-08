/**
 * acquiringReconciliation.ts — Layer 2: Acquiring vs KKT Reconciliation Engine ("Копейка в копейку").
 */

import {
	kopecksToRub,
} from "@dental/shared";
import type {
	AcquiringReconciliationReport,
	AcquiringTerminalTransaction,
	KktFiscalElectronicRecord,
	ReconciledTransaction,
} from "./types";

export function reconcileAcquiringWithKkt(
	terminalTxs: readonly AcquiringTerminalTransaction[],
	kktRecords: readonly KktFiscalElectronicRecord[],
): AcquiringReconciliationReport {
	const approvedTerminal = terminalTxs.filter((t) => t.status === "approved");
	const matchedKktIds = new Set<string>();
	const matchedTerminalIds = new Set<string>();
	const reconciledList: ReconciledTransaction[] = [];

	let totalTerminalKop = 0;
	let totalKktKop = 0;

	for (const t of approvedTerminal) {
		totalTerminalKop += t.amountKopecks;
	}
	for (const k of kktRecords) {
		totalKktKop += k.electronicAmountKopecks;
	}

	// 1. Поиск точных совпадений по RRN или AuthCode
	for (const t of approvedTerminal) {
		const matchedByRrn = kktRecords.find(
			(k) => !matchedKktIds.has(k.id) && k.terminalRrn && k.terminalRrn === t.rrn,
		);
		const matchedByAuth = !matchedByRrn
			? kktRecords.find((k) => !matchedKktIds.has(k.id) && k.authCode && k.authCode === t.authCode)
			: undefined;

		const match = matchedByRrn || matchedByAuth;

		if (match) {
			matchedKktIds.add(match.id);
			matchedTerminalIds.add(t.id);

			const diffKop = t.amountKopecks - match.electronicAmountKopecks;
			const isAmountSame = diffKop === 0;

			reconciledList.push({
				id: `rec-match-${t.id}-${match.id}`,
				status: isAmountSame ? "matched" : "amount_mismatch",
				terminalTx: t,
				kktRecord: match,
				terminalAmountRub: t.amountRub,
				kktAmountRub: match.electronicAmountRub,
				diffRub: kopecksToRub(diffKop),
				diffKopecks: diffKop,
				explanationRu: isAmountSame
					? "Сумма по терминалу и чек ККТ 54-ФЗ совпадают копейка в копейку"
					: `Расхождение суммы: терминал ${t.amountRub.toFixed(2)} ₽, касса ${match.electronicAmountRub.toFixed(2)} ₽`,
				suggestedActionRu: isAmountSame
					? "Действий не требуется. Сверка успешна."
					: "Проверить частичную оплату или провести чек коррекции на разницу.",
			});
		}
	}

	// 2. Поиск совпадений по точной сумме и близкому времени (fallback по сумме)
	for (const t of approvedTerminal) {
		if (matchedTerminalIds.has(t.id)) continue;

		const matchByAmount = kktRecords.find(
			(k) => !matchedKktIds.has(k.id) && k.electronicAmountKopecks === t.amountKopecks,
		);

		if (matchByAmount) {
			matchedKktIds.add(matchByAmount.id);
			matchedTerminalIds.add(t.id);

			reconciledList.push({
				id: `rec-amount-match-${t.id}-${matchByAmount.id}`,
				status: "matched",
				terminalTx: t,
				kktRecord: matchByAmount,
				terminalAmountRub: t.amountRub,
				kktAmountRub: matchByAmount.electronicAmountRub,
				diffRub: 0,
				diffKopecks: 0,
				explanationRu: "Сопоставлено по точной сумме операции",
				suggestedActionRu: "Привязать RRN транзакции к фискальному чеку.",
			});
		}
	}

	// 3. Транзакции терминала без чека ККТ (списание есть, чек не пробит!)
	for (const t of approvedTerminal) {
		if (!matchedTerminalIds.has(t.id)) {
			reconciledList.push({
				id: `rec-missing-kkt-${t.id}`,
				status: "missing_kkt_receipt",
				terminalTx: t,
				terminalAmountRub: t.amountRub,
				kktAmountRub: 0,
				diffRub: t.amountRub,
				diffKopecks: t.amountKopecks,
				explanationRu: `Оплата по карте ${t.panMasked} (RRN ${t.rrn}) прошла успешно, но чек в ККТ не сформирован!`,
				suggestedActionRu: "Срочно пробить фискальный чек прихода 54-ФЗ по безналичному расчету.",
			});
		}
	}

	// 4. Записи ККТ без транзакции в терминале
	for (const k of kktRecords) {
		if (!matchedKktIds.has(k.id)) {
			reconciledList.push({
				id: `rec-missing-term-${k.id}`,
				status: "missing_terminal_charge",
				kktRecord: k,
				terminalAmountRub: 0,
				kktAmountRub: k.electronicAmountRub,
				diffRub: -k.electronicAmountRub,
				diffKopecks: -k.electronicAmountKopecks,
				explanationRu: `Чек ФД №${k.fiscalDocNumber} пробит по безналичному расчету, но списание в терминале отсутствует.`,
				suggestedActionRu: "Проверить оплату через СБП/QR или оформить чек коррекции при ошибочном пробитии.",
			});
		}
	}

	let matchedCount = 0;
	let missingKktCount = 0;
	let missingTerminalCount = 0;
	let mismatchAmountCount = 0;

	for (const item of reconciledList) {
		if (item.status === "matched") matchedCount++;
		else if (item.status === "missing_kkt_receipt") missingKktCount++;
		else if (item.status === "missing_terminal_charge") missingTerminalCount++;
		else if (item.status === "amount_mismatch") mismatchAmountCount++;
	}

	const totalDiffKop = totalTerminalKop - totalKktKop;
	const isExactMatch = totalDiffKop === 0 && missingKktCount === 0 && missingTerminalCount === 0 && mismatchAmountCount === 0;

	const summaryTitleRu = isExactMatch
		? "Сверка сошлась на 100% (Расхождений 0.00 ₽ — точно в копейку)"
		: `Обнаружены расхождения: терминал ${kopecksToRub(totalTerminalKop).toFixed(2)} ₽ vs касса ${kopecksToRub(totalKktKop).toFixed(2)} ₽ (разница ${(kopecksToRub(Math.abs(totalDiffKop))).toFixed(2)} ₽)`;

	return {
		totalTerminalRub: kopecksToRub(totalTerminalKop),
		totalTerminalKopecks: totalTerminalKop,
		totalKktRub: kopecksToRub(totalKktKop),
		totalKktKopecks: totalKktKop,
		totalDiffRub: kopecksToRub(totalDiffKop),
		totalDiffKopecks: totalDiffKop,
		isExactMatch,
		matchedCount,
		missingKktCount,
		missingTerminalCount,
		mismatchAmountCount,
		reconciledItems: reconciledList,
		summaryTitleRu,
	};
}

export function exportAcquiringReconciliationToCsv(report: AcquiringReconciliationReport): string {
	const BOM = "\uFEFF";
	const header = "Статус сверки;RRN Эквайринга;Карта / Тип;Сумма терминала (руб);ФД ККТ №;ФПД;Сумма ККТ (руб);Разница (руб);Пояснение;Рекомендуемое действие\n";

	const rows = report.reconciledItems.map((item) => {
		const statusRu =
			item.status === "matched"
				? "Сошлось точно"
				: item.status === "missing_kkt_receipt"
				? "Списание есть / Чек НЕ пробит"
				: item.status === "missing_terminal_charge"
				? "Чек ККТ есть / Списания нет"
				: "Расхождение суммы";

		const rrn = item.terminalTx?.rrn || "";
		const card = item.terminalTx ? `${item.terminalTx.panMasked} (${item.terminalTx.paymentType})` : "";
		const termRub = (item.terminalAmountRub || 0).toFixed(2).replace(".", ",");
		const fdNum = item.kktRecord?.fiscalDocNumber || "";
		const fpd = item.kktRecord?.fiscalSign || "";
		const kktRub = (item.kktAmountRub || 0).toFixed(2).replace(".", ",");
		const diffRub = (item.diffRub || 0).toFixed(2).replace(".", ",");
		const expl = (item.explanationRu || "").replace(/[;\n]/g, " ");
		const act = (item.suggestedActionRu || "").replace(/[;\n]/g, " ");

		return `"${statusRu}";"${rrn}";"${card}";"${termRub}";"${fdNum}";"${fpd}";"${kktRub}";"${diffRub}";"${expl}";"${act}"`;
	});

	return BOM + header + rows.join("\n");
}

export function generateAcquiringReconciliationPrintHtml(
	report: AcquiringReconciliationReport,
	clinicInfo: {
		clinicName?: string;
		cashierName?: string;
		shiftNumber?: number;
		terminalId?: string;
		reconciliationDate?: string;
	},
): string {
	const date = clinicInfo.reconciliationDate || new Date().toISOString().slice(0, 10);
	const clinic = clinicInfo.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»";
	const cashier = clinicInfo.cashierName || "Кассир-администратор";
	const shift = clinicInfo.shiftNumber || 1;
	const terminal = clinicInfo.terminalId || "POS-TERM-01";

	const rowsHtml = report.reconciledItems
		.map((item, idx) => {
			const badgeColor =
				item.status === "matched"
					? "#059669"
					: item.status === "missing_kkt_receipt"
					? "#dc2626"
					: item.status === "missing_terminal_charge"
					? "#d97706"
					: "#2563eb";

			const badgeText =
				item.status === "matched"
					? "Сошлось"
					: item.status === "missing_kkt_receipt"
					? "[НЕТ ЧЕКА ККТ]"
					: item.status === "missing_terminal_charge"
					? "[НЕТ СПИСАНИЯ]"
					: "≠ РАЗНИЦА";

			return `
			<tr style="border-bottom: 1px solid #e5e7eb; font-size: 11px;">
				<td style="padding: 6px 8px; text-align: center;">${idx + 1}</td>
				<td style="padding: 6px 8px;"><span style="color: ${badgeColor}; font-weight: bold;">${badgeText}</span></td>
				<td style="padding: 6px 8px; font-family: monospace;">${item.terminalTx?.rrn || "—"}</td>
				<td style="padding: 6px 8px;">${item.terminalTx?.panMasked || "—"}</td>
				<td style="padding: 6px 8px; text-align: right; font-weight: bold;">${item.terminalAmountRub.toFixed(2)} ₽</td>
				<td style="padding: 6px 8px; font-family: monospace;">${item.kktRecord ? `ФД №${item.kktRecord.fiscalDocNumber}` : "—"}</td>
				<td style="padding: 6px 8px; text-align: right; font-weight: bold;">${item.kktAmountRub.toFixed(2)} ₽</td>
				<td style="padding: 6px 8px; text-align: right; font-weight: bold; color: ${item.diffRub === 0 ? "#059669" : "#dc2626"};">${item.diffRub.toFixed(2)} ₽</td>
				<td style="padding: 6px 8px; color: #4b5563;">${item.explanationRu}</td>
			</tr>
		`;
		})
		.join("");

	return `
<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Акт сверки эквайринга с ККТ — ${date}</title>
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #111827; }
		h1 { font-size: 18px; margin-bottom: 4px; }
		.subtitle { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
		.kpi-box { display: flex; gap: 12px; margin-bottom: 16px; }
		.kpi-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; background: #f9fafb; flex: 1; }
		.kpi-label { font-size: 10px; color: #6b7280; text-transform: uppercase; }
		.kpi-value { font-size: 16px; font-weight: bold; margin-top: 2px; }
		table { width: 100%; border-collapse: collapse; margin-top: 10px; }
		th { background: #f3f4f6; padding: 8px; text-align: left; font-size: 11px; font-weight: 600; border-bottom: 2px solid #d1d5db; }
		.signatures { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
		.sign-col { font-size: 12px; width: 45%; }
		.sign-line { border-bottom: 1px solid #9ca3af; margin-top: 30px; margin-bottom: 4px; }
	</style>
</head>
<body>
	<h1>АКТ СВЕРКИ ОПЕРАЦИЙ ЭКВАЙРИНГА С ФИСКАЛЬНЫМИ ЧЕКАМИ ККТ 54-ФЗ</h1>
	<div class="subtitle">${clinic} | Смена № ${shift} | Терминал: ${terminal} | Дата: ${date}</div>

	<div class="kpi-box">
		<div class="kpi-card">
			<div class="kpi-label">Реестр эквайринга</div>
			<div class="kpi-value">${report.totalTerminalRub.toFixed(2)} ₽</div>
		</div>
		<div class="kpi-card">
			<div class="kpi-label">Чеки ККТ (Тег 1081)</div>
			<div class="kpi-value">${report.totalKktRub.toFixed(2)} ₽</div>
		</div>
		<div class="kpi-card">
			<div class="kpi-label">Расхождение</div>
			<div class="kpi-value" style="color: ${report.isExactMatch ? "#059669" : "#dc2626"};">${report.totalDiffRub.toFixed(2)} ₽</div>
		</div>
		<div class="kpi-card">
			<div class="kpi-label">Статус баланса</div>
			<div class="kpi-value" style="font-size: 13px; color: ${report.isExactMatch ? "#059669" : "#dc2626"};">
				${report.isExactMatch ? "Сошлось копейка в копейку" : "Есть расхождения"}
			</div>
		</div>
	</div>

	<table>
		<thead>
			<tr>
				<th>№</th>
				<th>Статус</th>
				<th>RRN Терминала</th>
				<th>Карта</th>
				<th style="text-align: right;">Сумма Терм.</th>
				<th>ФД № ККТ</th>
				<th style="text-align: right;">Сумма ККТ</th>
				<th style="text-align: right;">Разница</th>
				<th>Пояснение</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
		</tbody>
	</table>

	<div class="signatures">
		<div class="sign-col">
			<div>Ответственный кассир-администратор:</div>
			<div class="sign-line"></div>
			<div style="color: #6b7280; font-size: 11px;">${cashier} / ______________</div>
		</div>
		<div class="sign-col">
			<div>Главный бухгалтер / Руководитель клиники:</div>
			<div class="sign-line"></div>
			<div style="color: #6b7280; font-size: 11px;">______________ / ______________</div>
		</div>
	</div>
</body>
</html>
`;
}
