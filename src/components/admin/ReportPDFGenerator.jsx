import { formatInTimeZone } from "date-fns-tz";
import jsPDF from "jspdf";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

function drawTableHeader(doc, cols, y, marginX) {
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  let x = marginX;
  cols.forEach((col) => {
    doc.setFillColor(30, 64, 175);
    doc.setTextColor(255, 255, 255);
    doc.rect(x, y, col.w, 7, "F");
    doc.text(col.label, x + 2, y + 5);
    x += col.w;
  });
  doc.setTextColor(30, 30, 30);
}

function drawTableRow(doc, cols, values, y, marginX, isAlt) {
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  if (isAlt) {
    doc.setFillColor(245, 247, 255);
    let x = marginX;
    cols.forEach((col) => { doc.rect(x, y, col.w, 6, "F"); x += col.w; });
  }
  let x = marginX;
  cols.forEach((col, i) => {
    const val = String(values[i] ?? "");
    // color for status column
    if (col.label === "Status") {
      if (val === "Cancelado") {
        doc.setTextColor(185, 28, 28);
      } else {
        doc.setTextColor(21, 128, 61);
      }
    } else {
      doc.setTextColor(30, 30, 30);
    }
    const truncated = doc.getTextWidth(val) > col.w - 4
      ? val.substring(0, Math.floor((col.w - 6) / (doc.getTextWidth(val) / val.length))) + "…"
      : val;
    doc.text(truncated, x + 2, y + 4.5);
    x += col.w;
  });
  doc.setTextColor(30, 30, 30);
}

function drawBorderLines(doc, cols, startY, rowCount, marginX, rowH) {
  const totalW = cols.reduce((s, c) => s + c.w, 0);
  doc.setDrawColor(200, 210, 230);
  doc.setLineWidth(0.2);
  // outer border
  doc.rect(marginX, startY, totalW, 7 + rowCount * rowH);
  // vertical col lines
  let x = marginX;
  cols.forEach((col) => { x += col.w; doc.line(x, startY, x, startY + 7 + rowCount * rowH); });
  // horizontal row lines
  for (let i = 0; i <= rowCount; i++) {
    doc.line(marginX, startY + 7 + i * rowH, marginX + totalW, startY + 7 + i * rowH);
  }
}

