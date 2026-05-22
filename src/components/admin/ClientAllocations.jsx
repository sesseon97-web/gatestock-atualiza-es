import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Package, AlertTriangle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function ClientAllocations({ client }) {
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qty, setQty] = useState(1);
  const [minQty, setMinQty] = useState(0);
  const [search, setSearch] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ["allocations", client.id],
    queryFn: () => base44.entities.ClientAllocation.filter({ client_id: client.id }),
  });

  const addMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientAllocation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations", client.id] });
      toast.success("Produto alocado!");
      setSelectedProduct("");
      setQty(1);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, alloc, data }) => {
      // Se mudou allocated_quantity, ajusta estoque do produto
      if (data.allocated_quantity !== undefined && alloc) {
        const prod = products.find((p) => p.id === alloc.product_id);
        if (prod) {
          const diff = data.allocated_quantity - (alloc.allocated_quantity || 0);
          const newStock = Math.max(0, (prod.quantity || 0) - diff);
          await base44.entities.Product.update(prod.id, { quantity: newStock });
        }
      }
      return base44.entities.ClientAllocation.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations", client.id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (alloc) => {
      // Devolve quantidade ao estoque do produto ao remover alocação
      const prod = products.find((p) => p.id === alloc.product_id);
      if (prod) {
        await base44.entities.Product.update(prod.id, { quantity: (prod.quantity || 0) + (alloc.allocated_quantity || 0) });
      }
      return base44.entities.ClientAllocation.delete(alloc.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations", client.id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Alocação removida");
    },
  });

  const allocatedProductIds = allocations.map((a) => a.product_id);
  const availableProducts = products
    .filter((p) => !allocatedProductIds.includes(p.id))
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const product = products.find((p) => p.id === selectedProduct);

  const handleAdd = async () => {
    if (!selectedProduct || qty < 1) return;
    // Baixa o estoque do produto ao alocar
    if (product) {
      const newStock = Math.max(0, (product.quantity || 0) - qty);
      await base44.entities.Product.update(product.id, { quantity: newStock });
    }
    addMutation.mutate({
      client_id: client.id,
      client_email: client.email,
      product_id: selectedProduct,
      product_name: product?.name || "",
      allocated_quantity: qty,
      min_quantity: minQty,
    });
    setMinQty(0);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-foreground">Produtos disponíveis para {client.name}</p>

      {allocations.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum produto alocado ainda.</p>
      ) : (
        <div className="space-y-2">
          {allocations.map((alloc) => {
            const prod = products.find((p) => p.id === alloc.product_id);
            const stock = prod?.quantity || 0;
            return (
              <div key={alloc.id} className="flex items-start gap-3 bg-card rounded-xl border border-border p-3 flex-wrap">
                <Package className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{alloc.product_name}</p>
                  <p className="text-xs text-muted-foreground">Estoque total: {stock} {prod?.unit || "un."}</p>
                  {(alloc.min_quantity || 0) > 0 && stock <= (alloc.min_quantity || 0) && (
                    <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="w-3 h-3" /> Abaixo do mínimo ({alloc.min_quantity})
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs text-muted-foreground">Qtd</span>
                    <Input
                     type="number"
                     min={1}
                     max={stock}
                     value={alloc.allocated_quantity}
                     onChange={(e) => updateMutation.mutate({ id: alloc.id, alloc, data: { allocated_quantity: Number(e.target.value) } })}
                     onFocus={(e) => e.target.select()}
                     className="w-20 h-8 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs text-muted-foreground">Qtd Mín.</span>
                    <Input
                     type="number"
                     min={0}
                     value={alloc.min_quantity || 0}
                     onChange={(e) => updateMutation.mutate({ id: alloc.id, alloc, data: { min_quantity: Number(e.target.value) } })}
                     onFocus={(e) => e.target.select()}
                     className="w-20 h-8 rounded-lg text-sm"
                    />
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 text-destructive flex-shrink-0 mt-4"
                    onClick={() => deleteMutation.mutate(alloc)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(availableProducts.length > 0 || search) && (
        <div className="flex flex-col gap-2 pt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedProduct(""); }}
              placeholder="Buscar ferramenta..."
              className="pl-9 h-9 rounded-xl text-sm"
            />
          </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="flex-1 min-w-[180px] h-9 rounded-xl text-sm">
              <SelectValue placeholder="Adicionar produto..." />
            </SelectTrigger>
            <SelectContent>
              {availableProducts.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({p.quantity || 0} {p.unit || "un."})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            max={product?.quantity || 999}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            onFocus={(e) => e.target.select()}
            className="w-24 h-9 rounded-xl text-sm"
            placeholder="Qtd"
            title="Quantidade alocada"
          />
          <Input
            type="number"
            min={0}
            value={minQty}
            onChange={(e) => setMinQty(Number(e.target.value))}
            onFocus={(e) => e.target.select()}
            className="w-24 h-9 rounded-xl text-sm"
            placeholder="Qtd Mín."
            title="Quantidade mínima para alerta"
          />
          <Button size="sm" onClick={handleAdd} disabled={!selectedProduct} className="rounded-xl gap-1 h-9">
            <Plus className="w-3.5 h-3.5" /> Alocar
          </Button>
        </div>
        </div>
      )}
    </div>
  );
}