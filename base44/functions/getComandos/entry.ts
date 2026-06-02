import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ======================================
// CONFIGURAÇÃO
// ======================================

const API_KEY = "MARQUESPRINT_2026";

// ======================================
// GET /api/getComandos?armario=ARMARIO001
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

    const url = new URL(req.url);

    // Aceita armario via query string (GET do ESP32) ou via body JSON (POST)
    let armarioId = url.searchParams.get("armario");
    if (!armarioId && req.method === "POST") {
      try {
        const body = await req.json();
        armarioId = body.armario;
      } catch (_) {}
    }

    if (!armarioId) {
      return Response.json(
        {
          ok: false,
          error: "Parâmetro 'armario' obrigatório"
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

    const abrir = comandos.length > 0;

    // ==========================
    // RESPOSTA PARA ESP32
    // ==========================

    return Response.json({
      ok: true,
      armario: armarioId,
      abrir: abrir,
      pendentes: comandos.length
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