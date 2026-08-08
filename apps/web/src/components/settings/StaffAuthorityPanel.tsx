/**
 * Персональные полномочия сотрудника (PUT /api/settings/staff/:staffId/authority).
 *
 * БЫЛО: маршрут и колонки `users.can_sign_medical_records` /
 * `can_manage_money` / `can_manage_imports` уже жили с миграции 0000, а форма
 * «Добавить сотрудника» слала три флага в POST — zod их отбрасывал молча.
 * Единственный адрес записи (`PUT …/authority`) имел **zero web callers**.
 * Владелец не мог выдать ассистенту доступ к кассе или снять надбавку без SQL.
 *
 * ТЕПЕРЬ: самодостаточная панель на Settings → Персонал рядом со ставками.
 * Список сотрудников из дашборда; три переключателя; сохранение через
 * `denteAdminSecretRequestHeaders` + clinic/staff token (requireSettingsAccess +
 * settings.write + verified org). Ответ `staffAuthorityStateSchema` разводит
 * roleDerived / grants / effective — галочка «даёт роль» блокируется на UI,
 * снять ниже роли нельзя (409 role_grants_authority).
 *
 * ДОЛГ (сервер, не этот файл): GET clinic/dashboard отдаёт roleDerived и колонок
 * не читает. После успешного PUT держим effective локально; «Обновить» сбрасывает
 * к roleDerived из дашборда, пока гидратация не перейдёт на effective.
 */

import {
	type StaffAuthorityFlagKey,
	type StaffAuthorityFlagsDto,
	type StaffAuthorityState,
	staffAuthorityFlagKeys,
} from "@dental/shared";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { actionFailureToast } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";
import { staffRoleTitle } from "./settingsInviteRoles";

type StaffMemberLite = {
	id?: string;
	fullName?: string;
	role?: string;
	active?: boolean;
	canSignMedicalRecords?: boolean;
	canManageMoney?: boolean;
	canManageImports?: boolean;
};

type Flags = StaffAuthorityFlagsDto;

type RowState = {
	staffId: string;
	name: string;
	role: string;
	/** Что даёт роль (из дашборда / последнего ответа). */
	roleDerived: Flags;
	/** Действующее (роль ИЛИ надбавка) — правим галочки по нему. */
	effective: Flags;
	/** Надбавки в колонках, если сервер уже отвечал. */
	grants: Flags | null;
};

type SaveState =
	| { kind: "idle" }
	| { kind: "saving"; staffId: string; flag: StaffAuthorityFlagKey }
	| { kind: "failed"; message: string };

const FLAG_TITLES: Record<StaffAuthorityFlagKey, string> = {
	canSignMedicalRecords: "Подпись медицинской документации",
	canManageMoney: "Касса, оплаты и возвраты",
	canManageImports: "Перенос данных из прежней программы",
};

const FLAG_HINTS: Record<StaffAuthorityFlagKey, string> = {
	canSignMedicalRecords: "Право подписывать ЭМК и закрывать приём.",
	canManageMoney: "Проводить оплаты, возвраты и работать с кассой.",
	canManageImports: "Запускать перенос картотеки и прайса.",
};

function emptyFlags(value: boolean): Flags {
	return {
		canSignMedicalRecords: value,
		canManageMoney: value,
		canManageImports: value,
	};
}

function flagsFromMember(member: StaffMemberLite): Flags {
	return {
		canSignMedicalRecords: Boolean(member.canSignMedicalRecords),
		canManageMoney: Boolean(member.canManageMoney),
		canManageImports: Boolean(member.canManageImports),
	};
}

function serverMessageOf(payload: unknown): string | null {
	if (!payload || typeof payload !== "object") return null;
	const record = payload as { message?: unknown };
	if (typeof record.message === "string" && record.message.trim()) {
		return record.message.trim();
	}
	return null;
}

