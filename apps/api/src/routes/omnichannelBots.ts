/**
 * @file apps/api/src/routes/omnichannelBots.ts
 * @description Canonical master facade for omnichannel bots routes.
 * Decomposed into modular DAG structure in ./omnichannelBots/
 */

import { registerOmnichannelBotRoutes, omnichannelBotsRoutes } from "./omnichannelBots/index.js";
export { registerOmnichannelBotRoutes, omnichannelBotsRoutes };
export * from "./omnichannelBots/index.js";
export default registerOmnichannelBotRoutes;
