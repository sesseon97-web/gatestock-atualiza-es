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
    const clientId = (body.client_id || "").trim();

    console.log("[rfidScanV2] uid:", uid, "client_id:", clientId);

    if (!uid || !clientId) {
      return Response.json(
        { ok: false, error: "uid e client_id são obrigatórios" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const employees = await base44.asServiceRole.entities.Employee.filter({
      tag_uid: uid,
      client_id: clientId,
      active: true,
    });

    const employee = employees && employees[0] ? employees[0] : null;

    if (!employee) {
      await base44.asServiceRole.entities.TagScan.create({
        uid,
        employee_id: "__registro__",
        employee_name: "__registro__",
        client_id: clientId,
        scanned_at: new Date().toISOString(),
        consumed: false,
      });
      console.log("[rfidScanV2] Tag não cadastrada, gravado como __registro__");
      return Response.json(
        { ok: false, error: "Nenhum funcionário encontrado com esta tag", uid_captured: true },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    await base44.asServiceRole.entities.TagScan.create({
      uid,
      employee_id: employee.id,
      employee_name: employee.name,
      client_id: employee.client_id,
      scanned_at: new Date().toISOString(),
      consumed: false,
    });

    console.log("[rfidScanV2] Funcionário identificado:", employee.name);

    return Response.json(
      { ok: true, employee_name: employee.name },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error) {
    console.log("[rfidScanV2] Erro:", error.message);
    return Response.json(
      { ok: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
});