function parseAuthorityState(payload: unknown): StaffAuthorityState | null {
	if (!payload || typeof payload !== "object") return null;
	const r = payload as Record<string, unknown>;
	const staffId = typeof r.staffId === "string" ? r.staffId : "";
	const role = typeof r.role === "string" ? r.role : "";
	const readFlags = (key: string): Flags | null => {
		const block = r[key];
		if (!block || typeof block !== "object") return null;
		const b = block as Record<string, unknown>;
		if (
			typeof b.canSignMedicalRecords !== "boolean" ||
			typeof b.canManageMoney !== "boolean" ||
			typeof b.canManageImports !== "boolean"
		) {
			return null;
		}
		return {
			canSignMedicalRecords: b.canSignMedicalRecords,
			canManageMoney: b.canManageMoney,
			canManageImports: b.canManageImports,
		};
	};
	const roleDerived = readFlags("roleDerived");
	const grants = readFlags("grants");
	const effective = readFlags("effective");
	if (!staffId || !roleDerived || !grants || !effective) return null;
	return { staffId, role, roleDerived, grants, effective };
}

function refusedFlagsOf(payload: unknown): StaffAuthorityFlagKey[] {
	if (!payload || typeof payload !== "object") return [];
	const flags = (payload as { flags?: unknown }).flags;
	if (!Array.isArray(flags)) return [];
	const allowed = new Set<string>(staffAuthorityFlagKeys);
	const out: StaffAuthorityFlagKey[] = [];
	for (const item of flags) {
		if (typeof item === "string" && allowed.has(item)) {
			out.push(item as StaffAuthorityFlagKey);
		}
	}
	return out;
}

