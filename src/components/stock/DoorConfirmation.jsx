import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Auto-confirms the order immediately (no pending state)
export default function DoorConfirmation({ order, onConfirmed }) {
  const [step, setStep] = useState("confirming"); // confirming | done

  useEffect(() => {
    const confirm = async () => {
      await base44.entities.StockOrder.update(order.id, {
        status: "confirmado",
        door_opened: false,
        confirmed_at: new Date().toISOString(),
      });

      // Atualiza a alocação do cliente (não o estoque geral)
      if (order.client_id) {
        const allAllocations = await base44.entities.ClientAllocation.list();
        const alloc = allAllocations.find(
          (a) => a.client_id === order.client_id && a.product_id === order.product_id
        );
        if (alloc) {
          const newQty = order.type === "retirada"
            ? Math.max(0, (alloc.allocated_quantity || 0) - order.quantity)
            : (alloc.allocated_quantity || 0) + order.quantity;
          await base44.entities.ClientAllocation.update(alloc.id, { allocated_quantity: newQty });
        }
      }

      setStep("done");
      toast.success(order.type === "retirada" ? "Retirada confirmada!" : "Devolução confirmada!");
      setTimeout(() => onConfirmed?.(), 1800);
    };

    confirm();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-10">
      <AnimatePresence mode="wait">
        {step === "confirming" && (
          <motion.div
            key="confirming"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-5"
          >
            <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
            <p className="text-lg font-semibold text-foreground">Confirmando pedido...</p>
          </motion.div>
        )}

        {step === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-5"
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
              <p className="text-xl font-bold text-green-600">Pedido Confirmado!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {order.type === "retirada"
                  ? `${order.quantity}x ${order.product_name} retirado`
                  : `${order.quantity}x ${order.product_name} devolvido`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}