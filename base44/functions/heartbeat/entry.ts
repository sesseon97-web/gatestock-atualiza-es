import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// POST /api/heartbeat
// Body: { "armario": "ARMARIO001", "online": true, "versao": "1.0.0" }
// Atualiza o status online e ultima_comunicacao do armário
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { armario, online, versao } = body;

    if (!armario) {
      return Response.json({ error: "Campo 'armario' obrigatório" }, { status: 400 });
    }

    // Busca o armário pelo identificador
    const armarios = await base44.asServiceRole.entities.Armario.filter({
      identificador: armario
    });

    const agora = new Date().toISOString();

    if (armarios.length > 0) {
      // Atualiza o existente
      await base44.asServiceRole.entities.Armario.update(armarios[0].id, {
        online: online ?? true,
        ultima_comunicacao: agora,
        versao: versao || armarios[0].versao
      });
    } else {
      // Cria novo registro de armário
      await base44.asServiceRole.entities.Armario.create({
        identificador: armario,
        nome: armario,
        online: online ?? true,
        ultima_comunicacao: agora,
        versao: versao || "1.0.0"
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});