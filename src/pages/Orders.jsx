import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight, ClipboardList, DoorOpen } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export default function Orders() {
  const [filter, setFilter] = useState("all");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.StockOrder.list("-created_date", 100),
  });

  const filtered = filter === "all" ? orders : orders.filter((o) => o.type === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pedidos</h1>
        <p className="text-muted-foreground mt-1">Histórico de retiradas e devoluções</p>
      </div>

      <Tabs defaultValue="all" onValueChange={setFilter}>
        <TabsList className="bg-muted rounded-xl">
          <TabsTrigger value="all" className="rounded-lg">Todos</TabsTrigger>
          <TabsTrigger value="retirada" className="rounded-lg">Retiradas</TabsTrigger>
          <TabsTrigger value="devolução" className="rounded-lg">Devoluções</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border divide-y divide-border">
          {filtered.map((order) => (
            <div key={order.id} className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  order.type === "retirada" ? "bg-primary/10" : "bg-green-500/10"
                }`}>
                  {order.type === "retirada"
                    ? <ArrowDownRight className="w-5 h-5 text-primary" />
                    : <ArrowUpRight className="w-5 h-5 text-green-600" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground">{order.product_name}</p>
                    {order.order_number && (
                      <Badge variant="outline" className="text-xs font-mono">{order.order_number}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {order.quantity}x · {formatInTimeZone(new Date(order.created_date.endsWith("Z") ? order.created_date : order.created_date + "Z"), "America/Sao_Paulo", "dd/MM/yyyy HH:mm")}
                  </p>
                  {order.client_name && (
                    <p className="text-xs text-muted-foreground">cliente: {order.client_name}</p>
                  )}
                  {order.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5 italic">"{order.notes}"</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {order.door_opened && (
                  <DoorOpen className="w-4 h-4 text-green-600" />
                )}
                <Badge variant="secondary" className={
                  order.status === "confirmado"
                    ? "bg-green-500/10 text-green-600"
                    : order.status === "cancelado"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-accent/10 text-accent"
                }>
                  {order.status}
                </Badge>
                <Badge variant="outline">
                  {order.type}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}