import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Package, ImageOff, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { generateOrderNumber } from "@/lib/orderNumber";

export default function ClientReturnFlow({ client, onClose }) {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);

  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ["client-withdrawals", client?.id],
    queryFn: () =>
      base44.entities.StockOrder.filter(
        { client_id: client?.id, type: "retirada", status: "confirmado" },
        "-created_date",
        50
      ),
    enabled: !!client?.id,
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StockOrder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setDone(true);
    },
  });

  const handleConfirm = () => {
    if (!selectedOrder) return;
    createMutation.mutate({
      order_number: generateOrderNumber(),
      type: "devolução",
      product_id: selectedOrder.product_id,
      product_name: selectedOrder.product_name,
      quantity,
      notes,
      status: "confirmado",
      original_order_id: selectedOrder.id,
      client_id: client.id,
      client_name: client.name,
    });
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">Devolução registrada!</p>
          <p className="text-sm text-muted-foreground mt-1">O produto foi devolvido ao estoque.</p>
        </div>
        <Button onClick={onClose} className="rounded-xl px-8">Fechar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : allOrders.length === 0 ? (
        <div className="text-center py-10">
          <Package className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhuma retirada encontrada</p>
          <p className="text-sm text-muted-foreground mt-1">Só é possível devolver produtos retirados.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground font-medium">Selecione o pedido a devolver:</p>
          <div className="grid grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-1">
            {allOrders.map((order) => {
              const product = allProducts.find((p) => p.id === order.product_id);
              const isSelected = selectedOrder?.id === order.id;
              return (
                <button
                  key={order.id}
                  onClick={() => { setSelectedOrder(order); setQuantity(order.quantity); }}
                  className={`text-left bg-card rounded-xl border transition-all overflow-hidden ${
                    isSelected
                      ? "border-green-500 shadow-lg shadow-green-500/10 ring-2 ring-green-500/20"
                      : "border-border hover:border-green-400"
                  }`}
                >
                  <div className="aspect-square bg-muted overflow-hidden relative">
                    {product?.image_url ? (
                      <img src={product.image_url} alt={order.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                        <ImageOff className="w-6 h-6" />
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                          <RotateCcw className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="font-semibold text-xs leading-tight truncate">{order.product_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.quantity}x · {format(new Date(order.created_date), "dd/MM")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedOrder && (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="space-y-1.5">
                <Label>Quantidade a devolver</Label>
                <Input
                  type="number"
                  min={1}
                  max={selectedOrder.quantity}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.min(selectedOrder.quantity, Math.max(1, Number(e.target.value))))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Observações</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Motivo da devolução..."
                  className="rounded-xl"
                  rows={2}
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancelar</Button>
                <Button
                  onClick={handleConfirm}
                  disabled={createMutation.isPending}
                  className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  {createMutation.isPending ? "Enviando..." : "Confirmar"}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}