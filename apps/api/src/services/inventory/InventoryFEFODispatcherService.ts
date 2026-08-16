import { Decimal } from "decimal.js";

export interface InventoryBatch {
 id: string;
 itemId: string;
 itemName: string;
 quantity: number;
 expiryDate: Date;
 locationId: string;
}

export interface DispatchResult {
 dispatched: {
 batchId: string;
 quantity: number;
 }[];
 remainingNeed: number;
}

export interface ExpiryAlert {
 batchId: string;
 itemId: string;
 daysUntilExpiry: number;
 suggestedTransferToLocationId?: string | undefined;
}

export class InventoryFEFODispatcherService {
 public static readonly CRITICAL_EXPIRY_DAYS = 60;

 public static dispatch(
 batches: InventoryBatch[],
 requestedQuantity: number,
 now: Date = new Date(),
 ): DispatchResult {
 const availableBatches = batches
 .filter((b) => b.quantity > 0 && b.expiryDate > now)
 .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());

 const dispatched: { batchId: string; quantity: number }[] = [];
 let remaining = requestedQuantity;

 for (const batch of availableBatches) {
 if (remaining <= 0) break;

 const take = Math.min(remaining, batch.quantity);
 dispatched.push({ batchId: batch.id, quantity: take });
 remaining -= take;
 }

 return { dispatched, remainingNeed: remaining };
 }

 public static getExpiryAlerts(
 batches: InventoryBatch[],
 highDemandLocations: string[],
 now: Date = new Date(),
 ): ExpiryAlert[] {
 const alerts: ExpiryAlert[] = [];

 for (const batch of batches) {
 const diffMs = batch.expiryDate.getTime() - now.getTime();
 const daysUntilExpiry = Math.floor(diffMs / (1000 * 60 * 60 * 24));

 if (daysUntilExpiry < this.CRITICAL_EXPIRY_DAYS) {
 alerts.push({
 batchId: batch.id,
 itemId: batch.itemId,
 daysUntilExpiry,
 suggestedTransferToLocationId: highDemandLocations.includes(batch.locationId)
 ? undefined
 : highDemandLocations[0],
 });
 }
 }

 return alerts;
 }
}
