import { showToast } from "../../GlobalToast";

export interface PrintBraveryDiplomaOptions {
	readonly heroName: string;
	readonly effectiveDoctorName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly effectiveClinicName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly effectiveDate?: string | undefined;
	readonly visitDate?: string | undefined;
	readonly praiseText?: string | undefined;
	readonly diplomaNumber?: string | undefined;
}

export function generateBraveryDiplomaHtml(options: PrintBraveryDiplomaOptions): string {
	const heroName = options.heroName || "Юный пациент";
	const doctor = options.doctorName || options.effectiveDoctorName || "Врач-стоматолог";
	const clinic = options.clinicName || options.effectiveClinicName || "Детское отделение DENTE";
	const date = options.visitDate || options.effectiveDate || new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
	const praise = options.praiseText || "Награждается за невероятную храбрость, ослепительную улыбку и дружбу с Зубной Феей на приёме у стоматолога!";
	const number = options.diplomaNumber || "001";

	return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Диплом за храбрость — ${heroName}</title>
<style>
@page { size: A5 landscape; margin: 6mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: #ffffff; color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 8px; }
.diploma { width: 100%; max-width: 780px; height: 96%; border: 6px double #d97706; border-radius: 20px; padding: 24px; text-align: center; background: radial-gradient(circle at center, #fffbeb 0%, #fef3c7 100%); position: relative; box-shadow: 0 4px 20px rgba(217,119,6,0.15); page-break-inside: avoid; break-inside: avoid; }
.clinic { font-size: 13px; font-weight: 800; letter-spacing: 2px; color: #b45309; text-transform: uppercase; margin-bottom: 6px; }
.badge { display: inline-flex; align-items: center; gap: 6px; background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 3px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; }
.title { font-size: 28px; font-weight: 900; color: #92400e; text-transform: uppercase; margin: 8px 0 4px; letter-spacing: 1px; }
.subtitle { font-size: 13px; font-weight: 700; color: #d97706; text-transform: uppercase; letter-spacing: 1.5px; }
.hero-box { margin: 12px auto; display: inline-block; background: #ffffff; border: 2px solid #f59e0b; border-radius: 14px; padding: 6px 28px; }
.hero-name { font-size: 26px; font-weight: 900; color: #0f172a; }
.praise { font-size: 13px; line-height: 1.45; color: #334155; margin: 8px auto 14px; max-width: 580px; font-weight: 500; }
.footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #d97706; font-size: 12px; font-weight: 700; color: #475569; }
.stamp { border: 2px solid #0d9488; border-radius: 50%; width: 58px; height: 58px; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 900; color: #0d9488; text-transform: uppercase; transform: rotate(-12deg); }
</style></head><body>
<div class="diploma">
  <div class="clinic">${clinic}</div>
  <div class="badge">★ ЗУБНОЙ СУПЕРГЕРОЙ • № ${number} ★</div>
  <h1 class="title">ДИПЛОМ ЗА ХРАБРОСТЬ</h1>
  <div class="subtitle">Орден отваги и ослепительной улыбки</div>
  <div class="hero-box"><div class="hero-name">Герой: ${heroName}</div></div>
  <p class="praise">${praise}</p>
  <div class="footer">
    <div style="text-align: left;"><div>Врач: ${doctor}</div><div>Дата: ${date}</div></div>
    <div class="stamp">DENTE<br/>ОТВАГА</div>
    <div style="text-align: right; color: #0d9488;">✓ Все зубки здоровы!</div>
  </div>
</div>
<script>window.onload = function() { setTimeout(function() { window.print(); window.close(); }, 200); };</script>
</body></html>`;
}

export function printBraveryDiploma(options: PrintBraveryDiplomaOptions): void {
	const printWindow = window.open("", "_blank");
	if (!printWindow) {
		showToast("Разрешите всплывающие окна в браузере для печати диплома", "error");
		return;
	}
	printWindow.document.write(generateBraveryDiplomaHtml(options));
	printWindow.document.close();
}
