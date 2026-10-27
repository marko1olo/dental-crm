import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { registerCreateCertificateRoute } from "./createCertificateRoute.js";
import { registerReadCertificateRoutes } from "./readCertificateRoutes.js";

export * from "./types.js";

export const registerWarrantyRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
	registerCreateCertificateRoute(app);
	registerReadCertificateRoutes(app);
};

export default registerWarrantyRoutes;
