import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function ReplenishStock({ client, onClose }) {
  const queryClient = useQueryClient();
  const [quantities, setQuantities] = useState({});

  const { data: allocations = [], isLoading } = useQuery({
    queryKey: ["allocations", client.id],
    queryFn: () => base44.entities.ClientAllocation.filter({ client_id: client.id }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientAllocation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allocations", client.id] });
      queryClient.invalidateQueries({ queryKey: ["all-allocations"] });
    },
  });

  const handleReplenish = async () => {
    const entries = Object.entries(quantities).filter(([, qty]) => qty > 0);
    if (entries.length === 0) {
      toast.error("Informe a quantidade a repor em pelo menos um produto.");
      return;
    }

    for (const [allocId, qty] of entries) {
      const alloc = allocations.find((a) => a.id === allocId);
      if (alloc) {
        await updateMutation.mutateAsync({
          id: allocId,
          data: { allocated_quantity: (alloc.allocated_quantity || 0) + Number(qty) },
        });
      }
    }

    toast.success("Estoque reposto com sucesso!");
    setQuantities({});
    onClose();
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground text-sm">Carregando...</div>;
  }

  if (allocations.length === 0) {
    return <div className="py-8 text-center text-muted-foreground text-sm">Este cliente não possui produtos alocados.</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Informe a quantidade a <strong>adicionar</strong> no estoque de cada produto do cliente <strong>{client.name}</strong>.
      </p>

      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {allocations.map((alloc) => {
          const isLow = (alloc.min_quantity || 0) > 0 && (alloc.allocated_quantity || 0) <= (alloc.min_quantity || 0);
          return (
            <div key={alloc.id} className={`flex items-center gap-3 rounded-xl border p-3 ${isLow ? "border-amber-300 bg-amber-50" : "border-border bg-card"}`}>
              <Package className={`w-4 h-4 flex-shrink-0 ${isLow ? "text-amber-500" : "text-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{alloc.product_name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Atual: {alloc.allocated_quantity || 0}
                  {isLow && <span className="text-amber-600 flex items-center gap-0.5 ml-1"><AlertTriangle className="w-3 h-3" /> abaixo do mínimo ({alloc.min_quantity})</span>}
                </p>
              </div>
              <Input
                type="number"
                min={0}
                placeholder="+0"
                value={quantities[alloc.id] || ""}
                onChange={(e) => setQuantities((q) => ({ ...q, [alloc.id]: e.target.value }))}
                className="w-24 h-8 rounded-lg text-sm"
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onClose} className="rounded-xl">Cancelar</Button>
        <Button onClick={handleReplenish} disabled={updateMutation.isPending} className="rounded-xl">
          {updateMutation.isPending ? "Salvando..." : "Repor Estoque"}
        </Button>
      </div>
    </div>
  );
}