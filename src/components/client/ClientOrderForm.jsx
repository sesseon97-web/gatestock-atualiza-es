import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Package } from "lucide-react";
import { generateOrderNumber } from "@/lib/orderNumber";

export default function ClientOrderForm({ allocation, client, onOrderCreated, onCancel }) {
  const stock = allocation.product?.quantity || 0;
  const maxQty = Math.min(allocation.allocated_quantity, stock);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.StockOrder.create(data),
    onSuccess: (order) => onOrderCreated(order),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      order_number: generateOrderNumber(),
      type: "retirada",
      product_id: allocation.product_id,
      product_name: allocation.product_name,
      quantity,
      notes,
      status: "pendente",
      client_id: client.id,
      client_name: client.name,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1">
      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Package className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-foreground">{allocation.product_name}</p>
          <p className="text-xs text-muted-foreground">
            Disponível para você: <span className="font-bold text-foreground">{maxQty}</span> {allocation.product?.unit || "un."}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Quantidade *</Label>
        <Input
          type="number"
          min={1}
          max={maxQty}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          required
          className="rounded-xl"
        />
        {quantity > maxQty && (
          <p className="text-xs text-destructive">Quantidade maior que o disponível ({maxQty})</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Observações</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Motivo da retirada..."
          className="rounded-xl"
          rows={2}
        />
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-xl">
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={quantity < 1 || quantity > maxQty || mutation.isPending}
          className="flex-1 rounded-xl"
        >
          {mutation.isPending ? "Criando..." : "Avançar"}
        </Button>
      </div>
    </form>
  );
}