export const StaffAuthorityPanel: React.FC = () => {
	const appLogic = useAppLogicContext();
	const dashboardUnknown = (appLogic as { dashboard?: unknown } | null)
		?.dashboard;
	const loadDashboard = (
		appLogic as { loadDashboard?: () => Promise<void> | void } | null
	)?.loadDashboard;

	const clinicSettings =
		dashboardUnknown &&
		typeof dashboardUnknown === "object" &&
		dashboardUnknown !== null &&
		"clinicSettings" in dashboardUnknown
			? (dashboardUnknown as { clinicSettings?: { staff?: StaffMemberLite[] } })
					.clinicSettings
			: undefined;
	const staff: StaffMemberLite[] = Array.isArray(clinicSettings?.staff)
		? clinicSettings?.staff
		: [];

	/**
	 * Локальные перекрытия после успешного PUT: dashboard отдаёт только
	 * roleDerived, поэтому без этого карта сразу «забыла» бы надбавку.
	 */
	const [overrides, setOverrides] = useState<
		Record<
			string,
			{ roleDerived: Flags; grants: Flags; effective: Flags; role: string }
		>
	>({});
	const [save, setSave] = useState<SaveState>({ kind: "idle" });
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const rows: RowState[] = useMemo(() => {
		const result: RowState[] = [];
		const seen = new Set<string>();
		for (const member of staff) {
			const id = typeof member.id === "string" ? member.id : "";
			if (!id || seen.has(id)) continue;
			if (member.active === false) continue;
			seen.add(id);
			const nameRaw =
				typeof member.fullName === "string" ? member.fullName.trim() : "";
			const name = nameRaw.length > 0 ? nameRaw : id;
			const role = String(member.role ?? "");
			const fromDash = flagsFromMember(member);
			const ov = overrides[id];
			result.push({
				staffId: id,
				name,
				role: ov?.role ?? role,
				roleDerived: ov?.roleDerived ?? fromDash,
				effective: ov?.effective ?? fromDash,
				grants: ov?.grants ?? null,
			});
		}
		result.sort((a, b) => a.name.localeCompare(b.name, "ru"));
		return result;
	}, [staff, overrides]);

	const refreshDashboard = useCallback(async () => {
		if (typeof loadDashboard === "function") {
			try {
				await loadDashboard();
			} catch {
				/* дашборд обновит соседняя вкладка; панель живёт на overrides */
			}
		}
	}, [loadDashboard]);

	const setFlag = async (
		row: RowState,
		flag: StaffAuthorityFlagKey,
		nextValue: boolean,
	) => {
		/*
		 * Снять то, что даёт роль, сервер отвергнет 409. Не шлём заведомый отказ:
		 * галочка «роль» уже disabled, но на всякий случай.
		 */
		if (!nextValue && row.roleDerived[flag]) {
			const msg =
				`Полномочие «${FLAG_TITLES[flag]}» даёт роль «${staffRoleTitle(row.role)}». ` +
				"Отдельной галочкой снять его нельзя — измените роль в карточке сотрудника.";
			setSave({ kind: "failed", message: msg });
			showToast(msg, "warning");
			return;
		}
		if (row.effective[flag] === nextValue) return;

		setSave({ kind: "saving", staffId: row.staffId, flag });
		try {
			const body: Partial<Record<StaffAuthorityFlagKey, boolean>> = {
				[flag]: nextValue,
			};
			const response = await fetch(
				`/api/settings/staff/${row.staffId}/authority`,
				{
					method: "PUT",
					headers: denteAdminSecretRequestHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify(body),
				},
			);
			const payload = (await response.json().catch((err) => {
				showToast(actionFailureToast("Ошибка ответа сервера", (err as { status?: number })?.status ?? null), "error");
				return null;
			})) as unknown;
			if (!response.ok) {
				const refused = refusedFlagsOf(payload);
				const msg =
					serverMessageOf(payload) ??
					(response.status === 401 || response.status === 403
						? "Полномочия не сохранены: войдите как владелец клиники и проверьте секрет администратора."
						: actionFailureToast(
								`Полномочия «${row.name}» не сохранены`,
								response.status,
							));
				setSave({ kind: "failed", message: msg });
				showToast(msg, "error");
				/*
				 * 409 role_grants_authority: сервер перечислил поля — подтянем
				 * roleDerived, чтобы disabled совпал с фактом.
				 */
				if (response.status === 409 && refused.length > 0) {
					setOverrides((prev) => {
						const cur = prev[row.staffId];
						const roleDerived = {
							...(cur?.roleDerived ?? row.roleDerived),
						};
						for (const key of refused) roleDerived[key] = true;
						const effective = {
							...(cur?.effective ?? row.effective),
							...roleDerived,
						};
						return {
							...prev,
							[row.staffId]: {
								role: cur?.role ?? row.role,
								roleDerived,
								grants: cur?.grants ?? emptyFlags(false),
								effective,
							},
						};
					});
				}
				return;
			}
			const state = parseAuthorityState(payload);
			if (!state) {
				const msg =
					"Полномочия сохранены, но ответ сервера не разобран. Обновите страницу.";
				setSave({ kind: "failed", message: msg });
				showToast(msg, "warning");
				await refreshDashboard();
				return;
			}
			setOverrides((prev) => ({
				...prev,
				[row.staffId]: {
					role: state.role,
					roleDerived: state.roleDerived,
					grants: state.grants,
					effective: state.effective,
				},
			}));
			const label = nextValue ? "выдано" : "снято";
			showToast(
				`«${row.name}»: ${FLAG_TITLES[flag].toLowerCase()} — ${label}.`,
				"success",
			);
			setSave({ kind: "idle" });
			await refreshDashboard();
		} catch {
			const msg = actionFailureToast(
				`Полномочия «${row.name}» не сохранены`,
				null,
			);
			setSave({ kind: "failed", message: msg });
			showToast(msg, "error");
		}
	};

	const clinicLoaded = Boolean(clinicSettings);

	return (
		<article
			className="settings-card col-span-full"
			aria-label="Полномочия сотрудников"
			data-testid="staff-authority-panel"
		>
			<div
				className="settings-card-header"
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					gap: "0.75rem",
					flexWrap: "wrap",
				}}
			>
				<div>
					<h4 className="m-0">Полномочия сотрудников</h4>
					<p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-1">
						Надбавка к роли: подпись ЭМК, касса, перенос данных. То, что даёт
						роль, снять галочкой нельзя — смените роль в карточке. Себе
						полномочия не выдают.
					</p>
				</div>
				<button
					type="button"
					className="secondary-button text-xs"
					onClick={() => {
						setOverrides({});
						setSave({ kind: "idle" });
						void refreshDashboard();
					}}
					data-testid="staff-authority-refresh"
				>
					Обновить
				</button>
			</div>

			<div className="settings-card-body">
				{!clinicLoaded ? (
					<p
						className="text-sm text-slate-500 m-0"
						data-testid="staff-authority-waiting"
					>
						Данные клиники ещё не прочитаны — список полномочий появится после
						загрузки.
					</p>
				) : null}

				{clinicLoaded && rows.length === 0 ? (
					<p
						className="text-sm text-slate-500 m-0"
						data-testid="staff-authority-empty"
					>
						Активных сотрудников нет. Добавьте сотрудника ниже — здесь появятся
						переключатели полномочий.
					</p>
				) : null}

				{rows.length > 0 ? (
					<ul
						className="m-0 p-0 list-none flex flex-col gap-2"
						data-testid="staff-authority-list"
					>
						{rows.map((row) => {
							const open = expandedId === row.staffId;
							const grantCount = staffAuthorityFlagKeys.filter(
								(k) => row.effective[k],
							).length;
							return (
								<li
									key={row.staffId}
									className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900"
									data-testid={`staff-authority-row-${row.staffId}`}
								>
									<button
										type="button"
										className="w-full text-left px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 bg-transparent border-0 cursor-pointer"
										onClick={() => setExpandedId(open ? null : row.staffId)}
										aria-expanded={open}
										data-testid={`staff-authority-toggle-${row.staffId}`}
									>
										<span>
											<span className="text-sm font-semibold text-slate-900 dark:text-white">
												{row.name}
											</span>
											<span className="text-xs text-slate-500 ml-2">
												{staffRoleTitle(row.role)}
											</span>
										</span>
										<span className="text-xs text-slate-500">
											{grantCount} из 3 · {open ? "Свернуть" : "Настроить"}
										</span>
									</button>

									{open ? (
										<div
											className="px-3 pb-3 pt-0 border-t border-slate-100 dark:border-slate-800"
											data-testid={`staff-authority-editor-${row.staffId}`}
										>
											<div className="flex flex-col gap-3 mt-3">
												{staffAuthorityFlagKeys.map((flag) => {
													const on = row.effective[flag];
													const byRole = row.roleDerived[flag];
													const byGrant = row.grants
														? row.grants[flag] && !byRole
														: false;
													const isSaving =
														save.kind === "saving" &&
														save.staffId === row.staffId &&
														save.flag === flag;
													/*
													 * Галочку «даёт роль» нельзя снять: disabled +
													 * пояснение. Включить надбавку поверх false роли —
													 * можно.
													 */
													const lockedOn = byRole;
													return (
														<label
															key={flag}
															className="flex items-start gap-3 text-sm cursor-pointer"
															data-testid={`staff-authority-flag-${row.staffId}-${flag}`}
														>
															<input
																type="checkbox"
																className="mt-1"
																checked={on}
																disabled={lockedOn || isSaving}
																onChange={(e) => {
																	void setFlag(row, flag, e.target.checked);
																}}
																aria-label={`${FLAG_TITLES[flag]} — ${row.name}`}
																data-testid={`staff-authority-check-${row.staffId}-${flag}`}
															/>
															<span className="flex-1 min-w-0">
																<span className="font-medium text-slate-900 dark:text-white block">
																	{FLAG_TITLES[flag]}
																	{isSaving ? (
																		<span className="text-xs text-slate-400 font-normal ml-2">
																			сохраняем…
																		</span>
																	) : null}
																</span>
																<span className="text-xs text-slate-500 block mt-0.5">
																	{FLAG_HINTS[flag]}
																</span>
																{lockedOn ? (
																	<span
																		className="text-xs text-amber-700 dark:text-amber-300 block mt-0.5"
																		data-testid={`staff-authority-role-lock-${row.staffId}-${flag}`}
																	>
																		Даёт роль «{staffRoleTitle(row.role)}» —
																		снять можно только сменой роли.
																	</span>
																) : null}
																{byGrant && on ? (
																	<span className="text-xs text-emerald-700 dark:text-emerald-300 block mt-0.5">
																		Выдано персонально (надбавка к роли).
																	</span>
																) : null}
															</span>
														</label>
													);
												})}
											</div>
										</div>
									) : null}
								</li>
							);
						})}
					</ul>
				) : null}

				{save.kind === "failed" ? (
					<p
						className="text-sm text-rose-700 dark:text-rose-300 m-0 mt-3"
						role="alert"
						data-testid="staff-authority-error"
					>
						{save.message}
					</p>
				) : null}
			</div>
		</article>
	);
};

export default StaffAuthorityPanel;
