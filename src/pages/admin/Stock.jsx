import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Warehouse, Package, ChevronDown, ChevronUp, Users, AlertTriangle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function Stock() {
  const [search, setSearch] = useState("");
  const [expandedProduct, setExpandedProduct] = useState(null);

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: allocations = [], isLoading: loadingAllocs } = useQuery({
    queryKey: ["allocations-all"],
    queryFn: () => base44.entities.ClientAllocation.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const isLoading = loadingProducts || loadingAllocs;

  const filtered = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.code?.toLowerCase().includes(search.toLowerCase())
  );

  const getAllocsForProduct = (productId) =>
    allocations.filter((a) => a.product_id === productId);

  const getTotalAllocated = (productId) =>
    getAllocsForProduct(productId).reduce((sum, a) => sum + (a.allocated_quantity || 0), 0);

  const getClientName = (clientId) =>
    clients.find((c) => c.id === clientId)?.name || "Cliente desconhecido";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Warehouse className="w-5 h-5 text-primary" />
          </div>
          Estoque
        </h1>
        <p className="text-muted-foreground mt-1">Visão geral do estoque e alocações por cliente</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-12 rounded-xl"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum produto encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((product) => {
            const productAllocs = getAllocsForProduct(product.id);
            const totalAllocated = getTotalAllocated(product.id);
            const stockGeral = product.quantity || 0;
            const isLow = stockGeral <= (product.min_quantity || 5);
            const isExpanded = expandedProduct === product.id;

            return (
              <div key={product.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                {/* Header do produto */}
                <div
                  className="p-5 flex items-center justify-between gap-4 flex-wrap cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{product.name}</h3>
                        <Badge variant="secondary" className="text-xs">{product.category || "Outros"}</Badge>
                        {isLow && (
                          <Badge className="text-xs bg-destructive/10 text-destructive border-0 gap-1">
                            <AlertTriangle className="w-3 h-3" /> Estoque baixo
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Cód: {product.code}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Estoque geral (disponível no depósito) */}
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Depósito</p>
                      <p className={`text-2xl font-bold ${isLow ? "text-destructive" : "text-foreground"}`}>
                        {stockGeral}
                      </p>
                      <p className="text-xs text-muted-foreground">{product.unit || "un."}</p>
                    </div>

                    {/* Total alocado a clientes */}
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Alocado</p>
                      <p className="text-2xl font-bold text-blue-600">{totalAllocated}</p>
                      <p className="text-xs text-muted-foreground">{product.unit || "un."}</p>
                    </div>

                    {/* Total geral */}
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold text-green-600">{stockGeral + totalAllocated}</p>
                      <p className="text-xs text-muted-foreground">{product.unit || "un."}</p>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">{productAllocs.length}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Detalhes de alocações */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/20 p-5">
                    {productAllocs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Este produto não está alocado a nenhum cliente.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-foreground mb-3">Alocações por cliente</p>
                        {productAllocs.map((alloc) => {
                          const isBelowMin = (alloc.min_quantity || 0) > 0 && (alloc.allocated_quantity || 0) <= (alloc.min_quantity || 0);
                          return (
                            <div
                              key={alloc.id}
                              className="flex items-center justify-between bg-card rounded-xl border border-border px-4 py-3 gap-3 flex-wrap"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                                  {getClientName(alloc.client_id)?.[0]?.toUpperCase() || "C"}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{getClientName(alloc.client_id)}</p>
                                  {alloc.min_quantity > 0 && (
                                    <p className="text-xs text-muted-foreground">Mín: {alloc.min_quantity} {product.unit || "un."}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {isBelowMin && (
                                  <Badge className="text-xs bg-amber-100 text-amber-700 border-0 gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Abaixo do mínimo
                                  </Badge>
                                )}
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">Quantidade</p>
                                  <p className="text-lg font-bold text-foreground">
                                    {alloc.allocated_quantity || 0} <span className="text-xs font-normal text-muted-foreground">{product.unit || "un."}</span>
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
}