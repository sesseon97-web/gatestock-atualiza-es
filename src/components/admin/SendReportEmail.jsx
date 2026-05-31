import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Send, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatInTimeZone } from "date-fns-tz";

function buildExcelXml(client, orders, monthLabel, productSummary, grandTotal) {
  const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const detailRows = orders.map((o, i) => {
    const dateStr = formatInTimeZone(
      new Date(o.created_date.endsWith("Z") ? o.created_date : o.created_date + "Z"),
      "America/Sao_Paulo",
      "dd/MM/yyyy HH:mm"
    );
    const isOdd = i % 2 !== 0;
    const rowStyle = isOdd ? "rowOdd" : "rowEven";
    const centerStyle = isOdd ? "rowCenterOdd" : "rowCenter";
    const typeStyle = o.type === "retirada" ? "tagRetirada" : "tagDevolucao";
    const typeLabel = o.type === "retirada" ? "Retirada" : "Devolucao";
    const statusStyle = o.status === "cancelado" ? "tagCancelado" : "tagOk";
    const statusLabel = o.status === "cancelado" ? "Cancelado" : "Confirmado";
    return `<Row ss:Height="22">
      <Cell ss:StyleID="${centerStyle}"><Data ss:Type="String">${esc(o.order_number || o.id?.slice(0, 8) || "-")}</Data></Cell>
      <Cell ss:StyleID="${typeStyle}"><Data ss:Type="String">${esc(typeLabel)}</Data></Cell>
      <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${esc(o.product_name || "-")}</Data></Cell>
      <Cell ss:StyleID="${centerStyle}"><Data ss:Type="Number">${o.quantity ?? 0}</Data></Cell>
      <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${esc(o.employee_name || "-")}</Data></Cell>
      <Cell ss:StyleID="${centerStyle}"><Data ss:Type="String">${esc(dateStr)}</Data></Cell>
      <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${esc(o.notes || "")}</Data></Cell>
      <Cell ss:StyleID="${statusStyle}"><Data ss:Type="String">${esc(statusLabel)}</Data></Cell>
    </Row>`;
  });

  const summaryRows = productSummary.map((row, i) => {
    const isOdd = i % 2 !== 0;
    const rowStyle = isOdd ? "rowOdd" : "rowEven";
    const currStyle = isOdd ? "currencyOdd" : "currency";
    return `<Row ss:Height="26">
      <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${esc(row.productName)}</Data></Cell>
      <Cell ss:StyleID="numBig"><Data ss:Type="Number">${row.ret}</Data></Cell>
      <Cell ss:StyleID="numGreen"><Data ss:Type="Number">${row.dev}</Data></Cell>
      <Cell ss:StyleID="${currStyle}"><Data ss:Type="Number">${row.price}</Data></Cell>
      <Cell ss:StyleID="${currStyle}"><Data ss:Type="Number">${row.totalValue}</Data></Cell>
      <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${row.avgMonthly.toFixed(1)} un/mes</Data></Cell>
    </Row>`;
  });

  const totalRetiradas = productSummary.reduce((s, r) => s + r.ret, 0);
  const totalDevolucoes = productSummary.reduce((s, r) => s + r.dev, 0);
  const now = new Date().toLocaleDateString("pt-BR");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:x="urn:schemas-microsoft-com:office:excel">
  <Styles>
    <Style ss:ID="title"><Font ss:Bold="1" ss:Size="16" ss:Color="#1E3A5F" ss:FontName="Calibri"/><Alignment ss:Horizontal="Left" ss:Vertical="Center"/></Style>
    <Style ss:ID="subtitle"><Font ss:Size="12" ss:Color="#4A6FA5" ss:FontName="Calibri"/><Alignment ss:Horizontal="Left" ss:Vertical="Center"/></Style>
    <Style ss:ID="header"><Font ss:Bold="1" ss:Size="11" ss:Color="#FFFFFF" ss:FontName="Calibri"/><Interior ss:Color="#1E3A5F" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
    <Style ss:ID="rowEven"><Font ss:Size="11" ss:Color="#1E1E1E" ss:FontName="Calibri"/><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/><Alignment ss:Horizontal="Left" ss:Vertical="Center"/></Style>
    <Style ss:ID="rowOdd"><Font ss:Size="11" ss:Color="#1E1E1E" ss:FontName="Calibri"/><Interior ss:Color="#EEF2FB" ss:Pattern="Solid"/><Alignment ss:Horizontal="Left" ss:Vertical="Center"/></Style>
    <Style ss:ID="rowCenter"><Font ss:Size="11" ss:Color="#1E1E1E" ss:FontName="Calibri"/><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
    <Style ss:ID="rowCenterOdd"><Font ss:Size="11" ss:Color="#1E1E1E" ss:FontName="Calibri"/><Interior ss:Color="#EEF2FB" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
    <Style ss:ID="tagRetirada"><Font ss:Bold="1" ss:Size="10" ss:Color="#B45309" ss:FontName="Calibri"/><Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
    <Style ss:ID="tagDevolucao"><Font ss:Bold="1" ss:Size="10" ss:Color="#065F46" ss:FontName="Calibri"/><Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
    <Style ss:ID="tagOk"><Font ss:Bold="1" ss:Size="10" ss:Color="#065F46" ss:FontName="Calibri"/><Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
    <Style ss:ID="tagCancelado"><Font ss:Bold="1" ss:Size="10" ss:Color="#991B1B" ss:FontName="Calibri"/><Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
    <Style ss:ID="headerGreen"><Font ss:Bold="1" ss:Size="11" ss:Color="#FFFFFF" ss:FontName="Calibri"/><Interior ss:Color="#065F46" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
    <Style ss:ID="numBig"><Font ss:Bold="1" ss:Size="13" ss:Color="#1E3A5F" ss:FontName="Calibri"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Interior ss:Color="#EEF2FB" ss:Pattern="Solid"/></Style>
    <Style ss:ID="numGreen"><Font ss:Bold="1" ss:Size="13" ss:Color="#065F46" ss:FontName="Calibri"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/></Style>
    <Style ss:ID="currency"><Font ss:Size="11" ss:Color="#1E1E1E" ss:FontName="Calibri"/><NumberFormat ss:Format="&quot;R$&quot; #,##0.00"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/></Style>
    <Style ss:ID="currencyOdd"><Font ss:Size="11" ss:Color="#1E1E1E" ss:FontName="Calibri"/><NumberFormat ss:Format="&quot;R$&quot; #,##0.00"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Interior ss:Color="#EEF2FB" ss:Pattern="Solid"/></Style>
    <Style ss:ID="totalLabel"><Font ss:Bold="1" ss:Size="12" ss:Color="#FFFFFF" ss:FontName="Calibri"/><Interior ss:Color="#1E3A5F" ss:Pattern="Solid"/><Alignment ss:Horizontal="Left" ss:Vertical="Center"/></Style>
    <Style ss:ID="totalNum"><Font ss:Bold="1" ss:Size="12" ss:Color="#FFFFFF" ss:FontName="Calibri"/><Interior ss:Color="#1E3A5F" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
    <Style ss:ID="totalCurrency"><Font ss:Bold="1" ss:Size="12" ss:Color="#FFFFFF" ss:FontName="Calibri"/><NumberFormat ss:Format="&quot;R$&quot; #,##0.00"/><Interior ss:Color="#1E3A5F" ss:Pattern="Solid"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/></Style>
    <Style ss:ID="totalEmpty"><Interior ss:Color="#1E3A5F" ss:Pattern="Solid"/></Style>
    <Style ss:ID="empty"><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/></Style>
    <Style ss:ID="footer"><Font ss:Italic="1" ss:Size="9" ss:Color="#9CA3AF" ss:FontName="Calibri"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/></Style>
  </Styles>

  <Worksheet ss:Name="Pedidos Detalhados">
    <Table ss:DefaultRowHeight="20" ss:DefaultColumnWidth="100">
      <Column ss:Width="90"/><Column ss:Width="100"/><Column ss:Width="180"/><Column ss:Width="70"/><Column ss:Width="140"/><Column ss:Width="120"/><Column ss:Width="180"/><Column ss:Width="110"/>
      <Row ss:Height="10"><Cell ss:StyleID="empty"><Data ss:Type="String"></Data></Cell></Row>
      <Row ss:Height="36"><Cell ss:StyleID="title" ss:MergeAcross="7"><Data ss:Type="String">RELATORIO DE PEDIDOS - ${esc(client.name.toUpperCase())}</Data></Cell></Row>
      <Row ss:Height="24"><Cell ss:StyleID="subtitle" ss:MergeAcross="7"><Data ss:Type="String">Mes de referencia: ${esc(monthLabel)}   |   Gerado em: ${esc(now)}</Data></Cell></Row>
      <Row ss:Height="10"><Cell ss:StyleID="empty"><Data ss:Type="String"></Data></Cell></Row>
      <Row ss:Height="28">
        <Cell ss:StyleID="header"><Data ss:Type="String">N PEDIDO</Data></Cell>
        <Cell ss:StyleID="header"><Data ss:Type="String">TIPO</Data></Cell>
        <Cell ss:StyleID="header"><Data ss:Type="String">PRODUTO</Data></Cell>
        <Cell ss:StyleID="header"><Data ss:Type="String">QTD</Data></Cell>
        <Cell ss:StyleID="header"><Data ss:Type="String">FUNCIONARIO</Data></Cell>
        <Cell ss:StyleID="header"><Data ss:Type="String">DATA / HORA</Data></Cell>
        <Cell ss:StyleID="header"><Data ss:Type="String">OBSERVACOES</Data></Cell>
        <Cell ss:StyleID="header"><Data ss:Type="String">STATUS</Data></Cell>
      </Row>
      ${detailRows.join("\n      ")}
      <Row ss:Height="18"><Cell ss:StyleID="footer" ss:MergeAcross="7"><Data ss:Type="String">ADIFER Ferramentas - Relatorio gerado em ${esc(now)}</Data></Cell></Row>
    </Table>
  </Worksheet>

  <Worksheet ss:Name="Resumo por Produto">
    <Table ss:DefaultRowHeight="20" ss:DefaultColumnWidth="100">
      <Column ss:Width="220"/><Column ss:Width="110"/><Column ss:Width="110"/><Column ss:Width="130"/><Column ss:Width="130"/><Column ss:Width="130"/>
      <Row ss:Height="10"><Cell ss:StyleID="empty"><Data ss:Type="String"></Data></Cell></Row>
      <Row ss:Height="36"><Cell ss:StyleID="title" ss:MergeAcross="5"><Data ss:Type="String">RESUMO POR PRODUTO - ${esc(client.name.toUpperCase())}</Data></Cell></Row>
      <Row ss:Height="24"><Cell ss:StyleID="subtitle" ss:MergeAcross="5"><Data ss:Type="String">Mes de referencia: ${esc(monthLabel)}   |   Gerado em: ${esc(now)}</Data></Cell></Row>
      <Row ss:Height="10"><Cell ss:StyleID="empty"><Data ss:Type="String"></Data></Cell></Row>
      <Row ss:Height="28">
        <Cell ss:StyleID="headerGreen"><Data ss:Type="String">PRODUTO</Data></Cell>
        <Cell ss:StyleID="headerGreen"><Data ss:Type="String">RETIRADAS</Data></Cell>
        <Cell ss:StyleID="headerGreen"><Data ss:Type="String">DEVOLUCOES</Data></Cell>
        <Cell ss:StyleID="headerGreen"><Data ss:Type="String">VL. UNITARIO</Data></Cell>
        <Cell ss:StyleID="headerGreen"><Data ss:Type="String">VL. TOTAL</Data></Cell>
        <Cell ss:StyleID="headerGreen"><Data ss:Type="String">MEDIA MENSAL</Data></Cell>
      </Row>
      ${summaryRows.join("\n      ")}
      <Row ss:Height="30">
        <Cell ss:StyleID="totalLabel"><Data ss:Type="String">TOTAL DO MES</Data></Cell>
        <Cell ss:StyleID="totalNum"><Data ss:Type="Number">${totalRetiradas}</Data></Cell>
        <Cell ss:StyleID="totalNum"><Data ss:Type="Number">${totalDevolucoes}</Data></Cell>
        <Cell ss:StyleID="totalEmpty"><Data ss:Type="String"></Data></Cell>
        <Cell ss:StyleID="totalCurrency"><Data ss:Type="Number">${grandTotal}</Data></Cell>
        <Cell ss:StyleID="totalEmpty"><Data ss:Type="String"></Data></Cell>
      </Row>
      <Row ss:Height="18"><Cell ss:StyleID="footer" ss:MergeAcross="5"><Data ss:Type="String">ADIFER Ferramentas - Relatorio gerado em ${esc(now)}</Data></Cell></Row>
    </Table>
  </Worksheet>
</Workbook>`;
}

export default function SendReportEmail({ client, orders, monthLabel, productSummary, grandTotal }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(client.report_email || client.email || "");
  const [editingEmail, setEditingEmail] = useState(!client.report_email);

  const saveEmailMutation = useMutation({
    mutationFn: (newEmail) =>
      base44.entities.Client.update(client.id, { report_email: newEmail }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client", client.id] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      // Salva o email se foi editado
      if (email !== client.report_email) {
        await saveEmailMutation.mutateAsync(email);
      }
      const xmlContent = buildExcelXml(client, orders, monthLabel, productSummary, grandTotal);
      const fileName = `relatorio_${client.name.replace(/\s+/g, "_")}_${monthLabel.replace(/\s+/g, "_")}.xls`;
      const response = await base44.functions.invoke("sendReportEmail", {
        toEmail: email,
        clientName: client.name,
        monthLabel,
        xmlContent,
        fileName,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success(`Relatório enviado para ${email}`);
      setOpen(false);
    },
    onError: (err) => {
      toast.error("Erro ao enviar email: " + err.message);
    },
  });

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={orders.length === 0}
        className="rounded-xl gap-1.5 border-blue-600 text-blue-700 hover:bg-blue-50"
      >
        <Mail className="w-3.5 h-3.5" />
        Enviar por Email
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              Enviar Relatório por Email
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-muted/40 rounded-xl p-4 text-sm space-y-1">
              <p className="text-muted-foreground">Cliente: <span className="font-medium text-foreground">{client.name}</span></p>
              <p className="text-muted-foreground">Mês: <span className="font-medium text-foreground capitalize">{monthLabel}</span></p>
              <p className="text-muted-foreground">Pedidos: <span className="font-medium text-foreground">{orders.length}</span></p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Email de destino</span>
                {client.report_email && (
                  <button
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                    onClick={() => setEditingEmail(!editingEmail)}
                  >
                    <Pencil className="w-3 h-3" /> {editingEmail ? "Cancelar" : "Alterar"}
                  </button>
                )}
              </Label>
              {!editingEmail && client.report_email ? (
                <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-4 py-3 border border-border">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium">{client.report_email}</span>
                </div>
              ) : (
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl"
                />
              )}
              {editingEmail && (
                <p className="text-xs text-muted-foreground">
                  Este email será salvo como email padrão de relatórios para este cliente.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl gap-2"
              disabled={!email || sendMutation.isPending}
              onClick={() => sendMutation.mutate()}
            >
              <Send className="w-3.5 h-3.5" />
              {sendMutation.isPending ? "Enviando..." : "Enviar Relatório"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}