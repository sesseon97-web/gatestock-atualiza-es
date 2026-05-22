import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatInTimeZone } from "date-fns-tz";

export default function ReportExcelGenerator({ client, orders, monthLabel }) {
  const [loading, setLoading] = useState(false);

  const generate = () => {
    setLoading(true);

    const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const toRow = (cells) =>
      `<Row>${cells.map((c) => `<Cell><Data ss:Type="String">${esc(c)}</Data></Cell>`).join("")}</Row>`;

    // --- Aba 1: Detalhado ---
    const headers = ["Nº Pedido", "Tipo", "Produto", "Quantidade", "Funcionário", "Data/Hora", "Observações", "Status"];
    const rows = orders.map((o) => {
      const dateStr = formatInTimeZone(
        new Date(o.created_date.endsWith("Z") ? o.created_date : o.created_date + "Z"),
        "America/Sao_Paulo",
        "dd/MM/yyyy HH:mm"
      );
      return [
        o.order_number || o.id?.slice(0, 8) || "-",
        o.type === "retirada" ? "Retirada" : "Devolução",
        o.product_name || "-",
        o.quantity ?? 0,
        o.employee_name || "-",
        dateStr,
        o.notes || "",
        o.status === "cancelado" ? "Cancelado" : "Confirmado",
      ];
    });

    // --- Aba 2: Resumo por produto ---
    const productMap = {};
    orders.forEach((o) => {
      const name = o.product_name || "Sem nome";
      if (!productMap[name]) productMap[name] = { retiradas: 0, devolucoes: 0 };
      if (o.type === "retirada") productMap[name].retiradas += o.quantity ?? 0;
      else productMap[name].devolucoes += o.quantity ?? 0;
    });
    const summaryHeaders = ["Produto", "Total Retiradas", "Total Devoluções", "Saldo (Ret. - Dev.)"];
    const summaryRows = Object.entries(productMap).map(([name, v]) => [
      name,
      v.retiradas,
      v.devolucoes,
      v.retiradas - v.devolucoes,
    ]);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Pedidos Detalhados">
    <Table>
      <Row><Cell><Data ss:Type="String">Relatório: ${esc(client.name)}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Mês: ${esc(monthLabel)}</Data></Cell></Row>
      <Row></Row>
      ${toRow(headers)}
      ${rows.map((r) => toRow(r)).join("\n      ")}
    </Table>
  </Worksheet>
  <Worksheet ss:Name="Resumo por Produto">
    <Table>
      <Row><Cell><Data ss:Type="String">Resumo por Produto — ${esc(client.name)}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Mês: ${esc(monthLabel)}</Data></Cell></Row>
      <Row></Row>
      ${toRow(summaryHeaders)}
      ${summaryRows.map((r) => toRow(r)).join("\n      ")}
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