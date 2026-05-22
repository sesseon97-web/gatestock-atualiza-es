import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Package, Plus, RefreshCw, Users, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ProductForm from "@/components/stock/ProductForm";
import ReplenishStock from "@/components/representative/ReplenishStock";
import ClientAllocations from "@/components/admin/ClientAllocations";

export default function RepresentativeDashboard() {
  const [showProductForm, setShowProductForm] = useState(false);
  const [showReplenish, setShowReplenish] = useState(false);
  const [showAllocations, setShowAllocations] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: allClients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ["all-allocations"],
    queryFn: () => base44.entities.ClientAllocation.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  // Filtra apenas os clientes vinculados a este representante
  const clients = currentUser
    ? allClients.filter((c) => c.representative_id === currentUser.id)
    : [];

  const myClientIds = new Set(clients.map((c) => c.id));

  const lowStockAllocations = allocations.filter(
    (a) =>
      myClientIds.has(a.client_id) &&
      (a.min_quantity || 0) > 0 &&
      (a.allocated_quantity || 0) <= (a.min_quantity || 0)
  );

  const handleReplenish = (client) => {
    setSelectedClient(client);
    setShowReplenish(true);
  };

  const handleAllocate = (client) => {
    setSelectedClient(client);
    setShowAllocations(true);
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel do Representante</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie estoque dos clientes e produtos</p>
        </div>
        <Button onClick={() => setShowProductForm(true)} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Novo Produto
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Clientes</p>
          <p className="text-3xl font-bold text-foreground mt-1">{clients.length}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Produtos Cadastrados</p>
          <p className="text-3xl font-bold text-foreground mt-1">{products.length}</p>
        </div>
        <div className={`rounded-2xl border p-5 ${lowStockAllocations.length > 0 ? "bg-amber-50 border-amber-200" : "bg-card border-border"}`}>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            {lowStockAllocations.length > 0 && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
            Alertas de Estoque Baixo
          </p>
          <p className={`text-3xl font-bold mt-1 ${lowStockAllocations.length > 0 ? "text-amber-600" : "text-foreground"}`}>
            {lowStockAllocations.length}
          </p>
        </div>
      </div>

      {/* Alertas */}
      {lowStockAllocations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Estoque Baixo
          </h2>
          <div className="space-y-2">
            {lowStockAllocations.map((a) => {
              const client = clients.find((c) => c.id === a.client_id);
              return (
                <div key={a.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-800">{a.product_name}</p>
                    <p className="text-xs text-amber-600">{client?.name} — {a.allocated_quantity} / mín. {a.min_quantity}</p>
                  </div>
                  {client && (
                    <Button size="sm" variant="outline" className="rounded-xl border-amber-300 text-amber-700 hover:bg-amber-100" onClick={() => handleReplenish(client)}>
                      <RefreshCw className="w-3.5 h-3.5 mr-1" /> Repor
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de clientes */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" /> Clientes
        </h2>
        <div className="space-y-3">
          {clients.map((client) => {
            const clientAllocs = allocations.filter((a) => a.client_id === client.id);
            const clientAlerts = clientAllocs.filter(
              (a) => (a.min_quantity || 0) > 0 && (a.allocated_quantity || 0) <= (a.min_quantity || 0)
            );
            return (
              <div key={client.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{client.name}</p>
                  <p className="text-xs text-muted-foreground">{client.company || client.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {clientAllocs.length} produto(s) alocado(s)
                    {clientAlerts.length > 0 && (
                      <span className="ml-2 text-amber-600 font-medium">· {clientAlerts.length} alerta(s)</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleAllocate(client)} className="rounded-xl gap-1.5">
                    <Package className="w-3.5 h-3.5" /> Alocar
                  </Button>
                  <Button size="sm" onClick={() => handleReplenish(client)} className="rounded-xl gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" /> Repor
                  </Button>
                </div>
              </div>
            );
          })}
          {clients.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente cadastrado.</p>
          )}
        </div>
      </div>

      {/* Modal: Novo Produto */}
      <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Produto</DialogTitle>
          </DialogHeader>
          <ProductForm onClose={() => setShowProductForm(false)} />
        </DialogContent>
      </Dialog>

      {/* Modal: Alocações */}
      <Dialog open={showAllocations} onOpenChange={setShowAllocations}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Alocar Ferramentas — {selectedClient?.name}</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <ClientAllocations client={selectedClient} />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Repor Estoque */}
      <Dialog open={showReplenish} onOpenChange={setShowReplenish}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Repor Estoque — {selectedClient?.name}</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <ReplenishStock client={selectedClient} onClose={() => setShowReplenish(false)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}