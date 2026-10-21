import React from "react";
import {
	CONSTRUCTION_TYPES,
	LAB_MATERIALS,
	type JawScope,
	formatJawScopeLabel,
} from "../labMath";

export interface DentalLabPrintInfoTableProps {
	patientFio: { fullName: string; courierMaskedName: string };
	formDoctorName: string;
	doctorPhone?: string | undefined;
	clinicName: string;
	clinicPhone?: string | undefined;
	jawScope?: JawScope | null | undefined;
	selectedTeeth: number[];
	impressionType: string;
	constructionType: string;
	material: string;
	finalShade: string;
	shadeStump?: string | undefined;
}

const IMPRESSION_LABELS: Record<string, string> = {
	a_silicone: "А-силикон (Винилполисилоксан / VPS)",
	c_silicone: "С-силикон (Конденсационный)",
	polyether: "Полиэфир (Impregum / Permadyne)",
	hydrocolloid: "Гидроколлоид (Агар-агар)",
	alginate: "Альгинатная масса",
	digital_scan_stl_ply: "Цифровой оптический 3D-скан (STL / PLY)",
	digital_scan: "Цифровой скан (STL/PLY)",
	pvs_silicone: "PVS-силикон",
};

export function DentalLabPrintInfoTable({
	patientFio,
	formDoctorName,
	doctorPhone,
	clinicName,
	clinicPhone,
	jawScope,
	selectedTeeth,
	impressionType,
	constructionType,
	material,
	finalShade,
	shadeStump,
}: DentalLabPrintInfoTableProps): React.JSX.Element {
	const constrTitle =
		CONSTRUCTION_TYPES.find((c) => c.id === constructionType)?.name || constructionType;
	const matTitle =
		LAB_MATERIALS.find((m) => m.id === material)?.name || material;

	return (
		<div
			className="grid grid-cols-2 gap-4 text-xs break-inside-avoid print:break-inside-avoid"
			style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
		>
			<div className="space-y-1.5">
				<div>
					<strong>Пациент:</strong> <span className="font-bold">{patientFio.fullName}</span>{" "}
					<span className="text-[11px] text-slate-500 font-normal">
						(Курьерский код: <strong>{patientFio.courierMaskedName}</strong>)
					</span>
				</div>
				<div>
					<strong>Врач-ортопед:</strong> <span className="font-bold">{formDoctorName}</span>
					{doctorPhone && (
						<span className="text-[11px] text-slate-600 print:text-black font-normal ml-1">
							(Тел: <strong>{doctorPhone}</strong>)
						</span>
					)}
				</div>
				<div>
					<strong>Клиника:</strong> <span className="font-bold">{clinicName}</span>
					{clinicPhone && (
						<span className="text-[11px] text-slate-600 print:text-black font-normal ml-1">
							(Тел: <strong>{clinicPhone}</strong>)
						</span>
					)}
				</div>
				<div>
					<strong>Зубная формула (FDI):</strong>{" "}
					<span className="font-bold text-sm bg-slate-100 print:bg-transparent px-2 py-0.5 rounded border border-slate-200 print:border-black">
						{jawScope
							? `Челюсть целиком: ${formatJawScopeLabel(jawScope)}`
							: selectedTeeth.length > 0
							? selectedTeeth.join(", ")
							: "Челюсть целиком / Общечелюстное изделие"}
					</span>
				</div>
				<div>
					<strong>Слепок / Оттискная масса:</strong>{" "}
					<span className="font-bold">{IMPRESSION_LABELS[impressionType] || impressionType}</span>
				</div>
			</div>
			<div className="space-y-1.5">
				<div>
					<strong>Вид конструкции:</strong> <span className="font-bold">{constrTitle}</span>
				</div>
				<div>
					<strong>Материал каркаса:</strong> <span className="font-bold">{matTitle}</span>
				</div>
				<div>
					<strong>Основной цвет VITA:</strong> <span className="font-bold">{finalShade}</span>{" "}
					{shadeStump ? `(Культя: ${shadeStump})` : ""}
				</div>
				<div>
					<strong>Гарантийный срок:</strong>{" "}
					<span className="font-bold">2 года (ГОСТ Р 51087-97 / Рекомендации СтАР)</span>
				</div>
			</div>
		</div>
	);
}
