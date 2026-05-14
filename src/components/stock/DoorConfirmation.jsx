import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DoorOpen, Check, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function DoorConfirmation({ order, onConfirmed }) {
  const [step, setStep] = useState("idle"); // idle | opening | opened

  const handleConfirm = async () => {
    setStep("opening");

    // Atualiza o pedido como confirmado e porta aberta
    await base44.entities.StockOrder.update(order.id, {
      status: "confirmado",
      door_opened: true,
      confirmed_at: new Date().toISOString(),
    });

    // Atualiza o estoque do produto
    const products = await base44.entities.Product.filter({ id: order.product_id });
    if (products.length > 0) {
      const product = products[0];
      const newQty = order.type === "retirada"
        ? Math.max(0, (product.quantity || 0) - order.quantity)
        : (product.quantity || 0) + order.quantity;
      await base44.entities.Product.update(product.id, { quantity: newQty });
    }

    setStep("opened");
    toast.success(order.type === "retirada" ? "Retirada confirmada!" : "Devolução confirmada!");

    setTimeout(() => {
      onConfirmed?.();
    }, 2500);
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <AnimatePresence mode="wait">
        {step === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
              <Lock className="w-12 h-12 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-foreground">Confirmar e Abrir Porta</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {order.type === "retirada"
                  ? `Retirar ${order.quantity}x ${order.product_name}`
                  : `Devolver ${order.quantity}x ${order.product_name}`}
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleConfirm}
              className="h-16 px-10 text-lg font-bold rounded-2xl bg-primary hover:bg-primary/90 shadow-xl shadow-primary/25 gap-3"
            >
              <DoorOpen className="w-6 h-6" />
              Confirmar e Abrir Porta
            </Button>
          </motion.div>
        )}

        {step === "opening" && (
          <motion.div
            key="opening"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="w-24 h-24 rounded-3xl bg-accent/10 flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-accent animate-spin" />
            </div>
            <p className="text-lg font-semibold text-foreground">Abrindo porta...</p>
          </motion.div>
        )}

        {step === "opened" && (
          <motion.div
            key="opened"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
              className="w-24 h-24 rounded-3xl bg-green-500/10 flex items-center justify-center"
            >
              <Check className="w-12 h-12 text-green-600" />
            </motion.div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">Porta Aberta!</p>
              <p className="text-sm text-muted-foreground mt-1">Operação concluída com sucesso</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}