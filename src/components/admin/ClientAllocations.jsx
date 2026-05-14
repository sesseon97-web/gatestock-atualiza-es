import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function ClientAllocations({ client }) {
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qty, setQty] = useState(1);

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
    mutationFn: ({ id, qty }) => base44.entities.ClientAllocation.update(id, { allocated_quantity: qty }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations", client.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientAllocation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations", client.id] });
      toast.success("Alocação removida");
    },
  });

  const allocatedProductIds = allocations.map((a) => a.product_id);
  const availableProducts = products.filter((p) => !allocatedProductIds.includes(p.id));
  const product = products.find((p) => p.id === selectedProduct);

  const handleAdd = () => {
    if (!selectedProduct || qty < 1) return;
    addMutation.mutate({
      client_id: client.id,
      client_email: client.email,
      product_id: selectedProduct,
      product_name: product?.name || "",
      allocated_quantity: qty,
    });
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
              <div key={alloc.id} className="flex items-center gap-3 bg-card rounded-xl border border-border p-3">
                <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{alloc.product_name}</p>
                  <p className="text-xs text-muted-foreground">Estoque total: {stock} {prod?.unit || "un."}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Qtd:</span>
                  <Input
                    type="number"
                    min={1}
                    max={stock}
                    value={alloc.allocated_quantity}
                    onChange={(e) => updateMutation.mutate({ id: alloc.id, qty: Number(e.target.value) })}
                    className="w-20 h-8 rounded-lg text-sm"
                  />
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 text-destructive flex-shrink-0"
                    onClick={() => deleteMutation.mutate(alloc.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {availableProducts.length > 0 && (
        <div className="flex items-center gap-2 pt-2 flex-wrap">
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
            className="w-24 h-9 rounded-xl text-sm"
            placeholder="Qtd"
          />
          <Button size="sm" onClick={handleAdd} disabled={!selectedProduct} className="rounded-xl gap-1 h-9">
            <Plus className="w-3.5 h-3.5" /> Alocar
          </Button>
        </div>
      )}
    </div>
  );
}