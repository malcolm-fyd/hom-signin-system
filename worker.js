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
          headers: { 'Content-Type': 'application/json' },
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
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (request.method === 'GET' && url.pathname === '/api/logs') {
        const { results } = await env.DB.prepare(
          `SELECT * FROM trades_log WHERE status = 'in' ORDER BY signInTime DESC`
        ).all();

        return new Response(JSON.stringify({ results }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (request.method === 'GET' && url.pathname === '/api/report') {
        const { results } = await env.DB.prepare(
          `SELECT * FROM trades_log WHERE status = 'in' ORDER BY signInTime DESC`
        ).all();

        return new Response(JSON.stringify({ results }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (request.method === 'GET' && url.pathname === '/api/report/all') {
        const { results } = await env.DB.prepare(
          `SELECT * FROM trades_log ORDER BY signInTime DESC`
        ).all();

        return new Response(JSON.stringify({ results }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 });

    } catch (error) {
      console.error(error);
      return new Response(JSON.stringify({ error: 'Internal Server Error', message: error.message }), { status: 500 });
    }
  },
};
