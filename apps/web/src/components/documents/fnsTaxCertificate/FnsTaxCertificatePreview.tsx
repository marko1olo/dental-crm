import React from "react";
import { Receipt } from "lucide-react";
import type { Patient } from "@dental/shared";
import type { extractClinicRequisites } from "./fnsTaxCertificateHelpers";

interface FnsTaxCertificatePreviewProps {
	selectedYear: number;
	patient?: Patient | null | undefined;
	clinic: ReturnType<typeof extractClinicRequisites>;
	relationship: string;
	taxpayerFullName: string;
	effectiveInn: string;
	// biome-ignore lint/suspicious/noExplicitAny: aggregation
	aggregated: any;
}

export const FnsTaxCertificatePreview: React.FC<FnsTaxCertificatePreviewProps> = ({
	selectedYear,
	patient,
	clinic,
	relationship,
	taxpayerFullName,
	effectiveInn,
	aggregated,
}) => (
	<main className="p-4 max-h-[60vh] overflow-y-auto bg-[var(--paper)]">
		{aggregated.totalNetRub === 0 && (
			<div
				className="p-3 mb-3 text-left text-[var(--muted)] flex items-center gap-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]"
				data-testid="tax-cert-empty-state"
			>
				<Receipt size={18} className="opacity-60 text-teal-600 shrink-0" />
				<div className="text-xs">
					<span className="font-semibold text-[var(--ink)] block">
						Нет подтвержденных фискальных оплат за {selectedYear} год
					</span>
					<span>
						Справка формируется в режиме бланка со строками _______ для ручного заполнения или подтверждения бухгалтерией (Мандат 8e).
					</span>
				</div>
			</div>
		)}
		<div className="p-4 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[12.5px] leading-relaxed space-y-2 font-mono">
			<p className="font-bold text-center">
				СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ ДЛЯ НАЛОГОВЫХ ОРГАНОВ РОССИЙСКОЙ ФЕДЕРАЦИИ
			</p>
			<p className="text-center text-[11px] text-[var(--muted)]">
				Форма по КНД 1151156 · Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@
			</p>
			<hr className="border-[var(--line)] my-2" />
			<p><strong>Медицинская организация:</strong> {clinic.legalName}</p>
			<p><strong>ИНН / КПП:</strong> {clinic.inn} / {clinic.kpp} · <strong>ОГРН:</strong> {clinic.ogrn}</p>
			<p><strong>Лицензия:</strong> № {clinic.licenseNumber}</p>
			<hr className="border-[var(--line)] my-2" />
			<p><strong>Пациент:</strong> {patient?.fullName || "Пациент клиники"}</p>
			<p><strong>Налогоплательщик:</strong> {relationship === "patient" ? patient?.fullName : taxpayerFullName || "Указан в заявлении"}</p>
			<p><strong>ИНН налогоплательщика:</strong> {effectiveInn || "Не указан (паспортные данные в заявлении)"}</p>
			<p><strong>Код услуги 1 (обычные услуги):</strong> {aggregated.code01Rub > 0 ? `${aggregated.code01Rub.toLocaleString("ru-RU")} руб. 00 коп.` : "_______________ руб."}</p>
			<p><strong>Код услуги 2 (дорогостоящее лечение):</strong> {aggregated.code02Rub > 0 ? `${aggregated.code02Rub.toLocaleString("ru-RU")} руб. 00 коп.` : "_______________ руб."}</p>
			<p><strong>ИТОГО оплачено за {selectedYear} год:</strong> {aggregated.totalNetRub > 0 ? `${aggregated.totalNetRub.toLocaleString("ru-RU")} руб. 00 коп.` : "_______________ руб."}</p>
		</div>
	</main>
);
