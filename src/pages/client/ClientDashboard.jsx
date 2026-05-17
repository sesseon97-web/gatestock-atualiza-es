import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, ArrowDownRight, ArrowUpRight, ShoppingCart, Plus, Fingerprint, Users, Trash2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DoorConfirmationClient from "@/components/client/DoorConfirmationClient";
import EmployeeForm from "@/components/client/EmployeeForm";
import EmployeePinModal from "@/components/client/EmployeePinModal";
import CartCheckout from "@/components/client/CartCheckout";
import ClientReturnFlow from "@/components/client/ClientReturnFlow";
import { useClientSession } from "@/components/layout/ClientLayout";

export default function ClientDashboard() {
  const myClient = useClientSession();
  const queryClient = useQueryClient();

  // Flow: null → "pin" → "cart" → "door"
  const [flow, setFlow] = useState(null);
  const [identifiedEmployee, setIdentifiedEmployee] = useState(null);
  const [createdOrders, setCreatedOrders] = useState([]);
  const [doorOrderIndex, setDoorOrderIndex] = useState(0);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [showReturn, setShowReturn] = useState(false);

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
    queryKey: ["my-orders-client", myClient?.id],
    queryFn: () => base44.entities.StockOrder.filter({ client_id: myClient?.id }, "-created_date", 10),
    enabled: !!myClient?.id,
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

  const handleEmployeeIdentified = (employee) => {
    setIdentifiedEmployee(employee);
    setFlow("cart");
  };

  const handleOrdersCreated = (orders) => {
    setCreatedOrders(orders);
    setDoorOrderIndex(0);
    setFlow("door");
  };

  const handleDoorConfirmed = () => {
    // If there are more orders, advance to next
    if (doorOrderIndex < createdOrders.length - 1) {
      setDoorOrderIndex((i) => i + 1);
    } else {
      queryClient.invalidateQueries();
      setFlow(null);
      setIdentifiedEmployee(null);
      setCreatedOrders([]);
      setDoorOrderIndex(0);
    }
  };

  const resetFlow = () => {
    setFlow(null);
    setIdentifiedEmployee(null);
    setCreatedOrders([]);
    setDoorOrderIndex(0);
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Olá, {myClient.name}!</h1>
          <p className="text-muted-foreground mt-1">
            {myClient.company ? `${myClient.company} · ` : ""}Gerencie suas retiradas
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl gap-2 flex-shrink-0"
          onClick={() => setShowEmployeeForm(true)}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Cadastrar Funcionário</span>
          <span className="sm:hidden">Funcionário</span>
        </Button>
      </div>

      {/* Main action cards */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-card rounded-2xl border border-border p-6 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShoppingCart className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Nova Retirada</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Funcionário digita o PIN e seleciona produtos
            </p>
          </div>
          <Button
            size="lg"
            className="rounded-xl gap-2 w-full"
            onClick={() => setFlow("pin")}
            disabled={enriched.filter((a) => Math.min(a.allocated_quantity, a.product?.quantity || 0) > 0).length === 0}
          >
            <Fingerprint className="w-5 h-5" />
            Iniciar
          </Button>
          {enriched.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum produto alocado ainda.</p>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center">
            <RotateCcw className="w-7 h-7 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Devolução</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Devolver produtos de retiradas anteriores
            </p>
          </div>
          <Button
            size="lg"
            variant="outline"
            className="rounded-xl gap-2 w-full border-green-500/30 text-green-700 hover:bg-green-500/10"
            onClick={() => setShowReturn(true)}
          >
            <RotateCcw className="w-5 h-5" />
            Devolver
          </Button>
        </div>
      </div>

      {/* Recent orders */}
      {myOrders.length > 0 && (
        <div className="bg-card rounded-2xl border border-border">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold">Últimos Pedidos</h3>
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

      {/* Employees list */}
      {employees.length > 0 && (
        <div className="bg-card rounded-2xl border border-border">
          <button
            className="w-full p-5 flex items-center justify-between"
            onClick={() => setShowEmployeeList((v) => !v)}
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="font-semibold">Funcionários</span>
              <Badge variant="secondary">{employees.length}</Badge>
            </div>
            <span className="text-xs text-muted-foreground">{showEmployeeList ? "Ocultar" : "Ver todos"}</span>
          </button>
          {showEmployeeList && (
            <div className="border-t border-border divide-y divide-border">
              {employees.map((emp) => (
                <div key={emp.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{emp.name}</p>
                    {emp.pin_code && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Fingerprint className="w-3 h-3" />
                        PIN: <span className="font-mono tracking-widest">{emp.pin_code}</span>
                      </p>
                    )}
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
              ))}
            </div>
          )}
        </div>
      )}

      {/* PIN Modal */}
      <EmployeePinModal
        open={flow === "pin"}
        onClose={resetFlow}
        employees={employees}
        onEmployeeIdentified={handleEmployeeIdentified}
      />

      {/* Cart + Checkout Dialog */}
      <Dialog open={flow === "cart"} onOpenChange={resetFlow}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Nova Retirada
            </DialogTitle>
          </DialogHeader>
          {flow === "cart" && (
            <CartCheckout
              enriched={enriched}
              client={myClient}
              employee={identifiedEmployee}
              onOrdersCreated={handleOrdersCreated}
              onCancel={resetFlow}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Door confirmation dialog — one per order */}
      <Dialog open={flow === "door"} onOpenChange={resetFlow}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Confirmar e Abrir
              {createdOrders.length > 1 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({doorOrderIndex + 1}/{createdOrders.length})
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {flow === "door" && createdOrders[doorOrderIndex] && (
            <DoorConfirmationClient
              order={createdOrders[doorOrderIndex]}
              client={myClient}
              onConfirmed={handleDoorConfirmed}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Return dialog */}
      <Dialog open={showReturn} onOpenChange={setShowReturn}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-green-600" />
              Devolução
            </DialogTitle>
          </DialogHeader>
          {showReturn && (
            <ClientReturnFlow client={myClient} onClose={() => setShowReturn(false)} />
          )}
        </DialogContent>
      </Dialog>

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
    </div>
  );
}