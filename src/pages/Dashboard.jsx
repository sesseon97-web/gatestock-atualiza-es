import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Package, ClipboardList, AlertTriangle, ArrowDownRight, ArrowUpRight, MapPin, Tag, Users } from "lucide-react";
import StatsCard from "@/components/stock/StatsCard";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.StockOrder.list("-created_date", 50),
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ["allocations"],
    queryFn: () => base44.entities.ClientAllocation.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const totalProducts = products.length;
  const recentOrders = orders.slice(0, 5);

  // Alertas por cliente: produto onde estoque <= min_quantity definido na alocação, OU estoque < allocated_quantity
  const clientAlerts = clients.flatMap((client) => {
    const clientAllocs = allocations.filter((a) => a.client_id === client.id);
    return clientAllocs
      .map((alloc) => {
        const product = products.find((p) => p.id === alloc.product_id);
        if (!product) return null;
        const stock = product.quantity || 0;
        const minQty = alloc.min_quantity || 0;
        const isMinAlert = minQty > 0 && stock <= minQty;
        const isShortageAlert = stock < alloc.allocated_quantity;
        if (isMinAlert || isShortageAlert) {
          return {
            client,
            product,
            allocated: alloc.allocated_quantity,
            minQty,
            stock,
            isMinAlert,
            isShortageAlert,
          };
        }
        return null;
      })
      .filter(Boolean);
  });

  const lowStock = clientAlerts.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Painel</h1>
          <p className="text-muted-foreground mt-1">Bem-vindo ao controle de estoque ADIFER</p>
        </div>

      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total de Produtos" value={totalProducts} icon={Package} accent="primary" />
        <StatsCard title="Alertas de Estoque" value={lowStock} icon={AlertTriangle} accent="destructive" />
        <StatsCard title="Total de Pedidos" value={orders.length} icon={ClipboardList} accent="success" />
      </div>

      {/* Low stock alert per client */}
      {clientAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-700">Alertas de Estoque por Cliente</h3>
            <span className="ml-auto bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {clientAlerts.length} {clientAlerts.length === 1 ? "item" : "itens"}
            </span>
          </div>
          <div className="space-y-2">
            {clientAlerts.map((alert, i) => (
              <div key={i} className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 ${
                alert.isShortageAlert ? "bg-destructive/10" : "bg-amber-100"
              }`}>
                <div className="flex items-center gap-3 min-w-0">
                  <Users className={`w-4 h-4 flex-shrink-0 ${alert.isShortageAlert ? "text-destructive" : "text-amber-600"}`} />
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${alert.isShortageAlert ? "text-destructive" : "text-amber-800"}`}>
                      {alert.client.name}
                    </p>
                    <p className={`text-xs truncate ${alert.isShortageAlert ? "text-destructive/80" : "text-amber-700"}`}>
                      {alert.product.name}
                    </p>
                    <p className={`text-xs mt-0.5 ${alert.isShortageAlert ? "text-destructive/70" : "text-amber-600"}`}>
                      {alert.isShortageAlert
                        ? "⚠ Estoque abaixo da cota alocada"
                        : `⚠ Estoque abaixo do mínimo (${alert.minQty} ${alert.product.unit || "un."})`}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-xs ${alert.isShortageAlert ? "text-destructive/70" : "text-amber-600"}`}>
                    Estoque atual
                  </p>
                  <p className={`text-sm font-bold ${alert.isShortageAlert ? "text-destructive" : "text-amber-700"}`}>
                    {alert.stock} {alert.product.unit || "un."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Produtos em Estoque</h2>
          <Link to="/produtos" className="text-sm text-primary hover:underline font-medium">
            Gerenciar →
          </Link>
        </div>
        {products.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-border">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            Nenhum produto cadastrado
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => {
              const isLow = (product.quantity || 0) <= (product.min_quantity || 5);
              return (
                <div
                  key={product.id}
                  className="bg-card rounded-2xl border border-border p-5 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
                >
                  {/* Icon + category */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-xs flex items-center gap-1"
                    >
                      <Tag className="w-3 h-3" />
                      {product.category || "Outros"}
                    </Badge>
                  </div>

                  {/* Name & code */}
                  <h3 className="font-semibold text-foreground leading-tight">{product.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Cód: {product.code}</p>

                  {/* Location */}
                  {product.location && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {product.location}
                    </p>
                  )}

                  {/* Quantity */}
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Quantidade</p>
                      <p className={`text-2xl font-bold ${isLow ? "text-destructive" : "text-foreground"}`}>
                        {product.quantity || 0}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground pb-0.5">{product.unit || "unidade"}</p>
                  </div>

                  {isLow && (
                    <div className="mt-3 px-3 py-1.5 rounded-lg bg-destructive/5 border border-destructive/15 text-xs text-destructive font-medium text-center">
                      ⚠ Estoque baixo
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div className="bg-card rounded-2xl border border-border">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Últimos Pedidos</h3>
            <Link to="/pedidos" className="text-sm text-primary hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y divide-border">
            {recentOrders.map((order) => (
              <div key={order.id} className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    order.type === "retirada" ? "bg-primary/10" : "bg-green-500/10"
                  }`}>
                    {order.type === "retirada"
                      ? <ArrowDownRight className="w-4 h-4 text-primary" />
                      : <ArrowUpRight className="w-4 h-4 text-green-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{order.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.quantity}x · {format(new Date(order.created_date), "dd/MM/yyyy HH:mm")}
                    </p>
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
        </div>
      )}
    </div>
  );
}