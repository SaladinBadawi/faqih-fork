import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

// Retry requests that fail to reach Neon at all ("fetch failed"), e.g. while a
// free-tier database wakes up. Errors returned by the database are not retried.
neonConfig.fetchFunction = async (
  input: RequestInfo | URL,
  init?: RequestInit
) => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(input, init);
    } catch (error) {
      if (attempt >= 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
    }
  }
};

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

export default db;
