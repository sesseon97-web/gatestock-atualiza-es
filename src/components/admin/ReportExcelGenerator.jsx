import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatInTimeZone } from "date-fns-tz";

export default function ReportExcelGenerator({ client, orders, monthLabel }) {
  const [loading, setLoading] = useState(false);

  const generate = () => {
    setLoading(true);

    const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    // ---- ESTILOS ----
    const styles = `
  <Styles>
    <!-- Título principal -->
    <Style ss:ID="title">
      <Font ss:Bold="1" ss:Size="16" ss:Color="#1E3A5F" ss:FontName="Calibri"/>
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
    </Style>
    <!-- Subtítulo (mês/cliente) -->
    <Style ss:ID="subtitle">
      <Font ss:Size="12" ss:Color="#4A6FA5" ss:FontName="Calibri"/>
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
    </Style>
    <!-- Cabeçalho de coluna azul escuro -->
    <Style ss:ID="header">
      <Font ss:Bold="1" ss:Size="11" ss:Color="#FFFFFF" ss:FontName="Calibri"/>
      <Interior ss:Color="#1E3A5F" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#FFFFFF"/>
      </Borders>
    </Style>
    <!-- Linha par (branca) -->
    <Style ss:ID="rowEven">
      <Font ss:Size="11" ss:Color="#1E1E1E" ss:FontName="Calibri"/>
      <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E1F2"/>
      </Borders>
    </Style>
    <!-- Linha ímpar (azul clarinho) -->
    <Style ss:ID="rowOdd">
      <Font ss:Size="11" ss:Color="#1E1E1E" ss:FontName="Calibri"/>
      <Interior ss:Color="#EEF2FB" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E1F2"/>
      </Borders>
    </Style>
    <!-- Valor centrado -->
    <Style ss:ID="rowCenter">
      <Font ss:Size="11" ss:Color="#1E1E1E" ss:FontName="Calibri"/>
      <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E1F2"/>
      </Borders>
    </Style>
    <Style ss:ID="rowCenterOdd">
      <Font ss:Size="11" ss:Color="#1E1E1E" ss:FontName="Calibri"/>
      <Interior ss:Color="#EEF2FB" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E1F2"/>
      </Borders>
    </Style>
    <!-- Badge Retirada (laranja) -->
    <Style ss:ID="tagRetirada">
      <Font ss:Bold="1" ss:Size="10" ss:Color="#B45309" ss:FontName="Calibri"/>
      <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <!-- Badge Devolução (verde) -->
    <Style ss:ID="tagDevolucao">
      <Font ss:Bold="1" ss:Size="10" ss:Color="#065F46" ss:FontName="Calibri"/>
      <Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <!-- Badge Confirmado (verde) -->
    <Style ss:ID="tagOk">
      <Font ss:Bold="1" ss:Size="10" ss:Color="#065F46" ss:FontName="Calibri"/>
      <Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <!-- Badge Cancelado (vermelho) -->
    <Style ss:ID="tagCancelado">
      <Font ss:Bold="1" ss:Size="10" ss:Color="#991B1B" ss:FontName="Calibri"/>
      <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <!-- Cabeçalho resumo verde -->
    <Style ss:ID="headerGreen">
      <Font ss:Bold="1" ss:Size="11" ss:Color="#FFFFFF" ss:FontName="Calibri"/>
      <Interior ss:Color="#065F46" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <!-- Número destaque -->
    <Style ss:ID="numBig">
      <Font ss:Bold="1" ss:Size="13" ss:Color="#1E3A5F" ss:FontName="Calibri"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Interior ss:Color="#EEF2FB" ss:Pattern="Solid"/>
    </Style>
    <!-- Número verde -->
    <Style ss:ID="numGreen">
      <Font ss:Bold="1" ss:Size="13" ss:Color="#065F46" ss:FontName="Calibri"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/>
    </Style>
    <!-- Número saldo -->
    <Style ss:ID="numSaldo">
      <Font ss:Bold="1" ss:Size="13" ss:Color="#B45309" ss:FontName="Calibri"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
    </Style>
    <!-- Linha vazia -->
    <Style ss:ID="empty">
      <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
    </Style>
    <!-- Rodapé -->
    <Style ss:ID="footer">
      <Font ss:Italic="1" ss:Size="9" ss:Color="#9CA3AF" ss:FontName="Calibri"/>
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
    </Style>
  </Styles>`;

    // ---- ABA 1: Pedidos detalhados ----
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
      const typeLabel = o.type === "retirada" ? "↓ Retirada" : "↑ Devolução";
      const statusStyle = o.status === "cancelado" ? "tagCancelado" : "tagOk";
      const statusLabel = o.status === "cancelado" ? "✕ Cancelado" : "✓ Confirmado";

      return `<Row ss:Height="22">
        <Cell ss:StyleID="${centerStyle}"><Data ss:Type="String">${esc(o.order_number || o.id?.slice(0,8) || "-")}</Data></Cell>
        <Cell ss:StyleID="${typeStyle}"><Data ss:Type="String">${esc(typeLabel)}</Data></Cell>
        <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${esc(o.product_name || "-")}</Data></Cell>
        <Cell ss:StyleID="${centerStyle}"><Data ss:Type="Number">${o.quantity ?? 0}</Data></Cell>
        <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${esc(o.employee_name || "-")}</Data></Cell>
        <Cell ss:StyleID="${centerStyle}"><Data ss:Type="String">${esc(dateStr)}</Data></Cell>
        <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${esc(o.notes || "")}</Data></Cell>
        <Cell ss:StyleID="${statusStyle}"><Data ss:Type="String">${esc(statusLabel)}</Data></Cell>
      </Row>`;
    });

    // ---- ABA 2: Resumo por produto ----
    const productMap = {};
    orders.forEach((o) => {
      const name = o.product_name || "Sem nome";
      if (!productMap[name]) productMap[name] = { retiradas: 0, devolucoes: 0 };
      if (o.type === "retirada") productMap[name].retiradas += o.quantity ?? 0;
      else productMap[name].devolucoes += o.quantity ?? 0;
    });

    const summaryRows = Object.entries(productMap).map(([name, v], i) => {
      const isOdd = i % 2 !== 0;
      const rowStyle = isOdd ? "rowOdd" : "rowEven";
      return `<Row ss:Height="26">
        <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${esc(name)}</Data></Cell>
        <Cell ss:StyleID="numBig"><Data ss:Type="Number">${v.retiradas}</Data></Cell>
        <Cell ss:StyleID="numGreen"><Data ss:Type="Number">${v.devolucoes}</Data></Cell>
        <Cell ss:StyleID="numSaldo"><Data ss:Type="Number">${v.retiradas - v.devolucoes}</Data></Cell>
      </Row>`;
    });

    const now = new Date().toLocaleDateString("pt-BR");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:x="urn:schemas-microsoft-com:office:excel">
  ${styles}

  <!-- ABA 1: Detalhado -->
  <Worksheet ss:Name="Pedidos Detalhados">
    <Table ss:DefaultRowHeight="20" ss:DefaultColumnWidth="100">
      <Column ss:Width="90"/>
      <Column ss:Width="100"/>
      <Column ss:Width="180"/>
      <Column ss:Width="70"/>
      <Column ss:Width="140"/>
      <Column ss:Width="120"/>
      <Column ss:Width="180"/>
      <Column ss:Width="110"/>

      <Row ss:Height="10"><Cell ss:StyleID="empty"><Data ss:Type="String"></Data></Cell></Row>
      <Row ss:Height="36">
        <Cell ss:StyleID="title" ss:MergeAcross="7"><Data ss:Type="String">RELATÓRIO DE PEDIDOS — ${esc(client.name.toUpperCase())}</Data></Cell>
      </Row>
      <Row ss:Height="24">
        <Cell ss:StyleID="subtitle" ss:MergeAcross="7"><Data ss:Type="String">Mês de referência: ${esc(monthLabel)}   |   Gerado em: ${esc(now)}</Data></Cell>
      </Row>
      <Row ss:Height="10"><Cell ss:StyleID="empty"><Data ss:Type="String"></Data></Cell></Row>

      <Row ss:Height="28">
        <Cell ss:StyleID="header"><Data ss:Type="String">Nº PEDIDO</Data></Cell>
        <Cell ss:StyleID="header"><Data ss:Type="String">TIPO</Data></Cell>
        <Cell ss:StyleID="header"><Data ss:Type="String">PRODUTO</Data></Cell>
        <Cell ss:StyleID="header"><Data ss:Type="String">QTD</Data></Cell>
        <Cell ss:StyleID="header"><Data ss:Type="String">FUNCIONÁRIO</Data></Cell>
        <Cell ss:StyleID="header"><Data ss:Type="String">DATA / HORA</Data></Cell>
        <Cell ss:StyleID="header"><Data ss:Type="String">OBSERVAÇÕES</Data></Cell>
        <Cell ss:StyleID="header"><Data ss:Type="String">STATUS</Data></Cell>
      </Row>

      ${detailRows.join("\n      ")}

      <Row ss:Height="10"><Cell ss:StyleID="empty"><Data ss:Type="String"></Data></Cell></Row>
      <Row ss:Height="18">
        <Cell ss:StyleID="footer" ss:MergeAcross="7"><Data ss:Type="String">ADIFER Ferramentas — Relatório gerado automaticamente em ${esc(now)}</Data></Cell>
      </Row>
    </Table>
  </Worksheet>

  <!-- ABA 2: Resumo -->
  <Worksheet ss:Name="Resumo por Produto">
    <Table ss:DefaultRowHeight="20" ss:DefaultColumnWidth="100">
      <Column ss:Width="220"/>
      <Column ss:Width="140"/>
      <Column ss:Width="140"/>
      <Column ss:Width="140"/>

      <Row ss:Height="10"><Cell ss:StyleID="empty"><Data ss:Type="String"></Data></Cell></Row>
      <Row ss:Height="36">
        <Cell ss:StyleID="title" ss:MergeAcross="3"><Data ss:Type="String">RESUMO POR PRODUTO — ${esc(client.name.toUpperCase())}</Data></Cell>
      </Row>
      <Row ss:Height="24">
        <Cell ss:StyleID="subtitle" ss:MergeAcross="3"><Data ss:Type="String">Mês de referência: ${esc(monthLabel)}   |   Gerado em: ${esc(now)}</Data></Cell>
      </Row>
      <Row ss:Height="10"><Cell ss:StyleID="empty"><Data ss:Type="String"></Data></Cell></Row>

      <Row ss:Height="28">
        <Cell ss:StyleID="headerGreen"><Data ss:Type="String">PRODUTO</Data></Cell>
        <Cell ss:StyleID="headerGreen"><Data ss:Type="String">TOTAL RETIRADAS</Data></Cell>
        <Cell ss:StyleID="headerGreen"><Data ss:Type="String">TOTAL DEVOLUÇÕES</Data></Cell>
        <Cell ss:StyleID="headerGreen"><Data ss:Type="String">SALDO (RET. - DEV.)</Data></Cell>
      </Row>

      ${summaryRows.join("\n      ")}

      <Row ss:Height="10"><Cell ss:StyleID="empty"><Data ss:Type="String"></Data></Cell></Row>
      <Row ss:Height="18">
        <Cell ss:StyleID="footer" ss:MergeAcross="3"><Data ss:Type="String">ADIFER Ferramentas — Relatório gerado automaticamente em ${esc(now)}</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${client.name.replace(/\s+/g, "_")}_${monthLabel.replace(/\s+/g, "_")}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    setLoading(false);
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={generate}
      disabled={loading || orders.length === 0}
      className="rounded-xl gap-1.5 border-green-600 text-green-700 hover:bg-green-50"
    >
      <FileSpreadsheet className="w-3.5 h-3.5" />
      {loading ? "Gerando..." : "Exportar Excel"}
    </Button>
  );
}