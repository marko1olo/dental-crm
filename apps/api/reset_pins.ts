import "dotenv/config";
import { db } from "./src/db/db";
import { users } from "./src/db/schema";
import { eq } from "drizzle-orm";
import { hashCredential } from "./src/utils/crypto";

(async () => {
    try {
        console.log("Hashing 1234...");
        const hash = await hashCredential("1234");
        console.log("Hash generated:", hash);
        
        console.log("Updating all users' PINs...");
        const res = await db.update(users).set({ pinCodeHash: hash }).returning({ id: users.id, fullName: users.fullName });
        console.log("Updated users:", res.length);
        
        console.log("Setting password for doctor@clinic.com to admin123");
        const pwHash = await hashCredential("admin123");
        const res2 = await db.update(users).set({ passwordHash: pwHash }).where(eq(users.email, 'doctor@clinic.com')).returning({ id: users.id });
        console.log("Updated password for doctor:", res2.length);
        
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
