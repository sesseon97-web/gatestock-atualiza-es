import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SYNC_KEY = "gatestock123"; // depois podemos trocar por uma chave mais forte

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const url = new URL(req.url);
    const clientId = url.searchParams.get("client_id");
    const syncKey = url.searchParams.get("sync_key");

    if (syncKey !== SYNC_KEY) {
      return Response.json(
        { ok: false, error: "Chave de sincronização inválida" },
        { status: 401 }
      );
    }

    if (!clientId) {
      return Response.json(
        { ok: false, error: "client_id obrigatório" },
        { status: 400 }
      );
    }

    const clientes = await base44.asServiceRole.entities.Client.filter({
      id: clientId
    });

    const armarios = await base44.asServiceRole.entities.Armario.filter({
      client_id: clientId
    });

    const usuarios = await base44.asServiceRole.entities.Usuario.filter({
      client_id: clientId
    });

    const cartoes = await base44.asServiceRole.entities.Cartao.filter({
      client_id: clientId
    });

    const produtos = await base44.asServiceRole.entities.Produto.filter({
      client_id: clientId
    });

    return Response.json({
      ok: true,
      client_id: clientId,
      sincronizado_em: new Date().toISOString(),
      dados: {
        clientes,
        armarios,
        usuarios,
        cartoes,
        produtos
      }
    });

  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error.message
      },
      { status: 500 }
    );
  }
});