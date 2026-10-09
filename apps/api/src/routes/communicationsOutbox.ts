/**
 * routes/communicationsOutbox.ts — Canonical Facade for Outbox Routes.
 * Fully decomposed into modular DAG layers under ./outbox/.
 */

import { registerCommunicationOutboxRoutes } from "./outbox/outboxRouteHandlers.js";

export { registerCommunicationOutboxRoutes };
export default registerCommunicationOutboxRoutes;
export * from "./outbox/types.js";
