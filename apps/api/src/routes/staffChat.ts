import type { FastifyInstance } from "fastify";
import { registerStaffChatChannelRoutes } from "./staffChat/channelRoutes.js";
import { registerStaffChatIntercomRoutes } from "./staffChat/intercomRoutes.js";
import { registerStaffChatMessageRoutes } from "./staffChat/messageRoutes.js";

export async function registerStaffChatRoutes(app: FastifyInstance) {
	registerStaffChatChannelRoutes(app);
	registerStaffChatMessageRoutes(app);
	registerStaffChatIntercomRoutes(app);
}
