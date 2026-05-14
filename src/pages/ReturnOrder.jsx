import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RotateCcw, Package, ImageOff } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { generateOrderNumber } from "@/lib/orderNumber";
import DoorConfirmation from "@/components/stock/DoorConfirmation";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export default function ReturnOrder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [createdOrder, setCreatedOrder] = useState(null);

  const isAdmin = user?.role === "admin";

  // Fetch confirmed withdrawal orders
  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ["confirmed-withdrawals", user?.email],
    queryFn: () =>
      isAdmin
        ? base44.entities.StockOrder.filter({ type: "retirada", status: "confirmado" }, "-created_date", 100)
        : base44.entities.StockOrder.filter({ type: "retirada", status: "confirmado", created_by: user?.email }, "-created_date", 100),
    enabled: !!user?.email,
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StockOrder.create(data),
    onSuccess: (data) => setCreatedOrder(data),
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
      status: "pendente",
      original_order_id: selectedOrder.id,
      client_id: selectedOrder.client_id || null,
      client_name: selectedOrder.client_name || "",
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
          <div className="text-center mb-4">
            <p className="text-xs text-muted-foreground">Pedido {createdOrder.order_number}</p>
          </div>
          <DoorConfirmation order={createdOrder} onConfirmed={handleConfirmed} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <RotateCcw className="w-5 h-5 text-green-600" />
          </div>
          Devolução
        </h1>
        <p className="text-muted-foreground mt-1">Selecione um pedido de retirada para devolver</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : allOrders.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhuma retirada confirmada encontrada</p>
          <p className="text-sm text-muted-foreground mt-1">Só é possível devolver produtos que foram retirados.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {allOrders.map((order) => {
              const product = allProducts.find((p) => p.id === order.product_id);
              const isSelected = selectedOrder?.id === order.id;
              return (
                <button
                  key={order.id}
                  onClick={() => { setSelectedOrder(order); setQuantity(order.quantity); }}
                  className={`text-left bg-card rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isSelected
                      ? "border-green-500 shadow-lg shadow-green-500/10 ring-2 ring-green-500/20"
                      : "border-border hover:shadow-md hover:-translate-y-0.5"
                  }`}
                >
                  <div className="aspect-square bg-muted overflow-hidden relative">
                    {product?.image_url ? (
                      <img src={product.image_url} alt={order.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                        <ImageOff className="w-8 h-8" />
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                          <RotateCcw className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm leading-tight">{order.product_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.quantity}x · {format(new Date(order.created_date), "dd/MM")}
                    </p>
                    {order.order_number && (
                      <Badge variant="outline" className="text-xs mt-1">{order.order_number}</Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedOrder && (
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <RotateCcw className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">{selectedOrder.product_name}</p>
                  <p className="text-xs text-muted-foreground">Retirada: {selectedOrder.quantity}x</p>
                </div>
              </div>
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
              <Button
                className="w-full h-12 rounded-xl text-base font-bold gap-2 bg-green-600 hover:bg-green-700"
                onClick={handleConfirm}
                disabled={createMutation.isPending}
              >
                <RotateCcw className="w-5 h-5" />
                {createMutation.isPending ? "Criando..." : "Confirmar Devolução"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}