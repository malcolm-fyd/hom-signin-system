export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers });
        }

        const router = {
            '/api/signin': async () => {
                if (method !== 'POST') {
                    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
                }
                const { businessName, personName, mobileNumber, jobInfo } = await request.json();
                const signInTime = new Date().toISOString();
                const status = 'in';

                try {
                    const { success } = await env.DB.prepare(
                        `INSERT INTO trades_log (businessName, personName, mobileNumber, jobInfo, status, signInTime, signOutTime) VALUES (?, ?, ?, ?, ?, ?, ?)`
                    ).bind(businessName, personName, mobileNumber, jobInfo, status, signInTime, null).run();

                    return new Response(JSON.stringify({ success, id: success.lastInsertRowid }), { headers });
                } catch (e) {
                    console.error('Sign-in error:', e);
                    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers });
                }
            },

            '/api/signout': async () => {
                if (method !== 'POST') {
                    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
                }
                const { id } = await request.json();
                const signOutTime = new Date().toISOString();

                try {
                    const { success } = await env.DB.prepare(
                        `UPDATE trades_log SET status = 'out', signOutTime = ? WHERE id = ?`
                    ).bind(signOutTime, id).run();
                    
                    if (success) {
                        return new Response(JSON.stringify({ success: true }), { headers });
                    } else {
                        return new Response(JSON.stringify({ success: false, error: 'Log entry not found' }), { status: 404, headers });
                    }
                } catch (e) {
                    console.error('Sign-out error:', e);
                    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers });
                }
            },

            '/api/logs': async () => {
                const results = await env.DB.prepare(
                    `SELECT id, businessName, personName, mobileNumber, jobInfo, status, signInTime, signOutTime FROM trades_log ORDER BY signInTime DESC`
                ).all();

                return new Response(JSON.stringify(results), { headers });
            },

            '/api/report': async () => {
                const startDate = url.searchParams.get('startDate');
                const endDate = url.searchParams.get('endDate');

                if (!startDate || !endDate) {
                    return new Response(JSON.stringify({ error: 'Start date and end date are required' }), { status: 400, headers });
                }

                try {
                    const results = await env.DB.prepare(
                        `SELECT id, businessName, personName, mobileNumber, jobInfo, status, signInTime, signOutTime
                         FROM trades_log
                         WHERE signOutTime IS NULL AND DATE(signInTime) BETWEEN ? AND ?
                         ORDER BY signInTime ASC`
                    ).bind(startDate, endDate).all();

                    return new Response(JSON.stringify(results), { headers });
                } catch (e) {
                    console.error('Report error:', e);
                    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers });
                }
            },
        };

        const routeHandler = router[path];
        if (routeHandler) {
            return routeHandler();
        }

        return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers });
    },
};
