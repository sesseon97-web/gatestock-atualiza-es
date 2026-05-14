import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Package, Plus, Minus, Trash2, ArrowDownRight, ImageOff } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { generateOrderNumber } from "@/lib/orderNumber";
import DoorConfirmation from "@/components/stock/DoorConfirmation";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function NewOrder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState({}); // { productId: quantity }
  const [notes, setNotes] = useState("");
  const [createdOrders, setCreatedOrders] = useState([]);
  const [confirmIndex, setConfirmIndex] = useState(0);

  const isAdmin = user?.role === "admin";

  // Load client profile (for non-admin)
  const { data: clients = [] } = useQuery({
    queryKey: ["my-client", user?.email],
    queryFn: () => base44.entities.Client.filter({ email: user?.email }),
    enabled: !!user?.email && !isAdmin,
  });
  const myClient = clients[0];

  // Load allocations (for non-admin)
  const { data: allocations = [] } = useQuery({
    queryKey: ["my-allocations", myClient?.id],
    queryFn: () => base44.entities.ClientAllocation.filter({ client_id: myClient?.id }),
    enabled: !!myClient?.id,
  });

  // Load all products
  const { data: allProducts = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  // Build product list: admin sees all, client sees only allocated
  const products = isAdmin
    ? allProducts.filter((p) => (p.quantity || 0) > 0)
    : allProducts.filter((p) => {
        const alloc = allocations.find((a) => a.product_id === p.id);
        return alloc && Math.min(alloc.allocated_quantity, p.quantity || 0) > 0;
      });

  const getMax = (product) => {
    if (isAdmin) return product.quantity || 0;
    const alloc = allocations.find((a) => a.product_id === product.id);
    return alloc ? Math.min(alloc.allocated_quantity, product.quantity || 0) : 0;
  };

  const cartItems = Object.entries(cart)
    .map(([id, qty]) => ({ product: allProducts.find((p) => p.id === id), qty }))
    .filter((i) => i.product && i.qty > 0);

  const totalItems = cartItems.reduce((s, i) => s + i.qty, 0);

  const setQty = (productId, qty) => {
    if (qty <= 0) {
      setCart((c) => { const n = { ...c }; delete n[productId]; return n; });
    } else {
      setCart((c) => ({ ...c, [productId]: qty }));
    }
  };

  const createMutation = useMutation({
    mutationFn: (orders) => Promise.all(orders.map((o) => base44.entities.StockOrder.create(o))),
    onSuccess: (orders) => {
      setCreatedOrders(orders);
      setConfirmIndex(0);
    },
  });

  const handleSubmit = () => {
    if (cartItems.length === 0) return;
    const orderNum = generateOrderNumber();
    const orders = cartItems.map((item) => ({
      order_number: orderNum,
      type: "retirada",
      product_id: item.product.id,
      product_name: item.product.name,
      quantity: item.qty,
      notes,
      status: "pendente",
      client_id: myClient?.id || null,
      client_name: myClient?.name || user?.full_name || "",
    }));
    createMutation.mutate(orders);
  };

  const handleConfirmed = () => {
    const next = confirmIndex + 1;
    if (next < createdOrders.length) {
      setConfirmIndex(next);
    } else {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Todos os itens confirmados!");
      navigate("/pedidos");
    }
  };

  // Confirmation flow
  if (createdOrders.length > 0) {
    const current = createdOrders[confirmIndex];
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-card rounded-2xl border border-border p-8">
          <div className="text-center mb-4">
            <p className="text-xs text-muted-foreground">Pedido {current.order_number}</p>
            {createdOrders.length > 1 && (
              <p className="text-sm font-medium mt-1">
                Item {confirmIndex + 1} de {createdOrders.length}
              </p>
            )}
          </div>
          <DoorConfirmation order={current} onConfirmed={handleConfirmed} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-primary" />
            </div>
            Nova Retirada
          </h1>
          <p className="text-muted-foreground mt-1">Selecione os produtos desejados</p>
        </div>
        {totalItems > 0 && (
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl font-semibold">
            <ShoppingCart className="w-4 h-4" />
            {totalItems} {totalItems === 1 ? "item" : "itens"} no carrinho
          </div>
        )}
      </div>

      {/* Product grid */}
      {products.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum produto disponível</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => {
            const max = getMax(product);
            const inCart = cart[product.id] || 0;
            const selected = inCart > 0;
            return (
              <div
                key={product.id}
                className={`bg-card rounded-2xl border transition-all duration-200 overflow-hidden ${
                  selected
                    ? "border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20"
                    : "border-border hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
                {/* Product image */}
                <div className="relative aspect-square bg-muted overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
                      <ImageOff className="w-8 h-8" />
                    </div>
                  )}
                  {selected && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow">
                      {inCart}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="font-semibold text-sm text-foreground leading-tight">{product.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{product.category || ""}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      Estoque: <span className="font-bold text-foreground">{max}</span> {product.unit || "un."}
                    </span>
                  </div>

                  {/* Cart controls */}
                  {inCart === 0 ? (
                    <Button
                      size="sm"
                      className="w-full mt-3 rounded-xl h-8 text-xs gap-1"
                      onClick={() => setQty(product.id, 1)}
                    >
                      <Plus className="w-3 h-3" /> Adicionar
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1 mt-3">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-lg flex-shrink-0"
                        onClick={() => setQty(product.id, inCart - 1)}
                      >
                        {inCart === 1 ? <Trash2 className="w-3 h-3 text-destructive" /> : <Minus className="w-3 h-3" />}
                      </Button>
                      <input
                        type="number"
                        min={1}
                        max={max}
                        value={inCart}
                        onChange={(e) => setQty(product.id, Math.min(max, Math.max(1, Number(e.target.value))))}
                        className="flex-1 h-8 text-center text-sm font-bold border border-border rounded-lg bg-background w-0"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-lg flex-shrink-0"
                        disabled={inCart >= max}
                        onClick={() => setQty(product.id, inCart + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cart summary + checkout */}
      {cartItems.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4 sticky bottom-4 shadow-xl">
          <div className="space-y-2">
            <p className="font-semibold text-sm">Carrinho</p>
            {cartItems.map((item) => (
              <div key={item.product.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{item.product.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{item.qty}x</Badge>
                  <button onClick={() => setQty(item.product.id, 0)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo da retirada..."
              className="rounded-xl text-sm"
              rows={2}
            />
          </div>

          <Button
            className="w-full h-12 rounded-xl text-base font-bold gap-2"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            <ShoppingCart className="w-5 h-5" />
            {createMutation.isPending ? "Criando..." : `Finalizar Pedido (${totalItems} ${totalItems === 1 ? "item" : "itens"})`}
          </Button>
        </div>
      )}
    </div>
  );
}