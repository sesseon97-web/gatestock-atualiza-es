import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function ReportPDFGenerator({ client, orders, monthLabel }) {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const marginX = 14;

    // ── Header ──────────────────────────────────────────────
    doc.setFillColor(30, 64, 175); // primary blue
    doc.rect(0, 0, pageW, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("ADIFER Ferramentas", marginX, 13);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Relatório Mensal de Movimentações — ${monthLabel}`, marginX, 21);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageW - marginX, 21, { align: "right" });

    // ── Client Info ──────────────────────────────────────────
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Cliente", marginX, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(client.name, marginX, 47);
    if (client.company) doc.text(client.company, marginX, 53);
    doc.text(client.email, marginX, client.company ? 59 : 53);

    let startY = client.company ? 67 : 61;

    // ── Section 1: Histórico de Pedidos ──────────────────────
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 64, 175);
    doc.text("1. Histórico de Pedidos", marginX, startY);

    const orderRows = orders.map((o) => [
      format(new Date(o.created_date), "dd/MM/yyyy HH:mm"),
      o.type === "retirada" ? "Retirada" : "Devolução",
      o.product_name || "—",
      String(o.quantity || 0),
      o.employee_name || "—",
      o.status === "cancelado" ? "Cancelado" : "Confirmado",
    ]);

    autoTable(doc, {
      startY: startY + 4,
      head: [["Data/Hora", "Tipo", "Produto", "Qtd", "Funcionário", "Status"]],
      body: orderRows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 22 },
        2: { cellWidth: 50 },
        3: { cellWidth: 12 },
        4: { cellWidth: 38 },
        5: { cellWidth: 22 },
      },
      margin: { left: marginX, right: marginX },
      didDrawCell: (data) => {
        if (data.section === "body" && data.column.index === 5) {
          const val = data.cell.raw;
          if (val === "Cancelado") {
            doc.setTextColor(185, 28, 28);
          } else {
            doc.setTextColor(21, 128, 61);
          }
        }
      },
    });

    // ── Section 2: Totais por Produto ────────────────────────
    const totalY = doc.lastAutoTable.finalY + 12;

    // Calcular totais de retiradas por produto
    const totalsMap = {};
    orders
      .filter((o) => o.type === "retirada" && o.status !== "cancelado")
      .forEach((o) => {
        const key = o.product_name || "Desconhecido";
        totalsMap[key] = (totalsMap[key] || 0) + (o.quantity || 0);
      });

    const totalRows = Object.entries(totalsMap)
      .sort((a, b) => b[1] - a[1])
      .map(([product, qty]) => [product, String(qty)]);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 64, 175);
    doc.text("2. Quantidade Total Retirada por Item", marginX, totalY);

    if (totalRows.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("Nenhuma retirada registrada neste período.", marginX, totalY + 8);
    } else {
      autoTable(doc, {
        startY: totalY + 4,
        head: [["Produto", "Qtd Total Retirada"]],
        body: totalRows,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 247, 255] },
        columnStyles: {
          0: { cellWidth: 130 },
          1: { cellWidth: 40, halign: "center", fontStyle: "bold" },
        },
        margin: { left: marginX, right: marginX },
      });
    }

    // ── Footer ───────────────────────────────────────────────
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${pageCount}`, pageW / 2, 290, { align: "center" });
    }

    const filename = `relatorio_${client.name.replace(/\s+/g, "_")}_${monthLabel.replace(/\s+/g, "_")}.pdf`;
    doc.save(filename);
    setLoading(false);
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="rounded-xl gap-2 border-primary text-primary hover:bg-primary/5"
      onClick={generate}
      disabled={loading || orders.length === 0}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      Exportar PDF
    </Button>
  );
}