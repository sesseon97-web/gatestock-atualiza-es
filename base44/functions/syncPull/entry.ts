import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SYNC_KEY = "gatestock123"; // depois podemos trocar por uma chave mais forte

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const url = new URL(req.url);
    let clientId = url.searchParams.get("client_id");
    let syncKey = url.searchParams.get("sync_key");

    // Permite também enviar os parâmetros via corpo JSON (POST/PUT)
    if (!clientId || !syncKey) {
      try {
        const body = await req.json();
        if (!clientId) clientId = body.client_id;
        if (!syncKey) syncKey = body.sync_key;
      } catch (e) {
        // corpo não é JSON ou está vazio — segue com os parâmetros da URL
      }
    }

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

    // Cliente (pega o registro do próprio cliente)
    const clientes = await base44.asServiceRole.entities.Client.filter({
      id: clientId
    });

    // Armários vinculados ao cliente (via campo armario_id)
    const armarios = await base44.asServiceRole.entities.Armario.list();

    // Usuários = funcionários (Employee) vinculados a este cliente
    const usuarios = await base44.asServiceRole.entities.Employee.filter({
      client_id: clientId
    });

    // Cartões = UIDs de RFID (TagScan) vinculados a este cliente
    const cartoes = await base44.asServiceRole.entities.TagScan.filter({
      client_id: clientId
    });

    // Produtos = alocações do cliente (ClientAllocation) + catálogo global (Product)
    const produtosAlocados = await base44.asServiceRole.entities.ClientAllocation.filter({
      client_id: clientId
    });

    const produtos = await base44.asServiceRole.entities.Product.list();

    return Response.json({
      ok: true,
      client_id: clientId,
      sincronizado_em: new Date().toISOString(),
      dados: {
        clientes,
        armarios,
        usuarios,
        cartoes,
        produtos,
        produtosAlocados
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