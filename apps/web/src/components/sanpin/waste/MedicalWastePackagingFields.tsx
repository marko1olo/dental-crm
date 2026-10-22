import type {
	MedicalWasteDisinfectionMethod,
	MedicalWasteOperationType,
	MedicalWastePackageType,
} from "@dental/shared";
import React from "react";

export interface WastePackagingFieldsProps {
	formOpType: MedicalWasteOperationType;
	formPackageType: MedicalWastePackageType;
	setFormPackageType: (v: MedicalWastePackageType) => void;
	formPackageCount: number;
	setFormPackageCount: (v: number) => void;
	formWeightKg: number;
	setFormWeightKg: (v: number) => void;
	formDisinfection: MedicalWasteDisinfectionMethod;
	setFormDisinfection: (v: MedicalWasteDisinfectionMethod) => void;
	formDisposalCompany: string;
	setFormDisposalCompany: (v: string) => void;
	formActNo: string;
	setFormActNo: (v: string) => void;
}

export function MedicalWastePackagingFields(p: WastePackagingFieldsProps) {
	return (
		<>
			<div className="sanpin-form-row">
				<div className="sanpin-form-group">
					<label className="sanpin-form-label">Тип упаковочной тары</label>
					<select
						value={p.formPackageType}
						onChange={(e) => p.setFormPackageType(e.target.value as MedicalWastePackageType)}
						className="sanpin-select"
					>
						<option value="yellow_bag">Желтый пакет Класса Б</option>
						<option value="yellow_sharps_container">Желтый контейнер игл</option>
						<option value="white_bag">Белый пакет Класса А</option>
						<option value="hazard_g_container">Контейнер Класса Г</option>
					</select>
				</div>

				<div className="sanpin-form-group">
					<label className="sanpin-form-label">Кол-во упаковок (шт)</label>
					<input
						type="number"
						min={1}
						required
						value={p.formPackageCount}
						onChange={(e) => p.setFormPackageCount(parseInt(e.target.value) || 1)}
						className="sanpin-input"
					/>
				</div>
			</div>

			<div className="sanpin-form-row">
				<div className="sanpin-form-group">
					<label className="sanpin-form-label">Масса отходов (кг)</label>
					<input
						type="number"
						step="0.01"
						min={0.01}
						required
						value={p.formWeightKg}
						onChange={(e) => p.setFormWeightKg(parseFloat(e.target.value) || 0)}
						className="sanpin-input"
					/>
				</div>

				<div className="sanpin-form-group">
					<label className="sanpin-form-label">Метод обеззараживания</label>
					<select
						value={p.formDisinfection}
						onChange={(e) => p.setFormDisinfection(e.target.value as MedicalWasteDisinfectionMethod)}
						className="sanpin-select"
					>
						<option value="chemical_soaking">Химическое замачивание в дезрастворе</option>
						<option value="steam_autoclave">Аппаратное (автоклавирование)</option>
						<option value="none_centralized">Централизованный вывоз</option>
					</select>
				</div>
			</div>

			{p.formOpType === "transfer_to_disposal_company" && (
				<div className="sanpin-form-row">
					<div className="sanpin-form-group">
						<label className="sanpin-form-label">Утилизирующая организация</label>
						<input
							type="text"
							required
							value={p.formDisposalCompany}
							onChange={(e) => p.setFormDisposalCompany(e.target.value)}
							className="sanpin-input"
						/>
					</div>

					<div className="sanpin-form-group">
						<label className="sanpin-form-label">Номер акта передачи</label>
						<input
							type="text"
							required
							value={p.formActNo}
							onChange={(e) => p.setFormActNo(e.target.value)}
							className="sanpin-input"
						/>
					</div>
				</div>
			)}
		</>
	);
}
