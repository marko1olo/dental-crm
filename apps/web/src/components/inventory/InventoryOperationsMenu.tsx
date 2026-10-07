import {
	ChevronDown,
	FileText,
	Package,
	PackageCheck,
	QrCode,
	ShieldCheck,
	Sparkles,
	Syringe,
	Truck,
	Warehouse,
} from "lucide-react";
import React, { useEffect, useRef } from "react";

export interface InventoryOperationsMenuProps {
	readonly isOpen: boolean;
	readonly onToggle: () => void;
	readonly onClose: () => void;
	readonly onOpenAcceptanceWaybills: () => void;
	readonly onOpenWarehouseManager: () => void;
	readonly onOpenMdlpScanning: () => void;
	readonly onOpenClinicalWriteoff: () => void;
	readonly onOpenProcedureDeduction: () => void;
	readonly onOpenWarehouseTransfer: () => void;
	readonly onOpenInventoryAudit: () => void;
	readonly onOpenMdlpDisposal: () => void;
	readonly onOpenNurseCarpuleModal: () => void;
	readonly onQuickWriteoffStandardKit: () => void;
	readonly onQuickWriteoffAnestheticCarpule: () => void;
	readonly onQuickWriteoffSterilizationKit: () => void;
	readonly onQuickWriteoffCarpules: () => void;
	readonly onQuickWriteoffVisitBundle: (bundle: "therapy" | "surgery") => void;
	readonly onQuickWriteoffShiftBundle: (bundle: "therapy" | "orthopedics" | "surgery") => void;
}

/**
 * Выпадающее меню складских операций (Мандаты 8b, 8d, 8e).
 * Инкапсулирует группировку редких и специализированных операций склада
 * по закону Хика (единая кнопка «Операции» в 1-строчном тулбаре).
 */
