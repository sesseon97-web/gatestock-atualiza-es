import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ClientOrderForm from "@/components/client/ClientOrderForm";
import DoorConfirmationClient from "@/components/client/DoorConfirmationClient";
import { useAuth } from "@/lib/AuthContext";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [orderProduct, setOrderProduct] = useState(null);
  const [createdOrder, setCreatedOrder] = useState(null);

  // Encontra o funcionário pelo email
  const { data: employees = [] } = useQuery({
    queryKey: ["my-employee", user?.email],
    queryFn: () => base44.entities.Employee.filter({ email: user?.email }),
    enabled: !!user?.email,
  });

  // Busca o funcionário pelo nome (email gerado)
  const { data: allEmployees = [] } = useQuery({
    queryKey: ["employee-by-user", user?.email],
    queryFn: () => base44.entities.Employee.list(),
    enabled: !!user?.email,
  });

  const myEmployee = allEmployees.find((e) => {
    const generatedEmail = e.name.trim().toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "") + "@adifer.local";
    return generatedEmail === user?.email;
  });

  // Busca o cliente vinculado ao funcionário
  const { data: clients = [] } = useQuery({
    queryKey: ["client-of-employee", myEmployee?.client_id],
    queryFn: () => base44.entities.Client.filter({ id: myEmployee?.client_id }),
    enabled: !!myEmployee?.client_id,
  });
  const myClient = clients[0];

  // Busca alocações do cliente
  const { data: allocations = [] } = useQuery({
    queryKey: ["allocations-employee", myEmployee?.client_id],
    queryFn: () => base44.entities.ClientAllocation.filter({ client_id: myEmployee?.client_id }),
    enabled: !!myEmployee?.client_id,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
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

  if (!myEmployee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Package className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Acesso não configurado</h2>
        <p className="text-muted-foreground max-w-sm">
          Seu cadastro de funcionário não foi encontrado. Entre em contato com seu responsável.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Olá, {myEmployee.name}!</h1>
        <p className="text-muted-foreground mt-1">
          {myClient?.name ? `${myClient.name} · ` : ""}Produtos disponíveis para retirada
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Produtos Disponíveis</h2>
        {enriched.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl border border-border text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            Nenhum produto disponível no momento
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
                  <p className="text-xs text-muted-foreground mt-1">{alloc.product?.category || ""}</p>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Cota disponível</p>
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

      <Dialog open={!!orderProduct} onOpenChange={() => setOrderProduct(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Retirada</DialogTitle>
          </DialogHeader>
          {orderProduct && myClient && (
            <ClientOrderForm
              allocation={orderProduct}
              client={myClient}
              onOrderCreated={handleOrderCreated}
              onCancel={() => setOrderProduct(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdOrder} onOpenChange={() => setCreatedOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar e Abrir</DialogTitle>
          </DialogHeader>
          {createdOrder && myClient && (
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