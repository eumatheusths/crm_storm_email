import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ 
    connectionString: import.meta.env.DATABASE_URL 
});

export default pool;