// This Cloudflare Worker acts as the backend API for the sign-in app.
// It uses a Cloudflare D1 database to store and retrieve log entries.

// IMPORTANT: Before deploying this worker, you must
// 1. Create a D1 database in your Cloudflare dashboard.
// 2. Add the D1 binding to this worker in your `wrangler.toml` file or web UI.
//    The binding name must be "DB".

export default {
    async fetch(request, env) {
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

                    const updateStatement = env.DB.prepare(
                        'UPDATE trades_log SET signOutTime = ?, status = ? WHERE id = ?'
                    );
                    await updateStatement.bind(signOutTime, signOutStatus, id).run();

                    return new Response(JSON.stringify({ success: true, message: 'Signed out successfully.' }), { status: 200, headers });

                case '/api/logs':
                    if (method !== 'GET') return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers });

                    const { results } = await env.DB.prepare('SELECT * FROM trades_log ORDER BY signInTime DESC').all();

                    return new Response(JSON.stringify({ success: true, results }), { status: 200, headers });

                default:
                    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers });
            }
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
        }
    }
};
