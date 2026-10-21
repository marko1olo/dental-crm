/**
 * bilateralActGenerator.ts — Генерация двустороннего Акта сдачи-приемки оказанных услуг по ДМС
 */

import { DEFAULT_CLINIC_LEGAL_INFO, formatKopecks, kopecksToRub, type ClinicLegalInfo } from "../dmsInsuranceEngine.js";
import type { DmsStatutoryRegistry } from "./types.js";

export function generateBilateralAcceptanceActHtml(
	registry: DmsStatutoryRegistry,
	clinicInfo: ClinicLegalInfo = DEFAULT_CLINIC_LEGAL_INFO,
): string {
	const actNumber = `АКТ-ДМС-${registry.registryNumber}`;
	const actDateStr = new Date().toLocaleDateString("ru-RU");
	const totalDmsRub = kopecksToRub(registry.grandTotalDmsKopecks);

	return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<title>Акт сдачи-приемки оказанных медицинских услуг № ${actNumber}</title>
<style>
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #0f172a; line-height: 1.5; margin: 0; padding: 28px; }
.header { text-align: center; margin-bottom: 24px; }
.act-title { font-size: 16px; font-weight: 800; text-transform: uppercase; margin-bottom: 4px; }
.summary-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; }
.summary-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
.signatures { display: flex; justify-content: space-between; margin-top: 48px; }
.sig-col { width: 46%; }
.sig-line { border-top: 1px solid #0f172a; margin-top: 40px; padding-top: 4px; font-size: 11px; text-align: center; }
</style></head><body>
<div class="header">
	<div class="act-title">АКТ СДАЧИ-ПРИЕМКИ ОКАЗАННЫХ МЕДИЦИНСКИХ УСЛУГ ПО ДМС № ${actNumber}</div>
	<div style="font-size:12px;color:#475569;">к Договору на оказание медицинских услуг по ДМС от «___» ________ 202_ г.</div>
	<div style="margin-top:8px;font-weight:600;">г. Москва &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; «${actDateStr}» г.</div>
</div>
<div style="text-align:justify;margin-bottom:18px;">
	<strong>${clinicInfo.legalName}</strong> (Лицензия № ${clinicInfo.licenseNumber} от ${clinicInfo.licenseDate}), «Исполнитель», в лице Главного врача ${clinicInfo.chiefDoctorFullName}, с одной стороны, и <strong>${registry.insurer.fullName} (${registry.insurer.shortName})</strong>, «Заказчик/Страховщик», составили настоящий Акт:
</div>
<div style="margin-bottom:14px;">
	1. В период с <strong>${registry.periodStart}</strong> по <strong>${registry.periodEnd}</strong> Исполнитель оказал Застрахованным лицам стоматологические услуги согласно Реестру № <strong>${registry.registryNumber}</strong>.
</div>
<div class="summary-box">
	<div class="summary-row"><span>Всего услуг:</span><strong>${registry.totalVisitsCount} ед.</strong></div>
	<div class="summary-row"><span>Пациентов:</span><strong>${registry.uniquePatientsCount} чел.</strong></div>
	<div class="summary-row"><span>Стоимость по прейскуранту:</span><strong>${formatKopecks(registry.grandTotalBillKopecks)}</strong></div>
	<div class="summary-row"><span>Доплата пациентов:</span><strong>${formatKopecks(registry.grandTotalPatientKopecks)}</strong></div>
	<div class="summary-row" style="font-size:14px;border-top:1px solid #cbd5e1;padding-top:8px;margin-top:8px;">
		<span><strong>К ОПЛАТЕ СТРАХОВЩИКОМ:</strong></span><span style="color:#0284c7;"><strong>${formatKopecks(registry.grandTotalDmsKopecks)}</strong></span>
	</div>
</div>
<div style="margin-bottom:10px;">
	2. Сумма к оплате Страховщиком: <strong>${formatKopecks(registry.grandTotalDmsKopecks)}</strong> (${totalDmsRub.toFixed(2)} руб.). Без НДС (пп. 2 п. 2 ст. 149 НК РФ).<br>
	3. Услуги оказаны в полном объеме и качественно. Претензий стороны не имеют.
</div>
<div class="signatures">
	<div class="sig-col">
		<strong>ОТ ИСПОЛНИТЕЛЯ:</strong><br>${clinicInfo.legalName}<br>ИНН: ${clinicInfo.inn} / КПП: ${clinicInfo.kpp}<br>
		Главный врач _________________ / ${clinicInfo.chiefDoctorFullName} /<div class="sig-line">М.П.</div>
	</div>
	<div class="sig-col">
		<strong>ОТ ЗАКАЗЧИКА:</strong><br>${registry.insurer.fullName}<br>ИНН: ${registry.insurer.inn} / КПП: ${registry.insurer.kpp}<br>
		Куратор ДМС _________________ / _____________________ /<div class="sig-line">М.П.</div>
	</div>
</div>
</body></html>`;
}
