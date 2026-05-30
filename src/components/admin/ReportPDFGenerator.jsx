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

export default function ReportPDFGenerator({ client, orders, monthLabel, productSummary = [], grandTotal = 0 }) {
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
          formatInTimeZone(new Date(o.created_date.endsWith("Z") ? o.created_date : o.created_date + "Z"), "America/Sao_Paulo", "dd/MM/yy HH:mm"),
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

      // ── Section 2: Resumo por produto ─────────────────────
      const needSpace = 12 + 7 + productSummary.length * rowH + 18;
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
      doc.text("2. Resumo por Produto", marginX, curY);
      curY += 5;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text("Consumo líquido = Retiradas − Devoluções. Média mensal calculada sobre todos os meses com dados.", marginX, curY);
      curY += 5;

      const totalCols = [
        { label: "PRODUTO", w: 64 },
        { label: "RETIRADAS", w: 22 },
        { label: "DEVOLUÇÕES", w: 24 },
        { label: "VL. UNITÁRIO", w: 28 },
        { label: "VL. TOTAL", w: 28 },
        { label: "MÉD. MENSAL", w: 26 },
      ];

      drawTableHeader(doc, totalCols, curY, marginX);
      curY += 7;

      const fmtBRL = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

      if (productSummary.length === 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text("Nenhuma retirada confirmada neste período.", marginX, curY + 4);
        curY += 10;
      } else {
        productSummary.forEach((row, i) => {
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
          drawTableRow(doc, totalCols, [
            row.productName,
            String(row.ret),
            String(row.dev),
            row.price > 0 ? fmtBRL(row.price) : "—",
            row.price > 0 ? fmtBRL(row.totalValue) : "—",
            row.avgMonthly.toFixed(1) + " un/mês",
          ], curY, marginX, i % 2 === 1);
          curY += rowH;
        });

        // Linha de total
        if (curY + rowH + 2 > pageH - marginBottom) {
          addFooter(pageNum, "?");
          doc.addPage();
          pageNum++;
          pages.push(pageNum);
          addHeader();
          curY = 35;
        }
        curY += 2;
        doc.setFillColor(30, 64, 175);
        const totalW = totalCols.reduce((s, c) => s + c.w, 0);
        doc.rect(marginX, curY, totalW, 7, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("TOTAL DO MÊS", marginX + 2, curY + 5);
        const totalRetX = marginX + totalCols[0].w;
        doc.text(String(productSummary.reduce((s, r) => s + r.ret, 0)), totalRetX + 2, curY + 5);
        const totalValX = marginX + totalCols[0].w + totalCols[1].w + totalCols[2].w + totalCols[3].w;
        doc.text(fmtBRL(grandTotal), totalValX + 2, curY + 5);
        doc.setTextColor(30, 30, 30);
        curY += 9;
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