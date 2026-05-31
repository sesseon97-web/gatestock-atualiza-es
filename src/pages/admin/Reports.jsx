import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { ArrowDownRight, ArrowUpRight, FileText, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import ReportPDFGenerator from "@/components/admin/ReportPDFGenerator";
import ReportExcelGenerator from "@/components/admin/ReportExcelGenerator";
import SendReportEmail from "@/components/admin/SendReportEmail";

// Gera lista dos últimos 12 meses
function getMonthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: format(d, "MMMM yyyy", { locale: ptBR }),
    });
  }
  return opts;
}

export default function Reports() {
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders-report"],
    queryFn: () => base44.entities.StockOrder.list("-created_date", 500),
  });

  const { data: allAllocations = [] } = useQuery({
    queryKey: ["allocations-report"],
    queryFn: () => base44.entities.ClientAllocation.list(),
  });

  // Filtra por mês
  const monthFiltered = useMemo(() => {
    return orders.filter((o) => {
      const d = new Date(o.created_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return key === selectedMonth;
    });
  }, [orders, selectedMonth]);

  // Filtra por cliente
  const filtered = useMemo(() => {
    return selectedClient === "all"
      ? monthFiltered
      : monthFiltered.filter((o) => o.client_id === selectedClient);
  }, [monthFiltered, selectedClient]);

  const totalRetiradas = filtered.filter((o) => o.type === "retirada").length;
  const totalDevolucoes = filtered.filter((o) => o.type === "devolução").length;

  const selectedClientObj = clients.find((c) => c.id === selectedClient);
  const currentMonthLabel = monthOptions.find((m) => m.value === selectedMonth)?.label || selectedMonth;

  // Alocações do cliente selecionado (para pegar sale_price)
  const clientAllocations = useMemo(() => {
    if (selectedClient === "all") return allAllocations;
    return allAllocations.filter((a) => a.client_id === selectedClient);
  }, [allAllocations, selectedClient]);

  const getPriceForProduct = (productId, productName) => {
    const alloc = clientAllocations.find(
      (a) => a.product_id === productId || a.product_name === productName
    );
    return alloc?.sale_price || 0;
  };

  // Resumo por produto com preço, total e consumo médio
  const productSummary = useMemo(() => {
    const map = {};
    // Busca todos os meses disponíveis para calcular média
    const allConfirmedRetiradas = orders.filter(
      (o) => o.type === "retirada" && o.status !== "cancelado" &&
      (selectedClient === "all" || o.client_id === selectedClient)
    );
    // Meses com dados
    const monthsWithData = new Set(
      allConfirmedRetiradas.map((o) => {
        const d = new Date(o.created_date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      })
    );
    const totalMonths = Math.max(monthsWithData.size, 1);

    allConfirmedRetiradas.forEach((o) => {
      const key = o.product_id || o.product_name;
      if (!map[key]) {
        map[key] = {
          product_id: o.product_id,
          product_name: o.product_name,
          totalAllMonths: 0,
        };
      }
      map[key].totalAllMonths += o.quantity || 0;
    });

    // Retiradas e devoluções do mês selecionado
    const retiradaMonth = {};
    const devolucaoMonth = {};
    filtered.filter((o) => o.status !== "cancelado").forEach((o) => {
      const key = o.product_id || o.product_name;
      if (o.type === "retirada") retiradaMonth[key] = (retiradaMonth[key] || 0) + (o.quantity || 0);
      else devolucaoMonth[key] = (devolucaoMonth[key] || 0) + (o.quantity || 0);
    });

    const allKeys = new Set([...Object.keys(retiradaMonth), ...Object.keys(devolucaoMonth), ...Object.keys(map)]);
    return [...allKeys].map((key) => {
      const entry = map[key] || {};
      const productName = entry.product_name || key;
      const productId = entry.product_id;
      const ret = retiradaMonth[key] || 0;
      const dev = devolucaoMonth[key] || 0;
      const price = getPriceForProduct(productId, productName);
      const totalValue = ret * price;
      const avgMonthly = entry.totalAllMonths ? (entry.totalAllMonths / totalMonths) : 0;
      return { productName, ret, dev, price, totalValue, avgMonthly };
    }).filter((r) => r.ret > 0 || r.dev > 0).sort((a, b) => b.ret - a.ret);
  }, [filtered, orders, selectedClient, clientAllocations]);

  const grandTotal = useMemo(
    () => productSummary.reduce((sum, r) => sum + r.totalValue, 0),
    [productSummary]
  );

  const formatCurrency = (v) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Relatórios por Cliente</h1>
        <p className="text-muted-foreground mt-1">Histórico mensal de pedidos por cliente</p>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-2xl p-5 flex flex-wrap gap-5 items-end">
        <div className="space-y-1.5 min-w-[180px]">
          <Label className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Mês</Label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="rounded-xl capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value} className="capitalize">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 min-w-[200px]">
          <Label>Cliente</Label>
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Selecionar cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Exportações — só aparecem quando um cliente específico está selecionado */}
        {selectedClient !== "all" && selectedClientObj && (
          <div className="flex items-end gap-2 pb-0.5">
            <ReportPDFGenerator
              client={selectedClientObj}
              orders={filtered}
              monthLabel={currentMonthLabel}
              productSummary={productSummary}
              grandTotal={grandTotal}
            />
            <ReportExcelGenerator
              client={selectedClientObj}
              orders={filtered}
              monthLabel={currentMonthLabel}
              productSummary={productSummary}
              grandTotal={grandTotal}
            />
            <SendReportEmail
              client={selectedClientObj}
              orders={filtered}
              monthLabel={currentMonthLabel}
              productSummary={productSummary}
              grandTotal={grandTotal}
            />
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total de Pedidos</p>
            <p className="text-2xl font-bold">{filtered.length}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <ArrowDownRight className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Retiradas</p>
            <p className="text-2xl font-bold">{totalRetiradas}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Devoluções</p>
            <p className="text-2xl font-bold">{totalDevolucoes}</p>
          </div>
        </div>
      </div>

      {/* Product Summary Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-foreground">
            Resumo por Produto
            <span className="ml-2 text-sm font-normal text-muted-foreground capitalize">— {currentMonthLabel}</span>
          </h3>
        </div>
        {productSummary.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">Nenhum pedido confirmado neste período</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground text-xs uppercase">
                  <th className="text-left px-5 py-3">Produto</th>
                  <th className="text-center px-4 py-3">Retiradas</th>
                  <th className="text-center px-4 py-3">Devoluções</th>
                  <th className="text-right px-4 py-3">Vl. Unitário</th>
                  <th className="text-right px-4 py-3">Vl. Total</th>
                  <th className="text-right px-4 py-3">Média Mensal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {productSummary.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium">{row.productName}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-6 rounded bg-primary/10 text-primary text-xs font-semibold">{row.ret}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-6 rounded bg-green-500/10 text-green-600 text-xs font-semibold">{row.dev}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {row.price > 0 ? formatCurrency(row.price) : <span className="text-xs italic">sem preço</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {row.price > 0 ? formatCurrency(row.totalValue) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {row.avgMonthly.toFixed(1)} un/mês
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-primary/5 border-t-2 border-primary/20 font-bold">
                  <td className="px-5 py-4 text-foreground">Total do Mês</td>
                  <td className="px-4 py-4 text-center text-primary">
                    {productSummary.reduce((s, r) => s + r.ret, 0)}
                  </td>
                  <td className="px-4 py-4 text-center text-green-600">
                    {productSummary.reduce((s, r) => s + r.dev, 0)}
                  </td>
                  <td className="px-4 py-4" />
                  <td className="px-4 py-4 text-right text-lg text-primary">
                    {formatCurrency(grandTotal)}
                  </td>
                  <td className="px-4 py-4" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Orders table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">
            Histórico de Pedidos
            <span className="ml-2 text-sm font-normal text-muted-foreground capitalize">— {currentMonthLabel}</span>
          </h3>
        </div>
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">Nenhum pedido encontrado</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((order) => (
              <div key={order.id} className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    order.type === "retirada" ? "bg-primary/10" : "bg-green-500/10"
                  }`}>
                    {order.type === "retirada"
                      ? <ArrowDownRight className="w-4 h-4 text-primary" />
                      : <ArrowUpRight className="w-4 h-4 text-green-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{order.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.client_name || "—"} · {order.quantity}x · {formatInTimeZone(new Date(order.created_date.endsWith("Z") ? order.created_date : order.created_date + "Z"), "America/Sao_Paulo", "dd/MM/yyyy HH:mm")}
                    </p>
                    {order.employee_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-medium text-foreground">Funcionário:</span> {order.employee_name}
                      </p>
                    )}
                    {order.notes && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">"{order.notes}"</p>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" className={
                  order.status === "cancelado"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-green-500/10 text-green-600"
                }>
                  {order.status === "cancelado" ? "cancelado" : "confirmado"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}