/**
 * Layer 2 / Layer 4: Presentation Table and Interactive Drill-Down for Doctor Payout Dashboard.
 * Includes inline doctor rate editor, formula cards, visits breakdown, and dental lab orders.
 */

import React, { Fragment } from "react";
import { countLabel, money } from "../../AppHelpers";
import { percentLabel } from "./payoutHelpers";
import type {
	CommissionSaveState,
	DoctorPayoutReport,
	DoctorPayoutRow,
} from "./types";

export interface PayoutDoctorTableProps {
	readonly report: DoctorPayoutReport;
	readonly isOwnScope: boolean;
	readonly monthLabel: string;
	readonly canEditRates: boolean;
	readonly editingRateFor: string | null;
	readonly rateDraft: string;
	readonly rateSave: CommissionSaveState;
	readonly onStartEditRate: (doctorId: string, currentRate: number | null) => void;
	readonly onCancelEditRate: () => void;
	readonly onRateDraftChange: (draft: string) => void;
	readonly onSaveRate: (doctorId: string, raw: string) => void;
	readonly expandedDoctorId: string | null;
	readonly onToggleExpandDoctor: (doctorId: string) => void;
	readonly activeSubTabs: Record<string, "visits" | "lab">;
	readonly onSubTabChange: (doctorId: string, tab: "visits" | "lab") => void;
	readonly searchFilters: Record<string, string>;
	readonly onSearchChange: (doctorId: string, query: string) => void;
	readonly visitPages: Record<string, number>;
	readonly onPageChange: (doctorId: string, page: number) => void;
	readonly onOpenPayrollModal: (doctor: DoctorPayoutRow) => void;
}

