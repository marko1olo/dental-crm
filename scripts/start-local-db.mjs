import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";

async function main() {
    console.log("Starting embedded postgres on port 5432...");
    const pg = new EmbeddedPostgres({
        databaseDir: ".local-pg-data",
        user: "dental",
        password: "dental",
        database: "postgres", // Connect to default DB first
        port: 5432,
        initdbFlags: ["--encoding=UTF8", "--locale=C"]
    });
    
    if (!fs.existsSync(".local-pg-data")) {
        console.log("Initializing database cluster...");
        await pg.initialise();
    }
    await pg.start();
    console.log("Postgres started!");
    
    const { Client } = await import("pg");
    const client = new Client({
        connectionString: "postgres://dental:dental@127.0.0.1:5432/postgres"
    });
    
    await client.connect();
    
    // Check if dental_crm exists
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = 'dental_crm'`);
    if (res.rowCount === 0) {
        console.log("Creating dental_crm database...");
        await client.query(`CREATE DATABASE dental_crm`);
        console.log("Database dental_crm created.");
    } else {
        console.log("Database dental_crm already exists.");
    }
    
    await client.end();

    console.log("Local database is ready to use! (Press Ctrl+C to stop)");
    
    // Keep process alive until interrupted
    process.on("SIGINT", async () => {
        console.log("\nStopping database...");
        await pg.stop();
        process.exit(0);
    });
    process.on("SIGTERM", async () => {
        console.log("\nStopping database...");
        await pg.stop();
        process.exit(0);
    });
}
main().catch(console.error);
