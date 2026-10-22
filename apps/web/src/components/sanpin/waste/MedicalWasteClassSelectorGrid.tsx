import { CheckCircle2 } from "lucide-react";
import type React from "react";
import { SANPIN_MEDICAL_WASTE_CLASSES, type MedicalWasteClassId } from "./medicalWastePresets.js";

export interface MedicalWasteClassSelectorGridProps {
	readonly selectedClass: MedicalWasteClassId;
	readonly onClassChange: (c: MedicalWasteClassId) => void;
}

export const MedicalWasteClassSelectorGrid: React.FC<MedicalWasteClassSelectorGridProps> = ({
	selectedClass,
	onClassChange,
}) => {
	return (
		<div className="flex flex-col gap-2">
			<div className="text-xs font-bold uppercase text-muted mb-1">
				1. Класс отходов
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
				{SANPIN_MEDICAL_WASTE_CLASSES.map((cls) => {
					const isSelected = selectedClass === cls.id;
					return (
						<div
							key={cls.id}
							className={`waste-class-card ${
								cls.id === "class_A" && isSelected
									? "selected-class-a"
									: cls.id === "class_B" && isSelected
									? "selected-class-b"
									: cls.id === "class_V" && isSelected
									? "selected-class-v"
									: isSelected
									? "selected-class-g"
									: ""
							}`}
							onClick={() => onClassChange(cls.id)}
						>
							<div className="flex items-center justify-between">
								<span
									className="text-xs font-black px-2.5 py-1 rounded-full uppercase"
									style={{
										backgroundColor: cls.colorTheme.hexBadgeBg,
										color: cls.colorTheme.hexBadgeFg,
										border: `1px solid ${cls.colorTheme.hexBorder}`,
									}}
								>
									Класс {cls.letterCode}
								</span>
								{isSelected && <CheckCircle2 size={18} className="text-[var(--teal,#0d9488)]" />}
							</div>
							<div className="font-bold text-sm text-ink">{cls.nameRu}</div>
							<div className="text-xs text-muted leading-tight">
								{cls.dentalSpecificItemsRu[0]}
							</div>
						</div>
					);
				})}
			</div>

			{selectedClass === "class_B" && (
				<div
					style={{
						padding: "0.75rem 1rem", borderRadius: "10px", background: "#fef3c7",
						border: "1px solid #f59e0b", color: "#92400e", fontSize: "0.8rem", lineHeight: 1.4,
					}}
				>
					<div style={{ fontWeight: 800, marginBottom: "2px" }}>
						Опасные стоматологические отходы (Класс Б):
					</div>
					<div>
						• <strong>Мягкие отходы:</strong> карпулы от анестетиков со следами крови, ватные валики, марлевые салфетки, перчатки, удаленные зубы.<br />
						• <strong>Острый инструментарий:</strong> карпульные инъекционные иглы, эндодонтические файлы, лезвия скальпелей — сбор строго в желтые емкости с иглосъемником!
					</div>
				</div>
			)}
		</div>
	);
};
