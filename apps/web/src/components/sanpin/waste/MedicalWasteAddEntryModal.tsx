import type {
	CreateMedicalWasteLogDto,
	MedicalWasteClass,
	MedicalWasteDisinfectionMethod,
	MedicalWasteOperationType,
	MedicalWastePackageType,
} from "@dental/shared";
import { X } from "lucide-react";
import React, { useState } from "react";
import { MedicalWasteClassFields } from "./MedicalWasteClassFields";
import { MedicalWastePackagingFields } from "./MedicalWastePackagingFields";
import { submitMedicalWasteEntry } from "./wasteSubmitHelper";

interface MedicalWasteAddEntryModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

export function MedicalWasteAddEntryModal({ isOpen, onClose, onSuccess }: MedicalWasteAddEntryModalProps) {
	const [opType, setOpType] = useState<MedicalWasteOperationType>("accumulation");
	const [wasteClass, setWasteClass] = useState<MedicalWasteClass>("class_B");
	const [desc, setDesc] = useState("Использованные ватные валики, салфетки, перчатки, карпулы, удаленные зубы");
	const [pkgType, setPkgType] = useState<MedicalWastePackageType>("yellow_bag");
	const [pkgCount, setPkgCount] = useState<number>(2);
	const [weightKg, setWeightKg] = useState<number>(2.45);
	const [disinfection, setDisinfection] = useState<MedicalWasteDisinfectionMethod>("chemical_soaking");
	const [disposalCompany, setDisposalCompany] = useState("ООО «ЭкоМедУтилизация»");
	const [actNo, setActNo] = useState("АКТ-ВЫВОЗ-182");
	const [submitting, setSubmitting] = useState(false);

	if (!isOpen) return null;

	const handleWasteClassChange = (c: MedicalWasteClass) => {
		setWasteClass(c);
		if (c === "class_B") {
			setPkgType("yellow_bag");
			setDesc("Использованные ватные валики, салфетки, перчатки, карпулы, удаленные зубы");
		} else if (c === "class_A") {
			setPkgType("white_bag");
			setDesc("Упаковочные коробки, бумага, бытовой мусор");
		} else if (c === "class_G") {
			setPkgType("hazard_g_container");
			setDesc("Отработанные ртутные бактерицидные лампы / просроченные медикаменты");
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		const payload: CreateMedicalWasteLogDto = {
			operationType: opType,
			logDate: new Date().toISOString(),
			wasteClass,
			wasteDescription: desc,
			packageType: pkgType,
			packageCount: Number(pkgCount),
			weightKg: Number(weightKg),
			disinfectionMethod: disinfection,
			disposalCompany: opType === "transfer_to_disposal_company" ? disposalCompany : undefined,
			transferActNumber: opType === "transfer_to_disposal_company" ? actNo : undefined,
		};
		const ok = await submitMedicalWasteEntry(payload);
		setSubmitting(false);
		if (ok) {
			onSuccess();
			onClose();
		}
	};

	return (
		<div className="sanpin-modal-overlay">
			<div className="sanpin-modal">
				<div className="sanpin-modal-header">
					<h3>Регистрация медицинских отходов</h3>
					<button type="button" onClick={onClose} aria-label="Закрыть" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
				</div>
				<form onSubmit={handleSubmit}>
					<div className="sanpin-modal-body">
						<MedicalWasteClassFields formOpType={opType} setFormOpType={setOpType} formWasteClass={wasteClass} onWasteClassChange={handleWasteClassChange} formDescription={desc} setFormDescription={setDesc} />
						<MedicalWastePackagingFields formOpType={opType} formPackageType={pkgType} setFormPackageType={setPkgType} formPackageCount={pkgCount} setFormPackageCount={setPkgCount} formWeightKg={weightKg} setFormWeightKg={setWeightKg} formDisinfection={disinfection} setFormDisinfection={setDisinfection} formDisposalCompany={disposalCompany} setFormDisposalCompany={setDisposalCompany} formActNo={actNo} setFormActNo={setActNo} />
					</div>
					<div className="sanpin-modal-footer">
						<button type="button" onClick={onClose} className="sanpin-btn sanpin-btn-secondary">Отмена</button>
						<button type="submit" aria-busy={submitting} className="sanpin-btn sanpin-btn-primary">Зафиксировать в журнале</button>
					</div>
				</form>
			</div>
		</div>
	);
}
