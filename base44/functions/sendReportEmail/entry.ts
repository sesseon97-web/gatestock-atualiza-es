import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { toEmail, clientName, monthLabel, xmlContent, fileName } = await req.json();

    if (!toEmail || !xmlContent) {
      return Response.json({ error: 'toEmail e xmlContent são obrigatórios' }, { status: 400 });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return Response.json({ error: 'RESEND_API_KEY não configurada' }, { status: 500 });
    }

    // Converte o conteúdo XML/Excel para base64
    const encoder = new TextEncoder();
    const bytes = encoder.encode(xmlContent);
    const base64Content = btoa(String.fromCharCode(...bytes));

    const htmlBody = `
<div style="font-family: Calibri, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #1E3A5F; color: white; padding: 20px 28px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0; font-size: 20px;">📊 Relatório de Pedidos</h2>
    <p style="margin: 6px 0 0; opacity: 0.85; font-size: 14px;">ADIFER Ferramentas</p>
  </div>
  <div style="background: #f8f9fa; padding: 24px 28px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 15px; color: #374151; margin-top: 0;">
      Olá, <strong>${clientName}</strong>!
    </p>
    <p style="font-size: 14px; color: #6B7280;">
      Segue em anexo o relatório de pedidos referente ao mês de <strong style="color: #1E3A5F;">${monthLabel}</strong>.
    </p>
    <div style="margin: 16px 0; padding: 16px; background: #EEF2FB; border-radius: 8px; border-left: 4px solid #1E3A5F;">
      <p style="margin: 0; font-size: 13px; color: #1E3A5F;">
        <strong>📁 Arquivo:</strong> ${fileName}<br/>
        <strong>📅 Mês de referência:</strong> ${monthLabel}<br/>
        <strong>🏢 Cliente:</strong> ${clientName}
      </p>
    </div>
    <p style="font-size: 12px; color: #9CA3AF; margin-bottom: 0;">
      Este email foi gerado automaticamente pelo sistema ADIFER Ferramentas.
    </p>
  </div>
</div>
    `.trim();

    const resendPayload = {
      from: 'ADIFER Ferramentas <onboarding@resend.dev>',
      to: [toEmail],
      subject: `Relatório de Pedidos — ${clientName} — ${monthLabel}`,
      html: htmlBody,
      attachments: [
        {
          filename: fileName,
          content: base64Content,
        }
      ]
    };

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      return Response.json({ error: resendData.message || 'Erro ao enviar email' }, { status: 500 });
    }

    return Response.json({ success: true, id: resendData.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});