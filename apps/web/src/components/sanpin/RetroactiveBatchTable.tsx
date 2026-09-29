/**
 * ============================================================================
 * RETROACTIVE BATCH TABLE (SanPiN 3.3686-21)
 * Таблица смен сгенерированного пакета журналов СанПиН за период
 * с поддержкой инлайн-редактирования строк и подтверждения удаления смен.
 * ============================================================================
 */

import {
	Check,
	Edit3,
	Trash2,
	X,
} from "lucide-react";
import React from "react";
import type { RetroactiveDayRecord } from "./retroactiveSanpinEngine.js";

export interface RetroactiveBatchTableProps {
	readonly filteredDays: RetroactiveDayRecord[];
	readonly editingDayId: string | null;
	readonly editFormData: Partial<RetroactiveDayRecord>;
	readonly setEditFormData: React.Dispatch<React.SetStateAction<Partial<RetroactiveDayRecord>>>;
	readonly onStartEditing: (day: RetroactiveDayRecord) => void;
	readonly onSaveEditing: (dayId: string) => void;
	readonly onCancelEditing: () => void;
	readonly onRequestDeleteDay: (dayId: string) => void;
	readonly onConfirmDeleteDay: (dayId: string) => void;
	readonly onCancelDeleteDay: () => void;
	readonly pendingDeleteDayId: string | null;
}

