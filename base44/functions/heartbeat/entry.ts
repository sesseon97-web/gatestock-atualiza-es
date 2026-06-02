import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ======================================
// CONFIGURAÇÃO
// ======================================

const API_KEY = "MARQUESPRINT_2026";

// ======================================
// POST /api/heartbeat
// Body:
// {
//   "armario": "ARMARIO001",
//   "online": true,
//   "versao": "1.0.0"
// }
// ======================================

Deno.serve(async (req) => {
  try {

    // ==========================
    // VALIDA API KEY
    // ==========================

    const apiKey = req.headers.get("x-api-key");

    if (apiKey !== API_KEY) {
      return Response.json(
        {
          ok: false,
          error: "API KEY INVALIDA"
        },
        {
          status: 401
        }
      );
    }

    const base44 = createClientFromRequest(req);

    const body = await req.json();

    const {
      armario,
      online,
      versao
    } = body;

    if (!armario) {
      return Response.json(
        {
          ok: false,
          error: "Campo 'armario' obrigatório"
        },
        {
          status: 400
        }
      );
    }

    // ==========================
    // PROCURA ARMÁRIO
    // ==========================

    const armarios =
      await base44.asServiceRole.entities.Armario.filter({
        identificador: armario
      });

    const agora = new Date().toISOString();

    // ==========================
    // ATUALIZA EXISTENTE
    // ==========================

    if (armarios.length > 0) {

      await base44.asServiceRole.entities.Armario.update(
        armarios[0].id,
        {
          online: online ?? true,
          ultima_comunicacao: agora,
          versao: versao || armarios[0].versao
        }
      );

      return Response.json({
        ok: true,
        armario: armario,
        acao: "atualizado",
        ultima_comunicacao: agora
      });
    }

    // ==========================
    // CRIA NOVO ARMÁRIO
    // ==========================

    await base44.asServiceRole.entities.Armario.create({
      identificador: armario,
      nome: armario,
      online: online ?? true,
      ultima_comunicacao: agora,
      versao: versao || "1.0.0"
    });

    return Response.json({
      ok: true,
      armario: armario,
      acao: "criado",
      ultima_comunicacao: agora
    });

  } catch (error) {

    return Response.json(
      {
        ok: false,
        error: error.message
      },
      {
        status: 500
      }
    );
  }
});