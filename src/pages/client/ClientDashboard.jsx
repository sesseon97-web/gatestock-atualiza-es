import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, ArrowDownRight, ArrowUpRight, ShoppingCart, Users, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ClientOrderForm from "@/components/client/ClientOrderForm";
import DoorConfirmationClient from "@/components/client/DoorConfirmationClient";
import EmployeeForm from "@/components/client/EmployeeForm";
import { useAuth } from "@/lib/AuthContext";

export default function ClientDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [orderProduct, setOrderProduct] = useState(null);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ["my-client", user?.email],
    queryFn: () => base44.entities.Client.filter({ email: user?.email }),
    enabled: !!user?.email,
  });

  const myClient = clients[0];

  const { data: allocations = [] } = useQuery({
    queryKey: ["my-allocations", myClient?.id],
    queryFn: () => base44.entities.ClientAllocation.filter({ client_id: myClient?.id }),
    enabled: !!myClient?.id,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: myOrders = [] } = useQuery({
    queryKey: ["my-orders", myClient?.email],
    queryFn: () => base44.entities.StockOrder.filter({ created_by: user?.email }, "-created_date", 10),
    enabled: !!user?.email,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", myClient?.id],
    queryFn: () => base44.entities.Employee.filter({ client_id: myClient?.id }),
    enabled: !!myClient?.id,
  });

  const deleteEmployee = useMutation({
    mutationFn: (id) => base44.entities.Employee.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees", myClient?.id] }),
  });

  const enriched = allocations.map((alloc) => {
    const product = products.find((p) => p.id === alloc.product_id);
    return { ...alloc, product };
  });

  const handleOrderCreated = (order) => {
    setCreatedOrder(order);
    setOrderProduct(null);
  };

  const handleConfirmed = () => {
    queryClient.invalidateQueries();
    setCreatedOrder(null);
  };

  if (!myClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Package className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Acesso não configurado</h2>
        <p className="text-muted-foreground max-w-sm">
          Seu cadastro ainda não foi vinculado pelo administrador. Entre em contato para liberar seu acesso.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Olá, {myClient.name}!</h1>
        <p className="text-muted-foreground mt-1">
          {myClient.company ? `${myClient.company} · ` : ""}Escolha um produto para retirar
        </p>
      </div>

      {/* Products available */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Produtos Disponíveis</h2>
        {enriched.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl border border-border text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            Nenhum produto disponível para você no momento
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {enriched.map((alloc) => {
              const stock = alloc.product?.quantity || 0;
              const available = Math.min(alloc.allocated_quantity, stock);
              const outOfStock = available <= 0;
              return (
                <div
                  key={alloc.id}
                  className={`bg-card rounded-2xl border p-5 transition-all duration-200 ${
                    outOfStock ? "opacity-60 border-border" : "border-border hover:shadow-lg hover:-translate-y-0.5"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    {outOfStock ? (
                      <Badge variant="secondary" className="text-xs text-destructive bg-destructive/10">Sem estoque</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs text-green-600 bg-green-500/10">Disponível</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground">{alloc.product_name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {alloc.product?.category || ""}
                  </p>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Sua cota</p>
                      <p className={`text-3xl font-bold ${outOfStock ? "text-muted-foreground" : "text-foreground"}`}>
                        {available}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground pb-0.5">{alloc.product?.unit || "unidade"}</p>
                  </div>
                  <Button
                    className="w-full mt-4 rounded-xl gap-2"
                    disabled={outOfStock}
                    onClick={() => setOrderProduct(alloc)}
                  >
                    <ShoppingCart className="w-4 h-4" /> Solicitar Retirada
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent orders */}
      {myOrders.length > 0 && (
        <div className="bg-card rounded-2xl border border-border">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold">Meus Últimos Pedidos</h3>
          </div>
          <div className="divide-y divide-border">
            {myOrders.map((order) => (
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
                    <p className="text-xs text-muted-foreground">{order.quantity}x</p>
                  </div>
                </div>
                <Badge variant="secondary" className={
                  order.status === "confirmado" ? "bg-green-500/10 text-green-600"
                  : order.status === "cancelado" ? "bg-destructive/10 text-destructive"
                  : "bg-accent/10 text-accent"
                }>
                  {order.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order form dialog */}
      <Dialog open={!!orderProduct} onOpenChange={() => setOrderProduct(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Retirada</DialogTitle>
          </DialogHeader>
          {orderProduct && (
            <ClientOrderForm
              allocation={orderProduct}
              client={myClient}
              onOrderCreated={handleOrderCreated}
              onCancel={() => setOrderProduct(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Employees section */}
      <div className="bg-card rounded-2xl border border-border">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Funcionários</h3>
            <Badge variant="secondary">{employees.length}</Badge>
          </div>
          <Button size="sm" className="rounded-xl gap-2" onClick={() => setShowEmployeeForm(true)}>
            <Plus className="w-4 h-4" /> Cadastrar
          </Button>
        </div>
        {employees.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Nenhum funcionário cadastrado ainda.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {employees.map((emp) => {
              const empEmail = emp.name.trim().toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "") + "@adifer.local";
              return (
                <div key={emp.id} className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{emp.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{empEmail}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive rounded-lg"
                    onClick={() => deleteEmployee.mutate(emp.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Employee form dialog */}
      <Dialog open={showEmployeeForm} onOpenChange={setShowEmployeeForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Funcionário</DialogTitle>
          </DialogHeader>
          {myClient && (
            <EmployeeForm client={myClient} onClose={() => setShowEmployeeForm(false)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Door confirmation dialog */}
      <Dialog open={!!createdOrder} onOpenChange={() => setCreatedOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar e Abrir</DialogTitle>
          </DialogHeader>
          {createdOrder && (
            <DoorConfirmationClient
              order={createdOrder}
              client={myClient}
              onConfirmed={handleConfirmed}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}