export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        try {
            if (request.method === 'POST' && url.pathname === '/api/signin') {
                const { businessName, personName, mobileNumber, jobInfo } = await request.json();
                const signInTime = new Date().toISOString();
                const status = 'in';

                await env.DB.prepare(
                    `INSERT INTO trades_log (businessName, personName, mobileNumber, jobInfo, status, signInTime)
           VALUES (?, ?, ?, ?, ?, ?)`
                ).bind(businessName, personName, mobileNumber, jobInfo, status, signInTime).run();

                return new Response(JSON.stringify({ success: true }), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                });
            }

            if (request.method === 'POST' && url.pathname === '/api/signout') {
                const { id } = await request.json();
                const signOutTime = new Date().toISOString();
                const status = 'out';

                await env.DB.prepare(
                    `UPDATE trades_log SET status = ?, signOutTime = ? WHERE id = ?`
                ).bind(status, signOutTime, id).run();

                return new Response(JSON.stringify({ success: true }), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                });
            }

            if (request.method === 'GET') {
                switch (url.pathname) {
                    case '/api/logs':
                        const { results: signedInLogs } = await env.DB.prepare(
                            `SELECT * FROM trades_log WHERE status = 'in' ORDER BY signInTime DESC`
                        ).all();
                        return new Response(JSON.stringify({ results: signedInLogs }), {
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                        });

                    case '/api/logs/daily':
                        const today = new Date().toISOString().slice(0, 10);
                        const { results: dailyLogs } = await env.DB.prepare(
                            `SELECT * FROM trades_log WHERE SUBSTR(signInTime, 1, 10) = ? ORDER BY signInTime DESC`
                        ).bind(today).all();
                        return new Response(JSON.stringify({ results: dailyLogs }), {
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                        });

                    case '/api/report':
                        const { searchParams } = url;
                        const startDate = searchParams.get('startDate');
                        const endDate = searchParams.get('endDate');

                        const { results: reportResults } = await env.DB.prepare(
                            `SELECT * FROM trades_log WHERE date(signInTime) BETWEEN ? AND ? ORDER BY signInTime DESC`
                        ).bind(startDate, endDate).all();

                        return new Response(JSON.stringify({ results: reportResults }), {
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                        });

                    case '/api/report/all':
                        const { results: allLogs } = await env.DB.prepare(
                            `SELECT * FROM trades_log ORDER BY signInTime DESC`
                        ).all();
                        return new Response(JSON.stringify({ results: allLogs }), {
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                        });

                    default:
                        return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 });
                }
            }

            return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 });

        } catch (error) {
            console.error(error);
            return new Response(JSON.stringify({ error: 'Internal Server Error', message: error.message }), { status: 500 });
        }
    },
};
```eof
