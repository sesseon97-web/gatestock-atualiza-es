import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ======================================
// CONFIGURAÇÃO
// ======================================

const API_KEY = "MARQUESPRINT_2026";

// ======================================
// POST /api/confirmarComando
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

    const armarioId = body.armario;

    if (!armarioId) {
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
    // BUSCA COMANDOS PENDENTES
    // ==========================

    const comandos =
      await base44.asServiceRole.entities.Comando.filter({
        armario_id: armarioId,
        executado: false
      });

    // ==========================
    // MARCA COMO EXECUTADO
    // ==========================

    for (const cmd of comandos) {
      await base44.asServiceRole.entities.Comando.update(
        cmd.id,
        {
          executado: true
        }
      );
    }

    return Response.json({
      ok: true,
      armario: armarioId,
      executados: comandos.length
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