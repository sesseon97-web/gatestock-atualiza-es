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

    // Faz upload do arquivo Excel para storage público e obtém URL permanente
    const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const file = new File([blob], fileName, { type: 'application/vnd.ms-excel' });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

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
      Segue o relatório de pedidos referente ao mês de <strong style="color: #1E3A5F;">${monthLabel}</strong>.
    </p>
    <div style="margin: 24px 0; text-align: center;">
      <a href="${file_url}" download="${fileName}"
        style="display: inline-block; background: #1E3A5F; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: bold;">
        📥 Baixar Relatório Excel
      </a>
    </div>
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

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: toEmail,
      subject: `Relatório de Pedidos — ${clientName} — ${monthLabel}`,
      body: htmlBody,
    });

    return Response.json({ success: true, file_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});