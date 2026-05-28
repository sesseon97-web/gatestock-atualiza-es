import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const uid = (body.uid || "").trim().toUpperCase();

    if (!uid) {
      return Response.json(
        { ok: false, error: "UID nao informado" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    await base44.asServiceRole.entities.TagScan.create({
      uid,
      employee_id: "__registro__",
      employee_name: "__registro__",
      client_id: (body.client_id || "").trim(),
      scanned_at: new Date().toISOString(),
      consumed: false,
    });

    return Response.json(
      { ok: true, uid },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error) {
    return Response.json(
      { ok: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
});