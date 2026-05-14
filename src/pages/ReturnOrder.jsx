import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ProductSelector from "@/components/stock/ProductSelector";
import DoorConfirmation from "@/components/stock/DoorConfirmation";
import { RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ReturnOrder() {
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [createdOrder, setCreatedOrder] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const selectedProduct = products.find((p) => p.id === productId);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StockOrder.create(data),
    onSuccess: (data) => {
      setCreatedOrder(data);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      type: "devolução",
      product_id: productId,
      product_name: selectedProduct?.name || "",
      quantity,
      notes,
      status: "pendente",
    });
  };

  const handleConfirmed = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    navigate("/pedidos");
  };

  if (createdOrder) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-card rounded-2xl border border-border p-8">
          <DoorConfirmation order={createdOrder} onConfirmed={handleConfirmed} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <RotateCcw className="w-5 h-5 text-green-600" />
          </div>
          Devolução
        </h1>
        <p className="text-muted-foreground mt-1">Devolva produtos ao estoque</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-5">
        <div className="space-y-2">
          <Label>Produto *</Label>
          <ProductSelector value={productId} onChange={setProductId} />
        </div>

        <div className="space-y-2">
          <Label>Quantidade *</Label>
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="rounded-xl"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Motivo da devolução..."
            className="rounded-xl"
          />
        </div>

        <Button
          type="submit"
          disabled={!productId || quantity < 1 || createMutation.isPending}
          className="w-full h-12 rounded-xl text-base font-semibold"
        >
          {createMutation.isPending ? "Criando..." : "Criar Pedido de Devolução"}
        </Button>
      </form>
    </div>
  );
}