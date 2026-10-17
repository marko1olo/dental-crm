import { showToast } from "../../GlobalToast";

export interface PrintBraveryDiplomaOptions {
	readonly heroName: string;
	readonly effectiveDoctorName: string;
	readonly effectiveClinicName: string;
	readonly effectiveDate: string;
	readonly praiseText: string;
}

export function printBraveryDiploma({
	heroName,
	effectiveDoctorName,
	effectiveClinicName,
	effectiveDate,
	praiseText,
}: PrintBraveryDiplomaOptions): void {
	const printWindow = window.open("", "_blank");
	if (!printWindow) {
		showToast("Разрешите всплывающие окна в браузере для печати диплома", "error");
		return;
	}

	printWindow.document.write(`
		<!DOCTYPE html>
		<html lang="ru">
		<head>
			<meta charset="UTF-8">
			<title>Диплом за храбрость — ${heroName}</title>
			<style>
				@page { size: A4 landscape; margin: 10mm; }
				* { box-sizing: border-box; }
				body {
					margin: 0; padding: 24px;
					font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
					background: #ffffff; color: #0f172a;
					display: flex; align-items: center; justify-content: center; min-height: 100vh;
				}
				.diploma-card {
					width: 100%; max-width: 960px; border: 8px double #d97706; border-radius: 24px;
					padding: 40px; text-align: center; position: relative; background: #fffbeb;
				}
				.diploma-title { font-size: 38px; font-weight: 900; color: #b45309; text-transform: uppercase; margin: 16px 0; }
				.hero-name { font-size: 42px; font-weight: 900; color: #0f172a; border-bottom: 3px solid #d97706; display: inline-block; padding: 0 24px 8px; margin: 16px 0; }
				.praise { font-size: 20px; line-height: 1.6; color: #334155; margin: 24px auto; max-width: 700px; }
				.footer { display: flex; justify-content: space-between; margin-top: 48px; padding-top: 24px; border-top: 2px dashed #d97706; font-size: 16px; font-weight: bold; }
			</style>
		</head>
		<body>
			<div class="diploma-card">
				<div style="font-size: 18px; font-weight: bold; color: #b45309; text-transform: uppercase;">${effectiveClinicName}</div>
				<h1 class="diploma-title">ДИПЛОМ ЗА ХРАБРОСТЬ</h1>
				<div style="font-size: 16px; color: #64748b; font-weight: 600;">Настоящий диплом вручается:</div>
				<div class="hero-name">${heroName}</div>
				<p class="praise">${praiseText}</p>
				<div class="footer">
					<div>Врач-стоматолог: ${effectiveDoctorName}</div>
					<div>Дата: ${effectiveDate}</div>
				</div>
			</div>
			<script>
				window.onload = function() {
					setTimeout(function() { window.print(); window.close(); }, 250);
				};
			</script>
		</body>
		</html>
	`);
	printWindow.document.close();
}