export function PayoutDoctorTable({
	report,
	isOwnScope,
	monthLabel,
	canEditRates,
	editingRateFor,
	rateDraft,
	rateSave,
	onStartEditRate,
	onCancelEditRate,
	onRateDraftChange,
	onSaveRate,
	expandedDoctorId,
	onToggleExpandDoctor,
	activeSubTabs,
	onSubTabChange,
	searchFilters,
	onSearchChange,
	visitPages,
	onPageChange,
	onOpenPayrollModal,
}: PayoutDoctorTableProps) {
	if (report.isEmpty || (report?.rows ?? []).length === 0) {
		return (
			<p className="ops-empty">
				{isOwnScope
					? `За ${monthLabel} по вашим приёмам расчёта нет: ни оплат, ни списаний материалов.`
					: `За ${monthLabel} считать не по кому: в клинике нет ни одного врача, на которого пришлась бы оплата или списание материалов. Это отсутствие записей, а не нулевая зарплата.`}
			</p>
		);
	}

	return (
		<>
			<div className="ops-table-wrap">
				<table className="ops-table">
					<caption className="sr-only">
						Выплаты врачам за {monthLabel}: касса, ставка, удержание за
						материалы, лабораторию и сумма к выплате
					</caption>
					<thead>
						<tr>
							<th scope="col">Врач</th>
							<th scope="col">Касса</th>
							<th scope="col">Ставка</th>
							<th scope="col">Начислено</th>
							<th scope="col">Материалы</th>
							<th scope="col">Удержано за ЗТЛ</th>
							<th scope="col">К выплате</th>
							<th scope="col">Детали</th>
						</tr>
					</thead>
					<tbody>
						{(report?.rows ?? []).map((row) => {
							const isExpanded = expandedDoctorId === row.doctorUserId;
							const activeTab = activeSubTabs[row.doctorUserId] ?? "visits";
							const search = (searchFilters[row.doctorUserId] ?? "").toLowerCase().trim();
							const allVisits = row.visits ?? [];
							const filteredVisits = search
								? allVisits.filter(
										(v) =>
											v.patientName.toLowerCase().includes(search) ||
											v.medicalCardNumber.toLowerCase().includes(search) ||
											v.services.some(
												(s) =>
													s.title.toLowerCase().includes(search) ||
													(s.order804nCode &&
														s.order804nCode.toLowerCase().includes(search)) ||
													(s.toothCode && s.toothCode.includes(search)),
											),
									)
								: allVisits;
							const currentPage = visitPages[row.doctorUserId] ?? 1;
							const pageSize = 10;
							const totalPages = Math.max(1, Math.ceil(filteredVisits.length / pageSize));
							const pagedVisits = filteredVisits.slice(
								(currentPage - 1) * pageSize,
								currentPage * pageSize,
							);

							return (
								<Fragment key={row.doctorUserId}>
									<tr>
										<td className="ops-strong" data-label="Врач">
											{row.doctorName}
											{row.isActive ? null : (
												<>
													{" "}
													<span className="ops-state ops-state--muted">
														уволен
													</span>
												</>
											)}
										</td>
										<td className="ops-num" data-label="Касса">
											{money(row.revenueRub)}
											<br />
											<span className="ops-note">
												{countLabel(
													row.paymentCount,
													"оплата",
													"оплаты",
													"оплат",
												)}
											</span>
										</td>
										{/*
											Ставка отсутствующая печатается СЛОВАМИ. Ноль на этом месте
											читается как «врач работает бесплатно» и ведёт к выплате
											нуля вместо разговора о проценте.
										*/}
										<td className="ops-num" data-label="Ставка">
											{editingRateFor === row.doctorUserId ? (
												<form
													className="ops-field"
													onSubmit={(event) => {
														event.preventDefault();
														onSaveRate(row.doctorUserId, rateDraft);
													}}
												>
													<label htmlFor={`rate-${row.doctorUserId}`}>
														Процент от кассы для {row.doctorName}
													</label>
													<input
														id={`rate-${row.doctorUserId}`}
														type="number"
														inputMode="decimal"
														min={0}
														max={100}
														step={0.01}
														value={rateDraft}
														onChange={(event) =>
															onRateDraftChange(event.target.value)
														}
													/>
													<button
														className="primary-button"
														type="submit"
														disabled={rateSave.kind === "saving"}
													>
														{rateSave.kind === "saving"
															? "Сохраняю…"
															: "Сохранить"}
													</button>
													<button
														className="secondary-button"
														type="button"
														onClick={onCancelEditRate}
													>
														Отмена
													</button>
												</form>
											) : (
												<>
													{row.commissionPct === null ? (
														<span className="ops-state ops-state--warn">
															не задана
														</span>
													) : (
														percentLabel(row.commissionPct)
													)}
													{canEditRates ? (
														<>
															<br />
															<button
																className="secondary-button"
																type="button"
																onClick={() =>
																	onStartEditRate(
																		row.doctorUserId,
																		row.commissionPct,
																	)
																}
															>
																{row.commissionPct === null
																	? "Задать ставку"
																	: "Изменить"}
															</button>
														</>
													) : null}
												</>
											)}
										</td>
										<td className="ops-num" data-label="Начислено">
											{row.accruedRub === null ? "—" : money(row.accruedRub)}
										</td>
										{/*
											«0,00 ₽» и «списаний не было» — разные утверждения. Первое
											читается как «материалов не расходовали», и клиника молча
											переплатит врачу.
										*/}
										<td className="ops-num" data-label="Материалы">
											{row.materialsState === "no_movements" ? (
												<span className="ops-state ops-state--muted">
													не списывались
												</span>
											) : (
												<>
													{money(row.materialCostRub)}
													{row.materialsState === "cost_missing" ? (
														<>
															<br />
															<span className="ops-state ops-state--warn">
																без цены: {row.materialMovementsUnpriced}
															</span>
														</>
													) : null}
												</>
											)}
											{row.withheldMaterialRub !== null && row.withheldMaterialRub > 0 ? (
												<>
													<br />
													<span className="ops-note">
														удержано {money(row.withheldMaterialRub)}
													</span>
												</>
											) : null}
										</td>
										<td className="ops-num" data-label="Удержано за ЗТЛ">
											{row.withheldLabRub != null && row.withheldLabRub > 0 ? (
												<>
													{money(row.withheldLabRub)}
													<br />
													<span className="ops-note">
														{countLabel(
															row.labOrdersCount ?? 0,
															"наряд",
															"наряда",
															"нарядов",
														)}{" "}
														на {money(row.labCostRub ?? 0)}
													</span>
												</>
											) : (row.labOrdersCount ?? 0) === 0 ? (
												<span className="ops-state ops-state--muted">
													нет нарядов
												</span>
											) : (
												<>
													0,00 ₽
													<br />
													<span className="ops-note">без удержания</span>
												</>
											)}
										</td>
										<td className="ops-num ops-strong" data-label="К выплате">
											{row.payoutRub === null ? (
												"—"
											) : row.payoutRub < 0 ? (
												<span className="ops-state ops-state--bad">
													{money(row.payoutRub)}
												</span>
											) : (
												money(row.payoutRub)
											)}
										</td>
										<td className="ops-num" data-label="Детали">
											<button
												type="button"
												className="secondary-button ops-expand-btn"
												onClick={() => onToggleExpandDoctor(row.doctorUserId)}
												aria-expanded={isExpanded}
												aria-label={`Детализация по врачу ${row.doctorName}`}
											>
												{isExpanded ? "Свернуть ▲" : "Детализация ▼"}
											</button>
										</td>
									</tr>

									{/* ── Интерактивный Drill-Down (Раскрытие строки врача) ── */}
									{isExpanded ? (
										<tr className="ops-drilldown-row">
											<td
												colSpan={8}
												className="ops-drilldown-cell"
												data-label="Детализация"
											>
												<div className="ops-drilldown-container">
													{/* 1. Карточка прозрачной формулы расчета */}
													<div className="ops-formula-card">
														<div className="ops-formula-card__header">
															<h4>Прозрачный расчет зарплаты: {row.doctorName}</h4>
															<button
																type="button"
																className="secondary-button"
																onClick={() => onOpenPayrollModal(row)}
																title="Расчет зарплаты врачей"
															>
																Зарплатная ведомость
															</button>
														</div>
														<div className="ops-formula-summary">
															<div className="ops-formula-equation">
																<strong>Формула:</strong> К выплате = (Выручка × % ставки) − Материалы − ЗТЛ + Премии
															</div>
															<div className="ops-formula-grid">
																<div className="ops-formula-item">
																	<span className="ops-formula-item__label">1. Касса (Выручка)</span>
																	<span className="ops-formula-item__val">{money(row.revenueRub)}</span>
																	<span className="ops-formula-item__sub">
																		{countLabel(row.paymentCount, "оплата", "оплаты", "оплат")}
																	</span>
																</div>
																<div className="ops-formula-item">
																	<span className="ops-formula-item__label">2. Ставка врача</span>
																	<span className="ops-formula-item__val">{percentLabel(row.commissionPct)}</span>
																	<span className="ops-formula-item__sub">
																		начислено {money(row.accruedRub ?? 0)}
																	</span>
																</div>
																<div className="ops-formula-item">
																	<span className="ops-formula-item__label">3. Списано материалов</span>
																	<span className="ops-formula-item__val ops-formula-item__val--minus">
																		− {money(row.withheldMaterialRub ?? 0)}
																	</span>
																	<span className="ops-formula-item__sub">
																		себест. {money(row.materialCostRub)} ({row.materialDeductionPct ?? 100}%)
																	</span>
																</div>
																<div className="ops-formula-item">
																	<span className="ops-formula-item__label">4. Удержано за ЗТЛ</span>
																	<span className="ops-formula-item__val ops-formula-item__val--minus">
																		− {money(row.withheldLabRub ?? 0)}
																	</span>
																	<span className="ops-formula-item__sub">
																		{countLabel(row.labOrdersCount ?? 0, "наряд", "наряда", "нарядов")} на {money(row.labCostRub ?? 0)}
																	</span>
																</div>
																<div className="ops-formula-item ops-formula-item--total">
																	<span className="ops-formula-item__label">ИТОГО К ВЫПЛАТЕ</span>
																	<span className="ops-formula-item__val ops-formula-item__val--total">
																		{money(row.payoutRub ?? 0)}
																	</span>
																	<span className="ops-formula-item__sub">
																		{row.payoutRub && row.payoutRub < 0
																			? "долг врача клинике"
																			: "начислено к выплате"}
																	</span>
																</div>
															</div>
														</div>
													</div>

													{/* 2. Переключатель вкладок реестров */}
													<div className="ops-drilldown-tabs" role="tablist">
														<button
															type="button"
															role="tab"
															className={`ops-drilldown-tab ${activeTab === "visits" ? "ops-drilldown-tab--active" : ""}`}
															onClick={() => onSubTabChange(row.doctorUserId, "visits")}
														>
															Реестр смен и приемов ({row.visits?.length ?? 0})
														</button>
														<button
															type="button"
															role="tab"
															className={`ops-drilldown-tab ${activeTab === "lab" ? "ops-drilldown-tab--active" : ""}`}
															onClick={() => onSubTabChange(row.doctorUserId, "lab")}
														>
															Заказ-наряды лаборатории ЗТЛ ({row.labOrders?.length ?? 0})
														</button>
													</div>

													{/* 3. Контент Вкладки 1: Приемы */}
													{activeTab === "visits" ? (
														<div>
															<div className="ops-field">
																<label htmlFor={`search-visits-${row.doctorUserId}`}>
																	Поиск по приемам врача
																</label>
																<input
																	id={`search-visits-${row.doctorUserId}`}
																	type="text"
																	placeholder="Поиск по ФИО пациента, номеру карты или услуге…"
																	value={searchFilters[row.doctorUserId] ?? ""}
																	onChange={(e) =>
																		onSearchChange(row.doctorUserId, e.target.value)
																	}
																/>
															</div>

															{filteredVisits.length === 0 ? (
																<p className="ops-empty">
																	{search
																		? "По запросу ничего не найдено."
																		: "За выбранный месяц у врача нет оплаченных визитов."}
																</p>
															) : (
																<>
																	<div className="ops-subtable-wrap">
																		<table className="ops-subtable">
																			<thead>
																				<tr>
																					<th scope="col">Дата и время</th>
																					<th scope="col">Пациент и карта</th>
																					<th scope="col">Оказанные услуги (Зуб)</th>
																					<th scope="col">Списанные материалы</th>
																					<th scope="col">Сумма оплаты</th>
																				</tr>
																			</thead>
																			<tbody>
																				{pagedVisits.map((visit) => (
																					<tr key={visit.visitId}>
																						<td data-label="Дата и время" className="ops-num">
																							{new Date(visit.paidAt).toLocaleDateString("ru-RU")}{" "}
																							{new Date(visit.paidAt).toLocaleTimeString("ru-RU", {
																								hour: "2-digit",
																								minute: "2-digit",
																							})}
																						</td>
																						<td data-label="Пациент и карта">
																							<strong>{visit.patientName}</strong>
																							<br />
																							<span className="ops-note">
																								Карта: {visit.medicalCardNumber}
																							</span>
																						</td>
																						<td data-label="Оказанные услуги">
																							{visit.services.length === 0 ? (
																												<span className="ops-note">
																													услуги не детализированы
																												</span>
																							) : (
																												<ul className="ops-item-list">
																													{visit.services.map((srv) => (
																														<li key={srv.id} className="ops-item-entry">
																															{srv.order804nCode ? (
																																<>
																																	<span className="ops-badge-804n">
																																		{srv.order804nCode}
																																	</span>{" "}
																																</>
																															) : null}
																															{srv.toothCode ? (
																																<>
																																	<span className="ops-badge-tooth">
																																		Зуб {srv.toothCode}
																																	</span>{" "}
																																</>
																															) : null}
																															{srv.title} —{" "}
																															<strong>
																																{srv.quantity > 1
																																	? `${srv.quantity} × `
																																	: ""}
																																{money(srv.priceRub)}
																															</strong>
																														</li>
																													))}
																												</ul>
																							)}
																						</td>
																						<td data-label="Списанные материалы">
																							{visit.materials.length === 0 ? (
																												<span className="ops-state ops-state--muted">
																													нет списаний
																												</span>
																							) : (
																												<ul className="ops-item-list">
																													{visit.materials.map((mat) => (
																														<li key={mat.id} className="ops-item-entry">
																															{mat.name}: {mat.quantity} {mat.unit}{" "}
																															({money(mat.totalCostRub)})
																														</li>
																													))}
																												</ul>
																							)}
																						</td>
																						<td
																							data-label="Сумма оплаты"
																							className="ops-num ops-strong"
																						>
																							{money(visit.revenueRub)}
																						</td>
																					</tr>
																				))}
																			</tbody>
																		</table>
																	</div>

																	{totalPages > 1 ? (
																		<div className="ops-pagination">
																			<button
																				type="button"
																				className="ops-pagination-button"
																				disabled={currentPage <= 1}
																				onClick={() =>
																					onPageChange(
																						row.doctorUserId,
																						Math.max(1, currentPage - 1),
																					)
																				}
																			>
																				Предыдущая
																			</button>
																			<span className="ops-note">
																				Страница {currentPage} из {totalPages} (всего{" "}
																				{filteredVisits.length}{" "}
																				{countLabel(
																					filteredVisits.length,
																					"прием",
																					"приема",
																					"приемов",
																				)}
																				)
																			</span>
																			<button
																				type="button"
																				className="ops-pagination-button"
																				disabled={currentPage >= totalPages}
																				onClick={() =>
																					onPageChange(
																						row.doctorUserId,
																						Math.min(totalPages, currentPage + 1),
																					)
																				}
																			>
																				Следующая
																			</button>
																		</div>
																	) : null}
																</>
															)}
														</div>
													) : (
														/* 4. Контент Вкладки 2: ЗТЛ */
														<div>
															{(row.labOrders ?? []).length === 0 ? (
																<p className="ops-empty">
																	За выбранный месяц у врача нет завершенных заказ-нарядов в зуботехническую лабораторию.
																</p>
															) : (
																<div className="ops-subtable-wrap">
																	<table className="ops-subtable">
																		<thead>
																			<tr>
																				<th scope="col">№ Наряда</th>
																				<th scope="col">Зуб (FDI)</th>
																				<th scope="col">Вид конструкции / Материал</th>
																				<th scope="col">Пациент</th>
																				<th scope="col">Статус / Дата</th>
																				<th scope="col">Стоимость ЗТЛ</th>
																				<th scope="col">Удержано с врача</th>
																			</tr>
																		</thead>
																		<tbody>
																			{(row.labOrders ?? []).map((order) => (
																				<tr key={order.id}>
																					<td data-label="№ Наряда" className="ops-num">
																						<strong>№ {order.orderNumber}</strong>
																					</td>
																					<td data-label="Зуб (FDI)">
																						<span className="ops-badge-tooth">
																							{order.toothFdi || "—"}
																						</span>
																					</td>
																					<td data-label="Конструкция">
																						<strong>{order.restorationType}</strong>
																						{order.material ? (
																							<>
																								<br />
																								<span className="ops-note">
																									{order.material}
																								</span>
																							</>
																						) : null}
																					</td>
																					<td data-label="Пациент">{order.patientName}</td>
																					<td data-label="Статус">
																						<span className="ops-state ops-state--ok">
																							{order.status === "completed"
																								? "Сдан"
																								: order.status === "received"
																									? "Получен"
																									: order.status}
																						</span>
																						{order.completedAt ? (
																							<>
																								<br />
																								<span className="ops-note">
																									{new Date(
																										order.completedAt,
																									).toLocaleDateString("ru-RU")}
																								</span>
																							</>
																						) : null}
																					</td>
																					<td
																						data-label="Стоимость ЗТЛ"
																						className="ops-num"
																					>
																						{money(order.priceRub)}
																					</td>
																					<td
																						data-label="Удержано"
																						className="ops-num ops-strong"
																					>
																						{money(order.withheldRub)}
																						<br />
																						<span className="ops-note">
																							({order.deductionPct}%)
																						</span>
																					</td>
																				</tr>
																			))}
																		</tbody>
																	</table>
																</div>
															)}
														</div>
													)}
												</div>
											</td>
										</tr>
									) : null}
								</Fragment>
							);
						})}
					</tbody>
				</table>
			</div>

			{/*
				Причина и действие по каждой строке приходят с сервера готовым
				текстом. Они стоят под таблицей, а не в подсказке ячейки: на
				планшете подсказки не открываются, а именно здесь написано, что
				владельцу сделать, чтобы сумма появилась.
			*/}
			{/*
				Отказ сохранения ставки стоит под таблицей, а не в ячейке: в узкой
				числовой колонке причина не читается, а знать её обязательно —
				иначе владелец решит, что процент сохранён, и продолжит платить по
				старому.
			*/}
			{rateSave.kind === "failed" ? (
				<p className="ops-notice ops-notice--error" role="alert">
					{rateSave.message}
				</p>
			) : null}

			<ul className="ops-bars">
				{report.rows.map((row) => (
					<li className="ops-hint" key={`note-${row.doctorUserId}`}>
						<strong>{row.doctorName}.</strong> {row.note}
					</li>
				))}
			</ul>
		</>
	);
}
