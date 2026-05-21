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

        {/* PDF export — só aparece quando um cliente específico está selecionado */}
        {selectedClient !== "all" && selectedClientObj && (
          <div className="flex items-end pb-0.5">
            <ReportPDFGenerator
              client={selectedClientObj}
              orders={filtered}
              monthLabel={currentMonthLabel}
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
                      {order.client_name || "—"} · {order.quantity}x · {formatInTimeZone(new Date(order.created_date), "America/Sao_Paulo", "dd/MM/yyyy HH:mm")}
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