export function RetroactiveBatchTable({
	filteredDays,
	editingDayId,
	editFormData,
	setEditFormData,
	onStartEditing,
	onSaveEditing,
	onCancelEditing,
	onRequestDeleteDay,
	onConfirmDeleteDay,
	onCancelDeleteDay,
	pendingDeleteDayId,
}: RetroactiveBatchTableProps) {
	return (
		<div className="sanpin-table-wrapper">
			<table className="sanpin-table">
				<thead>
					<tr>
						<th style={{ width: "40px" }}>№</th>
						<th style={{ minWidth: "110px" }}>Дата / День</th>
						<th style={{ minWidth: "140px" }}>Кабинеты</th>
						<th style={{ minWidth: "110px" }}>Лотков / Приемов</th>
						<th style={{ minWidth: "120px" }}>ПСО (Азопирам)</th>
						<th style={{ minWidth: "150px" }}>Автоклавирование</th>
						<th style={{ minWidth: "120px" }}>Рециркуляторы</th>
						<th style={{ minWidth: "130px" }}>Уборка</th>
						<th style={{ minWidth: "100px" }}>Статус</th>
						<th style={{ minWidth: "120px" }}>Штамп ЭЦП</th>
						<th style={{ minWidth: "80px", textAlign: "center" }}>Действия</th>
					</tr>
				</thead>
				<tbody>
					{filteredDays.length === 0 ? (
						<tr>
							<td colSpan={11} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
								Записи не найдены. Нажмите «Заполнить все журналы стерилизации за период» для расчета.
							</td>
						</tr>
					) : (
						filteredDays.map((day, idx) => {
							const isEditing = editingDayId === day.id;

							if (isEditing) {
								return (
									<tr key={day.id} style={{ background: "rgba(37, 99, 235, 0.06)" }}>
										<td style={{ textAlign: "center" }}>{idx + 1}</td>
										<td>
											<input
												type="date"
												value={editFormData.date || day.date}
												onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
												className="sanpin-input"
												style={{ minHeight: "36px", fontSize: "0.8rem", width: "100%" }}
											/>
										</td>
										<td>
											<input
												type="text"
												value={editFormData.cabinetsListRu ?? day.cabinetsListRu}
												onChange={(e) => setEditFormData({ ...editFormData, cabinetsListRu: e.target.value })}
												className="sanpin-input"
												style={{ minHeight: "36px", fontSize: "0.8rem", width: "100%" }}
											/>
										</td>
										<td>
											<div style={{ display: "flex", gap: "0.25rem" }}>
												<input
													type="number"
													value={editFormData.traysProcessedCount ?? day.traysProcessedCount}
													onChange={(e) =>
														setEditFormData({
															...editFormData,
															traysProcessedCount: Number(e.target.value),
														})
													}
													className="sanpin-input"
													style={{ minHeight: "36px", fontSize: "0.8rem", width: "65px" }}
													title="Лотков"
												/>
												<input
													type="number"
													value={editFormData.visitsCount ?? day.visitsCount}
													onChange={(e) =>
														setEditFormData({
															...editFormData,
															visitsCount: Number(e.target.value),
														})
													}
													className="sanpin-input"
													style={{ minHeight: "36px", fontSize: "0.8rem", width: "65px" }}
													title="Приемов"
												/>
											</div>
										</td>
										<td>
											<div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
												<label style={{ fontSize: "0.75rem" }}>
													Выборка:
													<input
														type="number"
														value={editFormData.psoSampleCount ?? day.psoSampleCount}
														onChange={(e) =>
															setEditFormData({
																...editFormData,
																psoSampleCount: Number(e.target.value),
															})
														}
														className="sanpin-input"
														style={{ minHeight: "32px", fontSize: "0.8rem", width: "50px", marginLeft: "4px" }}
													/>
												</label>
												<span className="sanpin-tag sanpin-tag-success" style={{ fontSize: "0.72rem" }}>
													Азопирам отр.
												</span>
											</div>
										</td>
										<td>
											<div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
												<label style={{ fontSize: "0.75rem" }}>
													Циклов:
													<input
														type="number"
														value={editFormData.autoclaveCyclesCount ?? day.autoclaveCyclesCount}
														onChange={(e) =>
															setEditFormData({
																...editFormData,
																autoclaveCyclesCount: Number(e.target.value),
															})
														}
														className="sanpin-input"
														style={{ minHeight: "32px", fontSize: "0.8rem", width: "50px", marginLeft: "4px" }}
													/>
												</label>
												<span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
													134°C / 5 точек ОК
												</span>
											</div>
										</td>
										<td>
											<input
												type="number"
												step="0.5"
												value={editFormData.recirculatorOperatingHours ?? day.recirculatorOperatingHours}
												onChange={(e) =>
													setEditFormData({
														...editFormData,
														recirculatorOperatingHours: Number(e.target.value),
													})
												}
												className="sanpin-input"
												style={{ minHeight: "36px", fontSize: "0.8rem", width: "70px" }}
											/>
										</td>
										<td>
											<input
												type="text"
												value={editFormData.cleaningTypeRu ?? day.cleaningTypeRu}
												onChange={(e) => setEditFormData({ ...editFormData, cleaningTypeRu: e.target.value })}
												className="sanpin-input"
												style={{ minHeight: "36px", fontSize: "0.8rem", width: "100%" }}
											/>
										</td>
										<td>
											<span className="sanpin-tag sanpin-tag-success"><Check size={12} /> Норма</span>
										</td>
										<td>
											<input
												type="text"
												value={editFormData.nurseFullName ?? day.nurseFullName}
												onChange={(e) => setEditFormData({ ...editFormData, nurseFullName: e.target.value })}
												className="sanpin-input"
												style={{ minHeight: "36px", fontSize: "0.8rem", width: "100%" }}
											/>
										</td>
										<td style={{ textAlign: "center" }}>
											<div style={{ display: "flex", gap: "0.3rem", justifyContent: "center" }}>
												<button
													type="button"
													onClick={() => onSaveEditing(day.id)}
													className="sanpin-btn sanpin-btn-primary"
													style={{ minHeight: "32px", padding: "0.25rem 0.5rem" }}
													title="Сохранить правку"
												>
													<Check size={14} />
												</button>
												<button
													type="button"
													onClick={onCancelEditing}
													className="sanpin-btn sanpin-btn-secondary"
													style={{ minHeight: "32px", padding: "0.25rem 0.5rem" }}
													title="Отмена"
												>
													<X size={14} />
												</button>
											</div>
										</td>
									</tr>
								);
							}

							return (
								<tr
									key={day.id}
									className="sanpin-log-row"
									style={{
										minHeight: "44px",
										contentVisibility: "auto",
										containIntrinsicSize: "1px 44px",
										contain: "content",
										opacity: day.isWorkingDay ? 1 : 0.65,
										background: day.isSavedToDb ? "rgba(16, 185, 129, 0.03)" : undefined,
									}}
								>
									<td style={{ textAlign: "center", color: "var(--muted)", fontFeatureSettings: "tnum" }}>
										{idx + 1}
									</td>
									<td>
										<strong>{day.date}</strong>
										<div style={{ fontSize: "0.75rem", color: day.isWorkingDay ? "var(--muted)" : "var(--bad-fg)" }}>
											{day.dayOfWeekRu} {!day.isWorkingDay && "(Выходной)"}
										</div>
									</td>
									<td>
										<span style={{ fontSize: "0.82rem" }}>{day.cabinetsListRu}</span>
									</td>
									<td>
										{day.isWorkingDay ? (
											<div>
												<strong>{day.traysProcessedCount}</strong> лотков
												<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
													{day.visitsCount} приемов
												</div>
											</div>
										) : (
											<span style={{ color: "var(--muted)" }}>—</span>
										)}
									</td>
									<td>
										{day.isWorkingDay ? (
											<div>
												<span className="sanpin-tag sanpin-tag-success" style={{ fontSize: "0.75rem" }}>
													{day.psoSampleCount} проб (Отр.)
												</span>
												<div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "2px" }}>
													{day.psoDetergent}
												</div>
											</div>
										) : (
											<span style={{ color: "var(--muted)" }}>—</span>
										)}
									</td>
									<td>
										{day.isWorkingDay ? (
											<div>
												<strong>{day.autoclaveCyclesCount}</strong> циклов
												<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
													134°C (5 точек ОК)
												</div>
											</div>
										) : (
											<span style={{ color: "var(--muted)" }}>Консервация</span>
										)}
									</td>
									<td>
										{day.isWorkingDay ? (
											<span>{day.recirculatorOperatingHours} ч</span>
										) : (
											<span style={{ color: "var(--muted)" }}>0 ч</span>
										)}
									</td>
									<td>
										<div style={{ fontSize: "0.82rem" }}>{day.cleaningTypeRu}</div>
										{day.isGeneralCleaningDay && (
											<span
												style={{
													fontSize: "0.72rem",
													background: "var(--teal-surface, rgba(13, 148, 136, 0.12))",
													color: "var(--teal)",
													padding: "0.1rem 0.35rem",
													borderRadius: "4px",
													fontWeight: 700,
												}}
											>
												Генеральная
											</span>
										)}
									</td>
									<td>
										{day.sanpinCompliance100 ? (
											<span className="sanpin-tag sanpin-tag-success" title="Все тесты соответствуют нормам">
												<Check size={12} /> 100% Норма
											</span>
										) : (
											<span className="sanpin-tag sanpin-tag-danger">Замечание</span>
										)}
									</td>
									<td>
										<div style={{ fontSize: "0.8rem", fontWeight: 600 }}>{day.nurseFullName}</div>
										<div
											style={{
												fontSize: "0.68rem",
												fontFamily: "monospace",
												color: "var(--muted)",
												overflow: "hidden",
												textOverflow: "ellipsis",
												maxWidth: "110px",
											}}
											title={day.electronicStampHash}
										>
											{day.electronicStampHash.slice(0, 18)}...
										</div>
									</td>
									<td style={{ textAlign: "center" }}>
										{pendingDeleteDayId === day.id ? (
											<div style={{ display: "flex", alignItems: "center", gap: "0.3rem", justifyContent: "center" }}>
												<span style={{ fontSize: "0.75rem", color: "var(--bad-fg)", fontWeight: 700 }}>Удалить?</span>
												<button
													type="button"
													onClick={() => onConfirmDeleteDay(day.id)}
													className="sanpin-btn sanpin-btn-primary"
													style={{ minHeight: "28px", padding: "0.15rem 0.45rem", fontSize: "0.75rem", background: "var(--bad-fg)", fontWeight: 700 }}
													title="Подтвердить удаление смены"
												>
													Да
												</button>
												<button
													type="button"
													onClick={onCancelDeleteDay}
													className="sanpin-btn sanpin-btn-secondary"
													style={{ minHeight: "28px", padding: "0.15rem 0.45rem", fontSize: "0.75rem" }}
													title="Отмена"
												>
													Нет
												</button>
											</div>
										) : (
											<div style={{ display: "flex", gap: "0.3rem", justifyContent: "center" }}>
												<button
													type="button"
													onClick={() => onStartEditing(day)}
													style={{
														background: "none",
														border: "none",
														cursor: "pointer",
														color: "var(--teal)",
														padding: "0.25rem",
													}}
													title="Редактировать смену"
												>
													<Edit3 size={15} />
												</button>
												<button
													type="button"
													onClick={() => onRequestDeleteDay(day.id)}
													style={{
														background: "none",
														border: "none",
														cursor: "pointer",
														color: "var(--bad-fg)",
														padding: "0.25rem",
													}}
													title="Удалить смену (с подтверждением)"
												>
													<Trash2 size={15} />
												</button>
											</div>
										)}
									</td>
								</tr>
							);
						})
					)}
				</tbody>
			</table>
		</div>
	);
}
