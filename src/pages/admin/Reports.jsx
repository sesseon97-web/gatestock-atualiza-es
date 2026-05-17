import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function Reports() {
  const [selectedClient, setSelectedClient] = useState("all");

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders-report"],
    queryFn: () => base44.entities.StockOrder.list("-created_date", 200),
  });

  const filtered = selectedClient === "all"
    ? orders
    : orders.filter((o) => o.client_id === selectedClient);

  const totalRetiradas = filtered.filter((o) => o.type === "retirada").length;
  const totalDevolucoes = filtered.filter((o) => o.type === "devolução").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Relatórios por Cliente</h1>
        <p className="text-muted-foreground mt-1">Visualize o histórico de pedidos filtrado por cliente</p>
      </div>

      {/* Filter */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-2 max-w-xs">
        <Label>Filtrar por Cliente</Label>
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
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-foreground">Histórico de Pedidos</h3>
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
                      {order.client_name || "—"} · {order.quantity}x · {format(new Date(order.created_date), "dd/MM/yyyy HH:mm")}
                    </p>
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