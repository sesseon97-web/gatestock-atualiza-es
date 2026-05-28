import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { UserCheck, ChevronDown, ChevronUp, AlertTriangle, Package, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Representatives() {
  const [expandedRep, setExpandedRep] = useState(null);
  const [expandedClient, setExpandedClient] = useState(null);

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: allocations = [], isLoading: loadingAllocs } = useQuery({
    queryKey: ["allocations-all"],
    queryFn: () => base44.entities.ClientAllocation.list(),
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const isLoading = loadingClients || loadingAllocs || loadingProducts;

  // Agrupar clientes por representante
  const repMap = {};
  clients.forEach((client) => {
    const repId = client.representative_id || "__sem_rep__";
    const repName = client.representative_name || "Sem Representante";
    if (!repMap[repId]) repMap[repId] = { id: repId, name: repName, clients: [] };
    repMap[repId].clients.push(client);
  });
  const reps = Object.values(repMap).sort((a, b) =>
    a.name === "Sem Representante" ? 1 : b.name === "Sem Representante" ? -1 : a.name.localeCompare(b.name)
  );

  const getClientAlerts = (clientId) => {
    const clientAllocs = allocations.filter((a) => a.client_id === clientId);
    return clientAllocs.filter((a) => {
      const product = products.find((p) => p.id === a.product_id);
      const minQty = a.min_quantity || 0;
      const allocQty = a.allocated_quantity || 0;
      const stockGeral = product?.quantity || 0;
      // Alerta se abaixo do mínimo da alocação OU estoque do depósito baixo
      const belowAllocMin = minQty > 0 && allocQty <= minQty;
      const belowProductMin = stockGeral <= (product?.min_quantity || 5);
      return belowAllocMin || belowProductMin;
    });
  };

  const getClientAllocs = (clientId) => allocations.filter((a) => a.client_id === clientId);

  const getProduct = (productId) => products.find((p) => p.id === productId);

  const isAlertAlloc = (alloc) => {
    const product = getProduct(alloc.product_id);
    const minQty = alloc.min_quantity || 0;
    const allocQty = alloc.allocated_quantity || 0;
    const stockGeral = product?.quantity || 0;
    const belowAllocMin = minQty > 0 && allocQty <= minQty;
    const belowProductMin = stockGeral <= (product?.min_quantity || 5);
    return belowAllocMin || belowProductMin;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-primary" />
          </div>
          Representantes
        </h1>
        <p className="text-muted-foreground mt-1">{reps.length} representante(s) cadastrado(s)</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : reps.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <UserCheck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum representante encontrado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reps.map((rep) => {
            const isRepExpanded = expandedRep === rep.id;
            const totalAlerts = rep.clients.reduce((sum, c) => sum + getClientAlerts(c.id).length, 0);

            return (
              <div key={rep.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                {/* Header do representante */}
                <div
                  className="p-5 flex items-center justify-between gap-4 flex-wrap cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedRep(isRepExpanded ? null : rep.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-lg">
                      {rep.name?.[0]?.toUpperCase() || "R"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{rep.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {rep.clients.length} cliente(s)
                        </Badge>
                        {totalAlerts > 0 && (
                          <Badge className="text-xs bg-destructive/10 text-destructive border-0 gap-1">
                            <AlertTriangle className="w-3 h-3" /> {totalAlerts} alerta(s)
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {rep.clients.slice(0, 3).map((c) => (
                          <span key={c.id} className="text-xs text-muted-foreground">{c.name}{c.company ? ` (${c.company})` : ""}</span>
                        ))}
                        {rep.clients.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{rep.clients.length - 3} mais</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    {isRepExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {/* Lista de clientes do representante */}
                {isRepExpanded && (
                  <div className="border-t border-border bg-muted/10 p-4 space-y-3">
                    {rep.clients.map((client) => {
                      const alerts = getClientAlerts(client.id);
                      const allocs = getClientAllocs(client.id);
                      const isClientExpanded = expandedClient === client.id;

                      return (
                        <div key={client.id} className="bg-card rounded-xl border border-border overflow-hidden">
                          <div
                            className="px-4 py-3 flex items-center justify-between flex-wrap gap-3 cursor-pointer hover:bg-muted/20 transition-colors"
                            onClick={() => setExpandedClient(isClientExpanded ? null : client.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                                {client.name?.[0]?.toUpperCase() || "C"}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-sm">{client.name}</p>
                                  {client.company && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Building2 className="w-3 h-3" /> {client.company}
                                    </span>
                                  )}
                                  {alerts.length > 0 && (
                                    <Badge className="text-xs bg-destructive/10 text-destructive border-0 gap-1">
                                      <AlertTriangle className="w-3 h-3" /> {alerts.length} em alerta
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">{client.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground text-xs">
                              <Package className="w-4 h-4" />
                              <span>{allocs.length} produto(s)</span>
                              {isClientExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>

                          {/* Produtos do cliente com alertas */}
                          {isClientExpanded && (
                            <div className="border-t border-border bg-muted/20 p-4">
                              {allocs.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-3">Nenhum produto alocado</p>
                              ) : (
                                <div className="space-y-2">
                                  {allocs.map((alloc) => {
                                    const product = getProduct(alloc.product_id);
                                    const hasAlert = isAlertAlloc(alloc);
                                    return (
                                      <div
                                        key={alloc.id}
                                        className={`flex items-center justify-between rounded-lg border px-4 py-3 gap-3 flex-wrap ${hasAlert ? "bg-destructive/5 border-destructive/20" : "bg-card border-border"}`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className={`w-2 h-2 rounded-full ${hasAlert ? "bg-destructive" : "bg-green-500"}`} />
                                          <div>
                                            <p className="text-sm font-medium">{alloc.product_name || product?.name || "Produto"}</p>
                                            {product && (
                                              <p className="text-xs text-muted-foreground">
                                                Depósito: {product.quantity || 0} {product.unit || "un."}
                                                {alloc.min_quantity > 0 && ` • Mín. cliente: ${alloc.min_quantity}`}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          {hasAlert && (
                                            <Badge className="text-xs bg-destructive/10 text-destructive border-0 gap-1">
                                              <AlertTriangle className="w-3 h-3" /> Estoque baixo
                                            </Badge>
                                          )}
                                          <div className="text-right">
                                            <p className="text-xs text-muted-foreground">Alocado</p>
                                            <p className={`text-lg font-bold ${hasAlert ? "text-destructive" : "text-foreground"}`}>
                                              {alloc.allocated_quantity || 0}
                                              <span className="text-xs font-normal text-muted-foreground ml-1">{product?.unit || "un."}</span>
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}