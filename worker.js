export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const HOURS_OFFSET = 9.5; // ACST Australia is +9.5 hours
        const UTC_OFFSET_MINUTES = HOURS_OFFSET * 60;

        const getLocalTime = () => {
            const now = new Date();
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            return new Date(utc + (UTC_OFFSET_MINUTES * 60000));
        };

        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const seconds = date.getSeconds().toString().padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        };

        try {
            if (request.method === 'POST' && url.pathname === '/api/signin') {
                const { businessName, personName, mobileNumber, jobInfo } = await request.json();
                const signInTime = formatDate(getLocalTime());
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
                const signOutTime = formatDate(getLocalTime());
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

                    case '/api/report':
                        const { searchParams } = url;
                        const startDate = searchParams.get('startDate');
                        const endDate = searchParams.get('endDate');

                        const { results: reportResults } = await env.DB.prepare(
                            `SELECT * FROM trades_log WHERE DATE(signInTime) BETWEEN ? AND ? ORDER BY signInTime DESC`
                        ).bind(startDate, endDate).all();

                        return new Response(JSON.stringify({ results: reportResults }), {
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
