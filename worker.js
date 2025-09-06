// This Cloudflare Worker acts as the backend API for the sign-in app.
// It uses a Cloudflare D1 database to store and retrieve log entries.

// IMPORTANT: Before deploying this worker, you must
// 1. Create a D1 database in your Cloudflare dashboard.
// 2. Add the D1 binding to this worker in your `wrangler.toml` file.
//    Example `wrangler.toml` entry:
//    [[d1_databases]]
//    binding = "DB"s
//    database_name = "hom-sign-in-system"
//    database_id = "627eb2aa-9116-46fe-a640-02783a140320"
//
// 3. Run the following SQL command to create the necessary table:
//    CREATE TABLE trades_log (
//        id INTEGER PRIMARY KEY AUTOINCREMENT,
//        businessName TEXT NOT NULL,
//        personName TEXT NOT NULL,
//        mobileNumber TEXT NOT NULL,
//        jobInfo TEXT NOT NULL,
//        status TEXT NOT NULL,
//        signInTime TEXT NOT NULL,
//        signOutTime TEXT
//    );

// Define the API router
const router = async (request, env) => {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Allows requests from any origin
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (method === 'OPTIONS') {
        return new Response(null, { headers });
    }

    try {
        switch (path) {
            case '/api/signin':
                if (method !== 'POST') return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers });
                
                const signInData = await request.json();
                const { businessName, personName, mobileNumber, jobInfo } = signInData;
                const signInTime = new Date().toISOString();
                const status = 'in';

                // Insert a new log entry into the D1 database
                const insertStatement = env.DB.prepare(
                    'INSERT INTO trades_log (businessName, personName, mobileNumber, jobInfo, status, signInTime) VALUES (?, ?, ?, ?, ?, ?)'
                );
                await insertStatement.bind(businessName, personName, mobileNumber, jobInfo, status, signInTime).run();

                return new Response(JSON.stringify({ success: true, message: 'Signed in successfully.' }), { status: 200, headers });
            
            case '/api/signout':
                if (method !== 'POST') return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers });
                
                const signOutData = await request.json();
                const { id } = signOutData;
                const signOutTime = new Date().toISOString();
                const signOutStatus = 'out';

                // Update the log entry with a sign-out time and new status
                const updateStatement = env.DB.prepare(
                    'UPDATE trades_log SET signOutTime = ?, status = ? WHERE id = ?'
                );
                await updateStatement.bind(signOutTime, signOutStatus, id).run();

                return new Response(JSON.stringify({ success: true, message: 'Signed out successfully.' }), { status: 200, headers });

            case '/api/logs':
                if (method !== 'GET') return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers });

                // Fetch all log entries from the D1 database
                const { results } = await env.DB.prepare('SELECT * FROM trades_log ORDER BY signInTime DESC').all();

                return new Response(JSON.stringify({ success: true, results }), { status: 200, headers });

            default:
                return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers });
        }
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
    }
};

addEventListener('fetch', event => {
    event.respondWith(router(event.request, event.env));
});
