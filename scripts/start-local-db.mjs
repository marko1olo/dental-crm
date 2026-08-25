import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";

async function main() {
    console.log("Starting embedded postgres on port 5432...");
    const pg = new EmbeddedPostgres({
        databaseDir: ".local-pg-data",
        user: "postgres",
        password: "postgres",
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
        connectionString: "postgres://postgres:postgres@127.0.0.1:5432/postgres"
    });
    
    await client.connect();

    // Ensure dental role exists and is NOSUPERUSER NOBYPASSRLS
    const roleRes = await client.query(`SELECT 1 FROM pg_roles WHERE rolname = 'dental'`);
    if (roleRes.rowCount === 0) {
        console.log("Creating role dental (NOSUPERUSER, NOBYPASSRLS)...");
        await client.query(`CREATE ROLE dental WITH LOGIN PASSWORD 'dental' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`);
    } else {
        await client.query(`ALTER ROLE dental WITH LOGIN PASSWORD 'dental' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`);
    }
    
    // Check if dental_crm exists
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = 'dental_crm'`);
    if (res.rowCount === 0) {
        console.log("Creating dental_crm database...");
        await client.query(`CREATE DATABASE dental_crm OWNER dental`);
        await client.query(`GRANT ALL PRIVILEGES ON DATABASE dental_crm TO dental`);
        console.log("Database dental_crm created.");
    } else {
        await client.query(`ALTER DATABASE dental_crm OWNER TO dental`);
        await client.query(`GRANT ALL PRIVILEGES ON DATABASE dental_crm TO dental`);
        console.log("Database dental_crm already exists.");
    }
    
    await client.end();

    const clientCrm = new Client({
        connectionString: "postgres://postgres:postgres@127.0.0.1:5432/dental_crm"
    });
    await clientCrm.connect();
    await clientCrm.query(`GRANT ALL ON SCHEMA public TO dental`);
    await clientCrm.query(`ALTER SCHEMA public OWNER TO dental`);
    await clientCrm.end();

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
