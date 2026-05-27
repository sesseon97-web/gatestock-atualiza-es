import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Endpoint para o hardware enviar a leitura de uma tag RFID/NFC.
 *
 * Método: POST
 * Body JSON: { "uid": "AABBCCDD" }
 */

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
    console.log("[rfidScan] Body recebido:", JSON.stringify(body));
    const uid = (body.uid || "").trim().toUpperCase();
    const clientId = (body.client_id || "").trim();
    console.log("[rfidScan] UID processado:", uid, "| client_id:", clientId);

    if (!uid) {
      return Response.json({ ok: false, error: "UID não informado" }, { status: 400 });
    }

    if (!clientId) {
      return Response.json({ ok: false, error: "client_id não informado" }, { status: 400 });
    }

    // Busca funcionário com esta tag UID vinculado ao cliente
    const employees = await base44.asServiceRole.entities.Employee.filter({
      tag_uid: uid,
      client_id: clientId,
      active: true,
    });

    const employee = employees[0] || null;

    if (!employee) {
      return Response.json(
        { ok: false, error: "Nenhum funcionário encontrado com esta tag para este cliente" },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Registra a leitura para o frontend consumir via polling
    await base44.asServiceRole.entities.TagScan.create({
      uid,
      employee_id: employee.id,
      employee_name: employee.name,
      client_id: employee.client_id,
      scanned_at: new Date().toISOString(),
      consumed: false,
    });

    return Response.json(
      { ok: true, employee_name: employee.name },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error) {
    return Response.json(
      { ok: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
});