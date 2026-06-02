import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// GET /api/getComandos?armario=ARMARIO001
// Retorna { abrir: true/false } para o ESP32
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const armarioId = url.searchParams.get("armario");

    if (!armarioId) {
      return Response.json({ error: "Parâmetro 'armario' obrigatório" }, { status: 400 });
    }

    // Busca comandos pendentes (não executados) para este armário
    const comandos = await base44.asServiceRole.entities.Comando.filter({
      armario_id: armarioId,
      executado: false
    });

    const abrir = comandos.length > 0;

    return Response.json({ abrir });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});