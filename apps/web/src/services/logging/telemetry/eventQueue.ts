/**
 * DENTE CRM — Staff Activity Event Queue
 *
 * Управляет кольцевым буфером событий аудита в оперативной памяти с ограничением размера FIFO,
 * дедупликацией и синхронизацией с локальным хранилищем.
 */

import type { StaffActionAuditEntry } from "@dental/shared";
import {
	clearStaffEventsFromStorage,
	loadStaffEventsFromStorage,
	saveStaffEventsToStorage,
} from "./batchTransport.js";
import { MAX_OFFLINE_STAFF_EVENTS } from "./types.js";

export class StaffEventQueue {
	private queue: StaffActionAuditEntry[] = [];

	constructor() {
		this.load();
	}

	/**
	 * Загрузка очереди из локального хранилища
	 */
	public load(): void {
		this.queue = loadStaffEventsFromStorage();
	}

	/**
	 * Добавление события в кольцевой буфер с соблюдением предела FIFO
	 */
	public push(entry: StaffActionAuditEntry): void {
		this.queue.push(entry);

		// Кольцевой буфер с ограничением размера FIFO (Мандат 8d: Quiet Telemetry)
		if (this.queue.length > MAX_OFFLINE_STAFF_EVENTS) {
			this.queue.shift();
		}

		this.save();
	}

	/**
	 * Получение снимка текущей очереди ожидающих синхронизации событий
	 */
	public getEvents(): readonly StaffActionAuditEntry[] {
		return [...this.queue];
	}

	/**
	 * Получение копии массива событий для батч-отправки
	 */
	public getSnapshot(): StaffActionAuditEntry[] {
		return [...this.queue];
	}

	/**
	 * Удаление успешно отправленных событий по идентификаторам
	 */
	public removeSent(sentIds: Set<string>): void {
		this.queue = this.queue.filter((e) => !e.id || !sentIds.has(e.id as string));
		this.save();
	}

	/**
	 * Полная очистка очереди и хранилища
	 */
	public clear(): void {
		this.queue = [];
		clearStaffEventsFromStorage();
	}

	/**
	 * Текущее количество элементов в очереди
	 */
	public size(): number {
		return this.queue.length;
	}

	/**
	 * Сохранение очереди в локальное хранилище
	 */
	public save(): void {
		saveStaffEventsToStorage(this.queue);
	}
}
