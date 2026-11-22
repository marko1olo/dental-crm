/**
 * BranchSelector.tsx — Селектор активного филиала клиники в шапке CRM.
 * 
 * Домен 30: Сеть клиник, Франшиза, Филиалы, Межфилиальный трансфер.
 * Мандаты 8e, 8n, 8d/8am (Apple HIG, 0px шума, дизайн-токены var(--paper), var(--line), var(--ink)).
 */

import React, { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronDown, Plus } from "lucide-react";

export interface BranchItem {
	id: string;
	name: string;
	address?: string | null | undefined;
	phone?: string | null | undefined;
	timezone?: string | undefined;
	chairCount?: number | undefined;
}

const STORAGE_KEY = "dente_active_branch_id";

export function BranchSelector({
	defaultClinicName,
	className = "",
}: {
	defaultClinicName?: string | undefined;
	className?: string | undefined;
}) {
	const [branches, setBranches] = useState<BranchItem[]>([]);
	const [activeBranchId, setActiveBranchId] = useState<string>(() => {
		if (typeof window !== "undefined") {
			return localStorage.getItem(STORAGE_KEY) || "";
		}
		return "";
	});
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Загрузка филиалов с бэкенда
	useEffect(() => {
		let isMounted = true;
		async function fetchBranches() {
			try {
				const res = await fetch("/api/branches");
				if (!res.ok) return;
				const json = await res.json();
				const items: BranchItem[] = json?.data ?? (Array.isArray(json) ? json : []);
				if (!isMounted) return;
				if (Array.isArray(items) && items.length > 0) {
					setBranches(items);
					// Если активный филиал не установлен или не найден среди существующих, выбираем первый
					setActiveBranchId((prev) => {
						const exists = items.some((b) => b.id === prev);
						const nextId = exists ? prev : items[0]!.id;
						if (typeof window !== "undefined") {
							localStorage.setItem(STORAGE_KEY, nextId);
						}
						return nextId;
					});
				}
			} catch {
				// Офлайн режим или сетевой сбой — фоллбек
			}
		}

		void fetchBranches();
		return () => {
			isMounted = false;
		};
	}, []);

	// Закрытие по клику вне дропдауна
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}
		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	const currentBranch = branches.find((b) => b.id === activeBranchId) || branches[0];
	const displayName = currentBranch?.name || defaultClinicName || "Основное отделение";

	// Если филиалов нет или ровно 1 — выводим компактный ненавязчивый индикатор
	if (branches.length <= 1) {
		return (
			<div
				className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink-muted)] shrink-0 ${className}`}
				title={displayName}
				data-testid="branch-single-badge"
			>
				<Building2 size={12} className="text-[var(--primary)] opacity-70 shrink-0" />
				<span className="truncate max-w-[110px] sm:max-w-[200px]">{displayName}</span>
			</div>
		);
	}

	// Сеть из 2+ филиалов: полнофункциональный переключатель Apple HIG
	return (
		<div className={`relative inline-block text-left shrink-0 ${className}`} ref={dropdownRef}>
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className="h-7 px-2 sm:px-2.5 rounded-lg text-xs font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0"
				aria-expanded={isOpen}
				aria-haspopup="true"
				data-testid="branch-selector-button"
				title="Переключить филиал клиники"
			>
				<Building2 size={13} className="text-[var(--primary)] shrink-0" />
				<span className="truncate max-w-[110px] sm:max-w-[200px] font-semibold">{displayName}</span>
				<ChevronDown
					size={12}
					className={`text-[var(--ink-muted)] shrink-0 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
				/>
			</button>

			{isOpen && (
				<div
					className="absolute left-0 top-full mt-1.5 z-50 min-w-[220px] max-w-[280px] p-1.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-xl animate-in fade-in zoom-in-95"
					role="menu"
					data-testid="menu-branch-selector-dropdown"
				>
					<div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
						Отделения сети ({branches.length})
					</div>

					<div className="space-y-0.5 my-1 max-h-60 overflow-y-auto">
						{branches.map((branch) => {
							const isSelected = branch.id === currentBranch?.id;
							return (
								<button
									key={branch.id}
									type="button"
									onClick={() => {
										setActiveBranchId(branch.id);
										if (typeof window !== "undefined") {
											localStorage.setItem(STORAGE_KEY, branch.id);
											window.dispatchEvent(
												new CustomEvent("dente:branch-changed", { detail: branch }),
											);
										}
										setIsOpen(false);
									}}
									className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
										isSelected
											? "bg-[var(--paper-soft)] font-semibold text-[var(--primary)]"
											: "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
									}`}
									role="menuitem"
									data-testid={`branch-item-${branch.id}`}
								>
									<div className="min-w-0 flex-1">
										<div className="truncate text-xs">{branch.name}</div>
										{branch.address && (
											<div className="text-[10px] text-[var(--ink-muted)] truncate">
												{branch.address}
											</div>
										)}
									</div>
									<div className="flex items-center gap-1.5 shrink-0">
										{typeof branch.chairCount === "number" && branch.chairCount > 0 && (
											<span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--paper)] border border-[var(--line)] text-[var(--ink-muted)]">
												{branch.chairCount} кр.
											</span>
										)}
										{isSelected && <Check size={13} className="text-[var(--primary)] shrink-0" />}
									</div>
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
