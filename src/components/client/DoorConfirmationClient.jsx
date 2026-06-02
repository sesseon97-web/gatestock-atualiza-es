import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DoorOpen, Check, Loader2, Lock, DoorClosed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Accepts either a single `order` or an array `orders`
export default function DoorConfirmationClient({ order, orders: ordersProp, client, onConfirmed }) {
  const orders = ordersProp || (order ? [order] : []);
  const [step, setStep] = useState("idle"); // idle | opening | opened

  const handleConfirm = async () => {
    setStep("opening");

    // Envia comando de abertura para o armário
    if (client?.armario_id) {
      await base44.entities.Comando.create({
        armario_id: client.armario_id,
        comando: "ABRIR",
        executado: false,
      });
    }

    // Processa todos os pedidos
    const clientId = orders[0]?.client_id;
    const allAllocations = clientId ? await base44.entities.ClientAllocation.list() : [];

    await Promise.all(
      orders.map(async (o) => {
        await base44.entities.StockOrder.update(o.id, {
          status: "confirmado",
          door_opened: !!client?.armario_id,
          confirmed_at: new Date().toISOString(),
        });

        const alloc = allAllocations.find(
          (a) => a.client_id === o.client_id && a.product_id === o.product_id
        );
        if (alloc) {
          const newAllocQty = Math.max(0, (alloc.allocated_quantity || 0) - o.quantity);
          await base44.entities.ClientAllocation.update(alloc.id, { allocated_quantity: newAllocQty });
        }
      })
    );

    setStep("opened");
    toast.success("Retirada confirmada!");
    setTimeout(() => onConfirmed?.(), 2500);
  };

  const armarioConfigured = !!client?.armario_id;

  const summaryText = orders.length === 1
    ? `${orders[0].quantity}x ${orders[0].product_name}`
    : orders.map((o) => `${o.quantity}x ${o.product_name}`).join(", ");

  return (
    <div className="flex flex-col items-center justify-center py-6">
      <AnimatePresence mode="wait">
        {step === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-5 w-full"
          >
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
              <Lock className="w-10 h-10 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-foreground">Confirmar Retirada</h3>
              <p className="text-sm text-muted-foreground mt-1">{summaryText}</p>
            </div>

            {/* Armário status indicator */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium ${
              armarioConfigured ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
            }`}>
              <DoorOpen className="w-3.5 h-3.5" />
              {armarioConfigured ? `Armário: ${client.armario_id}` : "Sem armário configurado"}
            </div>

            <Button
              size="lg"
              onClick={handleConfirm}
              className="w-full h-14 text-base font-bold rounded-2xl bg-primary hover:bg-primary/90 shadow-xl shadow-primary/25 gap-3"
            >
              <DoorOpen className="w-6 h-6" />
              Confirmar e Abrir Armário
            </Button>
          </motion.div>
        )}

        {step === "opening" && (
          <motion.div
            key="opening"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-5"
          >
            <div className="w-20 h-20 rounded-3xl bg-accent/10 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-accent animate-spin" />
            </div>
            <p className="text-lg font-semibold text-foreground">Enviando comando...</p>
            {armarioConfigured && <p className="text-xs text-muted-foreground">Armário {client.armario_id}</p>}
          </motion.div>
        )}

        {step === "opened" && (
          <motion.div
            key="opened"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-5"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
              className="w-20 h-20 rounded-3xl bg-green-500/10 flex items-center justify-center"
            >
              <Check className="w-10 h-10 text-green-600" />
            </motion.div>
            <div className="text-center">
              <p className="text-xl font-bold text-green-600">Comando Enviado!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {armarioConfigured ? `Armário ${client.armario_id} será aberto` : "Retirada registrada"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}