export const InventoryOperationsMenu: React.FC<InventoryOperationsMenuProps> = ({
	isOpen,
	onToggle,
	onClose,
	onOpenAcceptanceWaybills,
	onOpenWarehouseManager,
	onOpenMdlpScanning,
	onOpenClinicalWriteoff,
	onOpenProcedureDeduction,
	onOpenWarehouseTransfer,
	onOpenInventoryAudit,
	onOpenMdlpDisposal,
	onOpenNurseCarpuleModal,
	onQuickWriteoffStandardKit,
	onQuickWriteoffAnestheticCarpule,
	onQuickWriteoffSterilizationKit,
	onQuickWriteoffCarpules,
	onQuickWriteoffVisitBundle,
	onQuickWriteoffShiftBundle,
}) => {
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				onClose();
			}
		};
		if (isOpen) {
			document.addEventListener("mousedown", handleOutside);
		}
		return () => document.removeEventListener("mousedown", handleOutside);
	}, [isOpen, onClose]);

	return (
		<div ref={menuRef} className="shrink-0 relative inline-block">
			<button
				type="button"
				className="secondary-button h-8 px-2.5 rounded-lg shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 font-semibold text-xs cursor-pointer transition-colors bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)]"
				onClick={onToggle}
				title="Операции со складом: списание по наряду, перемещения, инвентаризация, маркировка, нормы расхода"
				aria-expanded={isOpen}
				data-testid="btn-warehouse-ops-menu"
			>
				<PackageCheck size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
				<span>Операции</span>
				<ChevronDown
					size={12}
					className={`transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
				/>
			</button>

			{isOpen && (
				<div
					className="warehouse-ops-menu absolute right-0 top-[calc(100%+4px)] bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xl p-1.5 z-50 min-w-[280px] flex flex-col gap-0.5 text-xs text-[var(--ink)]"
					role="menu"
				>
					<button
						type="button"
						className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-semibold cursor-pointer transition-colors"
						data-testid="acceptance-waybills-trigger"
						onClick={() => {
							onOpenAcceptanceWaybills();
							onClose();
						}}
						role="menuitem"
						title="Приходная накладная от поставщика (Стомторг, KaVo, ВладМиВа): партии по срокам годности и оприходование"
					>
						<FileText size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Приходная накладная (партии по срокам)</span>
					</button>

					<button
						type="button"
						className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
						data-testid="warehouse-manager-trigger"
						onClick={() => {
							onOpenWarehouseManager();
							onClose();
						}}
						role="menuitem"
						title="Управление складами и остатками: экспресс-пресеты, расход сверх остатка и списание"
					>
						<Warehouse size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Управление складами и остатками</span>
					</button>

					<button
						type="button"
						className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
						data-testid="mdlp-scanning-trigger"
						onClick={() => {
							onOpenMdlpScanning();
							onClose();
						}}
						role="menuitem"
						title="Сканирование маркировки препаратов (DataMatrix)"
					>
						<QrCode size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Маркировка препаратов</span>
					</button>

					<button
						type="button"
						className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
						data-testid="clinical-writeoff-trigger"
						onClick={() => {
							onOpenClinicalWriteoff();
							onClose();
						}}
						role="menuitem"
						title="Клиническое списание расходников по нормам приёма и актам списания"
					>
						<PackageCheck size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Списание по наряду</span>
					</button>

					<button
						type="button"
						className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
						data-testid="procedure-deduction-trigger"
						onClick={() => {
							onOpenProcedureDeduction();
							onClose();
						}}
						role="menuitem"
						title="Списание расходных материалов по технологическим картам процедур и нормам расхода"
					>
						<PackageCheck size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Нормы расхода на услуги (BOM)</span>
					</button>

					<button
						type="button"
						className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
						data-testid="warehouse-transfer-trigger"
						onClick={() => {
							onOpenWarehouseTransfer();
							onClose();
						}}
						role="menuitem"
						title="Межфилиальное перемещение материалов и препаратов"
					>
						<Truck size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Перемещение материалов</span>
					</button>

					<button
						type="button"
						className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
						data-testid="warehouse-inventory-audit-trigger"
						onClick={() => {
							onOpenInventoryAudit();
							onClose();
						}}
						role="menuitem"
						title="Складская инвентаризация: опись остатков, сличительная ведомость и контроль сроков годности"
					>
						<PackageCheck size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Инвентаризация склада</span>
					</button>

					<button
						type="button"
						className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
						data-testid="mdlp-disposal-trigger"
						onClick={() => {
							onOpenMdlpDisposal();
							onClose();
						}}
						role="menuitem"
						title="Списание и вывод из оборота маркированных лекарственных препаратов"
					>
						<Package size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Списание маркированных препаратов</span>
					</button>

					<div className="my-1 border-t border-[var(--line)]" />

					{/* Быстрые списания расходников (СанПиН / Сестра / Врач) */}
					<button
						type="button"
						className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
						data-testid="nurse-menu-quick-standard-kit-btn"
						onClick={() => {
							onQuickWriteoffStandardKit();
							onClose();
						}}
						role="menuitem"
						title="Быстрое списание базового набора приёма (перчатки, маска, слюноотсос, нагрудник, валики)"
					>
						<PackageCheck size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Списать базовый набор</span>
					</button>

					<button
						type="button"
						className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
						data-testid="nurse-menu-quick-anesthetic-carpule-btn"
						onClick={() => {
							onQuickWriteoffAnestheticCarpule();
							onClose();
						}}
						role="menuitem"
						title="Быстрое списание пустой карпулы анестетика врачом без комиссии"
					>
						<Syringe size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Списать карпулу анестетика</span>
					</button>

					<button
						type="button"
						className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
						data-testid="nurse-carpule-disposal-modal-trigger"
						onClick={() => {
							onOpenNurseCarpuleModal();
							onClose();
						}}
						role="menuitem"
						title="Учет и акт утилизации пустых карпул анестетиков без лишних комиссий"
					>
						<Syringe size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Акт утилизации карпул</span>
					</button>

					<button
						type="button"
						className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
						data-testid="nurse-menu-quick-sterilization-kit-btn"
						onClick={() => {
							onQuickWriteoffSterilizationKit();
							onClose();
						}}
						role="menuitem"
						title="Быстрое списание набора стерилизации: 1 лоток в крафт-пакете + перчатки"
					>
						<PackageCheck size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Набор стерилизации (1 лоток + перчатки)</span>
					</button>

					<button
						type="button"
						className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
						data-testid="nurse-menu-quick-carpules-btn"
						onClick={() => {
							onQuickWriteoffCarpules();
							onClose();
						}}
						role="menuitem"
						title="Быстрое списание пустых карпул анестетиков без комиссии"
					>
						<Syringe size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Списать карпулу (без комиссии)</span>
					</button>

					<button
						type="button"
						className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
						data-testid="nurse-menu-quick-visit-therapy-btn"
						onClick={() => {
							onQuickWriteoffVisitBundle("therapy");
							onClose();
						}}
						role="menuitem"
						title="Списание набора визита «Терапия»"
					>
						<Sparkles size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Списать визит: Терапия</span>
					</button>

					<button
						type="button"
						className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
						data-testid="nurse-menu-quick-visit-surgery-btn"
						onClick={() => {
							onQuickWriteoffVisitBundle("surgery");
							onClose();
						}}
						role="menuitem"
						title="Списание набора визита «Хирургия»"
					>
						<Sparkles size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Списать визит: Хирургия</span>
					</button>

					<button
						type="button"
						className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
						data-testid="nurse-menu-quick-shift-therapy-btn"
						onClick={() => {
							onQuickWriteoffShiftBundle("therapy");
							onClose();
						}}
						role="menuitem"
						title="Списание расхода смены (Терапия)"
					>
						<Sparkles size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Списать смену: Терапия</span>
					</button>

					<button
						type="button"
						className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
						data-testid="nurse-menu-quick-shift-ortho-btn"
						onClick={() => {
							onQuickWriteoffShiftBundle("orthopedics");
							onClose();
						}}
						role="menuitem"
						title="Списание расхода смены (Ортопедия)"
					>
						<PackageCheck size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Списать смену: Ортопедия</span>
					</button>

					<button
						type="button"
						className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium cursor-pointer transition-colors"
						data-testid="nurse-menu-quick-shift-surgery-btn"
						onClick={() => {
							onQuickWriteoffShiftBundle("surgery");
							onClose();
						}}
						role="menuitem"
						title="Списание расхода смены (Хирургия)"
					>
						<ShieldCheck size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Списать смену: Хирургия</span>
					</button>
				</div>
			)}
		</div>
	);
};

export default InventoryOperationsMenu;
