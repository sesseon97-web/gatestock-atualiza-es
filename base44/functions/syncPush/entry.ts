import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const SYNC_KEY = "gatestock123";

function getEntity(base44, nomes) {
  const entities = base44.asServiceRole.entities;

  for (const nome of nomes) {
    if (entities[nome]) {
      return entities[nome];
    }
  }

  throw new Error(`Entidade não encontrada. Tentei: ${nomes.join(", ")}`);
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json(
        { ok: false, erro: "Use POST" },
        { status: 405 }
      );
    }

    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { client_id, sync_key } = body;
    const pedidos = Array.isArray(body.pedidos) ? body.pedidos : [];

    if (sync_key !== SYNC_KEY) {
      return Response.json(
        { ok: false, erro: "sync_key inválida" },
        { status: 401 }
      );
    }

    if (!client_id) {
      return Response.json(
        { ok: false, erro: "client_id obrigatório" },
        { status: 400 }
      );
    }

    // Ajustei para tentar nomes comuns.
    // Se sua entidade tiver outro nome, me mande o erro que ajustamos.
    const Order = getEntity(base44, ["StockOrder", "Order", "Pedido", "Pedidos"]);
    const ProductAllocation = getEntity(base44, [
      "ClientAllocation",
      "ProductAllocation",
      "ProdutoAlocado",
      "ProdutosAlocados",
      "AllocatedProduct"
    ]);

    const pedidosSincronizados = [];
    const erros = [];
    const avisos = [];

    for (const pedido of pedidos) {
      try {
        const localId = pedido.local_id;
        const orderNumber = pedido.order_number;

        if (!localId || !orderNumber) {
          erros.push({
            local_id: localId || null,
            erro: "Pedido sem local_id ou order_number"
          });
          continue;
        }

        // Evita duplicar pedido se o syncPush rodar duas vezes
        const existente = await Order.filter({
          client_id,
          order_number: orderNumber
        });

        if (existente.length > 0) {
          pedidosSincronizados.push(localId);
          continue;
        }

        const tipo = pedido.tipo || pedido.type || "retirada";
        const quantidade = Number(pedido.quantidade || 0);

        await Order.create({
          client_id,
          order_number: orderNumber,

          type: tipo,
          status: pedido.status || "confirmado",

          cabinet_id: pedido.armario_base44_id || null,

          user_id: pedido.usuario_base44_id || null,
          user_name: pedido.usuario_nome || "",

          product_id: pedido.produto_base44_id || null,
          product_name: pedido.produto_nome || "",

          quantity: quantidade,
          notes: pedido.observacoes || "",

          original_local_order_id: pedido.original_order_id || null,

          valor_unitario: Number(pedido.valor_unitario || 0),
          valor_total: Number(pedido.valor_total || 0),

          source: "gatestock_local",
          local_id: String(localId),
          local_created_date: pedido.data_hora || null
        });

        // Atualiza estoque alocado no Base44
        if (pedido.produto_base44_id && quantidade > 0) {
          const alocados = await ProductAllocation.filter({
            client_id,
            product_id: pedido.produto_base44_id
          });

          if (alocados.length > 0) {
            const alocado = alocados[0];
            const estoqueAtual = Number(alocado.allocated_quantity || 0);

            let novoEstoque = estoqueAtual;

            if (tipo === "retirada") {
              novoEstoque = estoqueAtual - quantidade;
            } else if (tipo === "devolução" || tipo === "devolucao") {
              novoEstoque = estoqueAtual + quantidade;
            }

            if (novoEstoque < 0) {
              novoEstoque = 0;
            }

            await ProductAllocation.update(alocado.id, {
              allocated_quantity: novoEstoque
            });
          } else {
            avisos.push({
              local_id: localId,
              aviso: "Produto alocado não encontrado para atualizar estoque",
              product_id: pedido.produto_base44_id
            });
          }
        }

        pedidosSincronizados.push(localId);
      } catch (error) {
        erros.push({
          local_id: pedido.local_id || null,
          erro: error.message
        });
      }
    }

    return Response.json({
      ok: erros.length === 0,
      pedidos_recebidos: pedidos.length,
      pedidos_sincronizados: pedidosSincronizados,
      erros,
      avisos
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        erro: error.message
      },
      { status: 500 }
    );
  }
});