import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Package, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

function AllocationRow({ alloc, products, updateMutation, deleteMutation }) {
  const prod = products.find((p) => p.id === alloc.product_id);
  const stock = prod?.quantity || 0;

  const [qtyVal, setQtyVal] = useState(String(alloc.allocated_quantity ?? ""));
  const [minVal, setMinVal] = useState(String(alloc.min_quantity ?? ""));

  useEffect(() => { setQtyVal(String(alloc.allocated_quantity ?? "")); }, [alloc.allocated_quantity]);
  useEffect(() => { setMinVal(String(alloc.min_quantity ?? "")); }, [alloc.min_quantity]);

  const commitQty = () => {
    const num = Number(qtyVal);
    if (qtyVal !== "" && !isNaN(num) && num >= 1) {
      updateMutation.mutate({ id: alloc.id, alloc, data: { allocated_quantity: num } });
    } else {
      setQtyVal(String(alloc.allocated_quantity ?? ""));
    }
  };

  const commitMin = () => {
    const num = Number(minVal);
    if (minVal !== "" && !isNaN(num) && num >= 0) {
      updateMutation.mutate({ id: alloc.id, alloc, data: { min_quantity: num } });
    } else {
      setMinVal(String(alloc.min_quantity ?? ""));
    }
  };

  return (
    <div className="flex items-start gap-3 bg-card rounded-xl border border-border p-3 flex-wrap">
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
            value={qtyVal}
            onChange={(e) => setQtyVal(e.target.value)}
            onBlur={commitQty}
            className="w-20 h-8 rounded-lg text-sm"
          />
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xs text-muted-foreground">Qtd Mín.</span>
          <Input
            type="number"
            min={0}
            value={minVal}
            onChange={(e) => setMinVal(e.target.value)}
            onBlur={commitMin}
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
}

export default function ClientAllocations({ client }) {
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qty, setQty] = useState("");
  const [minQty, setMinQty] = useState("");

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
  const availableProducts = products.filter((p) => !allocatedProductIds.includes(p.id));
  const product = products.find((p) => p.id === selectedProduct);

  const handleAdd = async () => {
    const qtyNum = Number(qty) || 0;
    const minQtyNum = Number(minQty) || 0;
    if (!selectedProduct || qtyNum < 1) return;
    if (product) {
      const newStock = Math.max(0, (product.quantity || 0) - qtyNum);
      await base44.entities.Product.update(product.id, { quantity: newStock });
    }
    addMutation.mutate({
      client_id: client.id,
      client_email: client.email,
      product_id: selectedProduct,
      product_name: product?.name || "",
      allocated_quantity: qtyNum,
      min_quantity: minQtyNum,
    });
    setQty("");
    setMinQty("");
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-foreground">Produtos disponíveis para {client.name}</p>

      {allocations.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum produto alocado ainda.</p>
      ) : (
        <div className="space-y-2">
          {allocations.map((alloc) => (
            <AllocationRow
              key={alloc.id}
              alloc={alloc}
              products={products}
              updateMutation={updateMutation}
              deleteMutation={deleteMutation}
            />
          ))}
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
            onChange={(e) => setQty(e.target.value)}
            className="w-24 h-9 rounded-xl text-sm"
            placeholder="Qtd"
            title="Quantidade alocada"
          />
          <Input
            type="number"
            min={0}
            value={minQty}
            onChange={(e) => setMinQty(e.target.value)}
            className="w-24 h-9 rounded-xl text-sm"
            placeholder="Qtd Mín."
            title="Quantidade mínima para alerta"
          />
          <Button size="sm" onClick={handleAdd} disabled={!selectedProduct} className="rounded-xl gap-1 h-9">
            <Plus className="w-3.5 h-3.5" /> Alocar
          </Button>
        </div>
      )}
    </div>
  );
}