export default function ReportPDFGenerator({ client, orders, monthLabel }) {
  const [loading, setLoading] = useState(false);

  const generate = () => {
    setLoading(true);
    setTimeout(() => {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const marginX = 14;
      const marginBottom = 15;

      const addHeader = () => {
        doc.setFillColor(30, 64, 175);
        doc.rect(0, 0, pageW, 28, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(15);
        doc.setFont("helvetica", "bold");
        doc.text("ADIFER Ferramentas", marginX, 12);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Relatório Mensal — ${monthLabel}`, marginX, 20);
        doc.text(`Gerado em: ${formatInTimeZone(new Date(), "America/Sao_Paulo", "dd/MM/yyyy HH:mm")}`, pageW - marginX, 20, { align: "right" });
      };

      const addFooter = (pageNum, total) => {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${pageNum} de ${total}`, pageW / 2, pageH - 5, { align: "center" });
      };

      // ── Page 1 ──────────────────────────────────────────────
      addHeader();

      // Client info
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Cliente:", marginX, 38);
      doc.setFont("helvetica", "normal");
      doc.text(`${client.name}${client.company ? " — " + client.company : ""}`, marginX + 18, 38);
      doc.text(`E-mail: ${client.email}`, marginX, 44);

      // Section 1 title
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 64, 175);
      doc.text("1. Histórico de Pedidos", marginX, 53);

      const orderCols = [
        { label: "Data/Hora", w: 33 },
        { label: "Tipo", w: 22 },
        { label: "Produto", w: 52 },
        { label: "Qtd", w: 12 },
        { label: "Funcionário", w: 37 },
        { label: "Status", w: 26 },
      ];
      const rowH = 6;

      let curY = 56;
      let pageNum = 1;
      const pages = [pageNum];

      drawTableHeader(doc, orderCols, curY, marginX);
      curY += 7;

      orders.forEach((o, i) => {
        if (curY + rowH > pageH - marginBottom) {
          addFooter(pageNum, "?");
          doc.addPage();
          pageNum++;
          pages.push(pageNum);
          addHeader();
          curY = 35;
          drawTableHeader(doc, orderCols, curY, marginX);
          curY += 7;
        }
        const vals = [
          formatInTimeZone(new Date(o.created_date), "America/Sao_Paulo", "dd/MM/yy HH:mm"),
          o.type === "retirada" ? "Retirada" : "Devolução",
          o.product_name || "—",
          String(o.quantity || 0),
          o.employee_name || "—",
          o.status === "cancelado" ? "Cancelado" : "Confirmado",
        ];
        drawTableRow(doc, orderCols, vals, curY, marginX, i % 2 === 1);
        curY += rowH;
      });

      if (orders.length === 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text("Nenhum pedido registrado neste período.", marginX, curY + 6);
        curY += 12;
      }

      // ── Section 2: Totais ──────────────────────────────────
      const retiradaMap = {};
      const devolucaoMap = {};
      orders
        .filter((o) => o.status !== "cancelado")
        .forEach((o) => {
          const key = o.product_name || "Desconhecido";
          if (o.type === "retirada") {
            retiradaMap[key] = (retiradaMap[key] || 0) + (o.quantity || 0);
          } else {
            devolucaoMap[key] = (devolucaoMap[key] || 0) + (o.quantity || 0);
          }
        });
      const allProducts = [...new Set([...Object.keys(retiradaMap), ...Object.keys(devolucaoMap)])];
      const totalRows = allProducts
        .map((p) => [p, retiradaMap[p] || 0, devolucaoMap[p] || 0])
        .sort((a, b) => b[1] - a[1]);

      const needSpace = 12 + 7 + totalRows.length * rowH + 10;
      if (curY + needSpace > pageH - marginBottom) {
        addFooter(pageNum, "?");
        doc.addPage();
        pageNum++;
        pages.push(pageNum);
        addHeader();
        curY = 35;
      } else {
        curY += 10;
      }

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 64, 175);
      doc.text("2. Resumo de Movimentações por Item", marginX, curY);
      curY += 5;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text("Retiradas: total de itens retirados do estoque no período (pedidos confirmados).", marginX, curY);
      curY += 4.5;
      doc.text("Devoluções: total de itens devolvidos ao estoque no período (pedidos confirmados).", marginX, curY);
      curY += 5;

      const totalCols = [
        { label: "PRODUTO", w: 110, dark: true },
        { label: "RETIRADA", w: 36, dark: true },
        { label: "DEVOLUÇÃO", w: 36, dark: true },
      ];

      drawTableHeader(doc, totalCols, curY, marginX);
      curY += 7;

      if (totalRows.length === 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text("Nenhuma retirada confirmada neste período.", marginX, curY + 4);
      } else {
        totalRows.forEach(([product, ret, dev], i) => {
          const qty = ret; // keep variable for page-break check
          if (curY + rowH > pageH - marginBottom) {
            addFooter(pageNum, "?");
            doc.addPage();
            pageNum++;
            pages.push(pageNum);
            addHeader();
            curY = 35;
            drawTableHeader(doc, totalCols, curY, marginX);
            curY += 7;
          }
          drawTableRow(doc, totalCols, [product, String(ret), String(dev)], curY, marginX, i % 2 === 1);
          curY += rowH;
        });
      }

      // Fix footer page count
      const totalPages = pageNum;
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${p} de ${totalPages}`, pageW / 2, pageH - 5, { align: "center" });
      }

      const filename = `relatorio_${client.name.replace(/\s+/g, "_")}_${monthLabel.replace(/\s+/g, "_")}.pdf`;
      doc.save(filename);
      setLoading(false);
    }, 100);
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