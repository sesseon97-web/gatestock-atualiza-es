import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// POST /api/confirmarComando
// Body: { "armario": "ARMARIO001" }
// Marca todos os comandos pendentes do armário como executados
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const armarioId = body.armario;

    if (!armarioId) {
      return Response.json({ error: "Campo 'armario' obrigatório" }, { status: 400 });
    }

    // Busca comandos pendentes
    const comandos = await base44.asServiceRole.entities.Comando.filter({
      armario_id: armarioId,
      executado: false
    });

    // Marca todos como executados
    for (const cmd of comandos) {
      await base44.asServiceRole.entities.Comando.update(cmd.id, { executado: true });
    }

    return Response.json({ ok: true, executados: comandos.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});