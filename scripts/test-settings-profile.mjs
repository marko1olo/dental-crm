import { createRequire } from "module";
import path from "path";
import { pathToFileURL } from "url";

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");

const settingsRoutePath = path.resolve("apps/api/dist/routes/settings.js");
const { registerSettingsRoutes } = await import(pathToFileURL(settingsRoutePath).href);

async function run() {
  process.env.DENTAL_STATE_PERSISTENCE = "off";
  process.env.NODE_ENV = "development";
  process.env.DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS = "1";

  const app = Fastify({ logger: false });
  
  // Custom error handler to log full stack trace
  app.setErrorHandler((error, request, reply) => {
    console.error("UNCAUGHT EXCEPTION IN FASTIFY:");
    console.error(error);
    reply.code(500).send(error);
  });

  await registerSettingsRoutes(app);

  const response = await app.inject({
    method: "PUT",
    url: "/api/settings/clinic/profile",
    payload: {
      clinicName: "Schedule Smoke Dental",
      timezone: "Europe/Samara",
      defaultVisitMinutes: 45,
      scheduleDefaults: {
        workdayStart: "10:00",
        workdayEnd: "12:00",
        workingDays: [2],
        appointmentBufferMinutes: 35
      }
    }
  });

  console.log("Response status:", response.statusCode);
  console.log("Response body:", response.body);
  await app.close();
}

run().catch(console.error);
