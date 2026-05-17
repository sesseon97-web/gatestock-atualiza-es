import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Minus, ShoppingCart, ArrowLeft, Trash2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { generateOrderNumber } from "@/lib/orderNumber";

// Step 1: Select products & quantities
function ProductSelector({ enriched, cart, onUpdateCart, onNext, onCancel, employee }) {
  const hasItems = Object.values(cart).some((q) => q > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <CheckCircle className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Funcionário identificado</p>
          <p className="text-xs text-muted-foreground">{employee?.name}</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground font-medium">Selecione os produtos e quantidades:</p>

      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
        {enriched.map((alloc) => {
          const stock = alloc.product?.quantity || 0;
          const available = Math.min(alloc.allocated_quantity, stock);
          const qty = cart[alloc.product_id] || 0;
          const outOfStock = available <= 0;

          return (
            <div
              key={alloc.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                outOfStock ? "opacity-50 bg-muted/30 border-border" : qty > 0 ? "border-primary bg-primary/5" : "bg-card border-border"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{alloc.product_name}</p>
                <p className="text-xs text-muted-foreground">
                  Disponível: <span className="font-medium text-foreground">{available}</span> {alloc.product?.unit || "un."}
                </p>
              </div>
              {!outOfStock && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    disabled={qty <= 0}
                    onClick={() => onUpdateCart(alloc.product_id, Math.max(0, qty - 1))}
                  >
                    {qty <= 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  </Button>
                  <span className="w-6 text-center text-sm font-bold">{qty}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    disabled={qty >= available}
                    onClick={() => onUpdateCart(alloc.product_id, Math.min(available, qty + 1))}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              )}
              {outOfStock && (
                <Badge variant="secondary" className="text-xs text-destructive bg-destructive/10 flex-shrink-0">Sem estoque</Badge>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1 rounded-xl">
          Cancelar
        </Button>
        <Button
          onClick={onNext}
          disabled={!hasItems}
          className="flex-1 rounded-xl gap-2"
        >
          <ShoppingCart className="w-4 h-4" />
          Confirmar ({Object.values(cart).filter((q) => q > 0).length} produto{Object.values(cart).filter((q) => q > 0).length !== 1 ? "s" : ""})
        </Button>
      </div>
    </div>
  );
}

// Step 2: Review & submit
function OrderReview({ enriched, cart, notes, onNotesChange, onSubmit, onBack, isLoading }) {
  const cartItems = enriched.filter((a) => (cart[a.product_id] || 0) > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="text-sm font-semibold">Resumo do Pedido</p>
      </div>

      <div className="space-y-2 bg-muted/30 rounded-xl p-4">
        {cartItems.map((alloc) => (
          <div key={alloc.id} className="flex justify-between items-center text-sm">
            <span className="text-foreground font-medium">{alloc.product_name}</span>
            <span className="text-muted-foreground">
              <span className="font-bold text-foreground">{cart[alloc.product_id]}</span> {alloc.product?.unit || "un."}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label>Observações</Label>
        <Textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Motivo da retirada ou observações..."
          className="rounded-xl"
          rows={2}
        />
      </div>

      <div className="flex gap-3 pt-1">
        <Button variant="outline" onClick={onBack} className="flex-1 rounded-xl">
          Voltar
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isLoading}
          className="flex-1 rounded-xl"
        >
          {isLoading ? "Enviando..." : "Confirmar Pedido"}
        </Button>
      </div>
    </div>
  );
}

export default function CartCheckout({ enriched, client, employee, onOrdersCreated, onCancel }) {
  const [step, setStep] = useState(1); // 1 = select, 2 = review
  const [cart, setCart] = useState({});
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const items = enriched.filter((a) => (cart[a.product_id] || 0) > 0);
      const orders = await Promise.all(
        items.map((alloc) =>
          base44.entities.StockOrder.create({
            order_number: generateOrderNumber(),
            type: "retirada",
            product_id: alloc.product_id,
            product_name: alloc.product_name,
            quantity: cart[alloc.product_id],
            notes,
            status: "pendente",
            client_id: client.id,
            client_name: client.name,
          })
        )
      );
      return orders;
    },
    onSuccess: (orders) => {
      queryClient.invalidateQueries();
      onOrdersCreated(orders);
    },
  });

  const updateCart = (productId, qty) => {
    setCart((prev) => ({ ...prev, [productId]: qty }));
  };

  if (step === 1) {
    return (
      <ProductSelector
        enriched={enriched}
        cart={cart}
        onUpdateCart={updateCart}
        onNext={() => setStep(2)}
        onCancel={onCancel}
        employee={employee}
      />
    );
  }

  return (
    <OrderReview
      enriched={enriched}
      cart={cart}
      notes={notes}
      onNotesChange={setNotes}
      onSubmit={() => mutation.mutate()}
      onBack={() => setStep(1)}
      isLoading={mutation.isPending}
    />
  );
}