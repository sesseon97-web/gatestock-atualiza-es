import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Endpoint para o hardware enviar a leitura de uma tag RFID/NFC.
 *
 * Método: POST
 * Body JSON: { "uid": "AABBCCDD", "client_id": "xxx" }
 *
 * O hardware deve enviar a UID lida. O sistema busca o funcionário com
 * aquela tag e registra a leitura na entidade TagScan para que o frontend
 * faça polling e identifique o funcionário automaticamente.
 *
 * Resposta de sucesso: { "ok": true, "employee_name": "..." }
 * Resposta de erro:    { "ok": false, "error": "..." }
 */

Deno.serve(async (req) => {
  // Permitir CORS para facilitar testes
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const uid = (body.uid || "").trim().toUpperCase();

    if (!uid) {
      return Response.json({ ok: false, error: "UID não informado" }, { status: 400 });
    }

    // Busca o funcionário com esta tag UID
    const employees = await base44.asServiceRole.entities.Employee.filter({
      tag_uid: uid,
      active: true,
    });

    const employee = employees[0] || null;

    if (!employee) {
      return Response.json(
        { ok: false, error: "Nenhum funcionário encontrado com esta tag" },
        { status: 404 }
      );
    }

    // Salva um registro de leitura para o frontend fazer polling
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
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});