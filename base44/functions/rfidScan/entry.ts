import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Endpoint para o hardware enviar a leitura de uma tag RFID/NFC.
 *
 * Método: POST
 * Body JSON: { "uid": "AABBCCDD", "client_id": "xxx" }
 *
 * O campo client_id é obrigatório para garantir que o funcionário
 * pertence ao cliente correto (evita uso de tag em outro cliente).
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
    const uid = (body.uid || "").trim().toUpperCase();
    const clientId = (body.client_id || "").trim();

    if (!uid) {
      return Response.json(
        { ok: false, error: "UID não informado" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    if (!clientId) {
      return Response.json(
        { ok: false, error: "client_id não informado" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Busca o cliente para obter o nome
    let client = null;
    try {
      client = await base44.asServiceRole.entities.Client.get(clientId);
    } catch {
      client = null;
    }

    if (!client) {
      return Response.json(
        { ok: false, error: "Cliente não encontrado" },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Busca funcionário com esta tag UID
    const employees = await base44.asServiceRole.entities.Employee.filter({
      tag_uid: uid,
      active: true,
    });

    const employee = employees[0] || null;

    if (!employee) {
      return Response.json(
        { ok: false, error: "Nenhum funcionário encontrado com esta tag" },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Verifica se o funcionário pertence ao cliente informado
    if (employee.client_id !== clientId) {
      return Response.json(
        {
          ok: false,
          error: `Tag não pertence a um funcionário do cliente "${client.name}"`,
          employee_client_id: employee.client_id,
        },
        { status: 403, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Registra a leitura para o frontend consumir via polling
    await base44.asServiceRole.entities.TagScan.create({
      uid,
      employee_id: employee.id,
      employee_name: employee.name,
      client_id: clientId,
      scanned_at: new Date().toISOString(),
      consumed: false,
    });

    return Response.json(
      {
        ok: true,
        employee_name: employee.name,
        client_name: client.name,
      },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error) {
    return Response.json(
      { ok: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
});