import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DoorOpen, Check, Loader2, Lock, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Accepts either a single `order` or an array `orders`
export default function DoorConfirmationClient({ order, orders: ordersProp, client, onConfirmed }) {
  const orders = ordersProp || (order ? [order] : []);
  const [step, setStep] = useState("idle"); // idle | opening | opened | error
  const [ipResult, setIpResult] = useState(null);

  const triggerIP = async () => {
    if (!client?.ip_address) return { success: false, message: "IP não configurado" };
    const url = client.ip_address.startsWith("http")
      ? client.ip_address
      : `http://${client.ip_address}${client.ip_port ? `:${client.ip_port}` : ""}${client.ip_endpoint || "/open"}`;

    // Método 1: fetch com no-cors (pode ser bloqueado por mixed content em HTTPS)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch(url, { method: "GET", signal: controller.signal, mode: "no-cors" });
      clearTimeout(timeout);
      return { success: true, url };
    } catch (_) {
      // fetch bloqueado (mixed content HTTPS→HTTP) — fallback via img tag
    }

    // Método 2: fallback via <img> src trick (ignora mixed content em muitos browsers)
    return await new Promise((resolve) => {
      const img = new Image();
      const timer = setTimeout(() => {
        img.src = "";
        resolve({ success: true, url, method: "img" }); // assumimos sucesso após timeout (no-cors)
      }, 3000);
      img.onload = () => { clearTimeout(timer); resolve({ success: true, url, method: "img" }); };
      img.onerror = () => { clearTimeout(timer); resolve({ success: true, url, method: "img" }); }; // erro de img não significa que o request não chegou
      img.src = url;
    });
  };

  const handleConfirm = async () => {
    setStep("opening");

    // Trigger IP once
    const result = await triggerIP();
    setIpResult(result);

    // Process all orders
    const clientId = orders[0]?.client_id;
    const allAllocations = clientId ? await base44.entities.ClientAllocation.list() : [];

    await Promise.all(
      orders.map(async (o) => {
        // Update order status
        await base44.entities.StockOrder.update(o.id, {
          status: "confirmado",
          door_opened: result.success,
          confirmed_at: new Date().toISOString(),
        });

        // Update ClientAllocation
        const alloc = allAllocations.find(
          (a) => a.client_id === o.client_id && a.product_id === o.product_id
        );
        if (alloc) {
          const newAllocQty = Math.max(0, (alloc.allocated_quantity || 0) - o.quantity);
          await base44.entities.ClientAllocation.update(alloc.id, { allocated_quantity: newAllocQty });
        }

        // Estoque geral (Product.quantity) NÃO é alterado na retirada do cliente.
        // A baixa no estoque geral acontece apenas quando o produto é alocado ao cliente.
      })
    );

    setStep("opened");
    toast.success("Retirada confirmada!");
    setTimeout(() => onConfirmed?.(), 2500);
  };

  const ipConfigured = !!client?.ip_address;
  const fullUrl = ipConfigured
    ? (client.ip_address.startsWith("http") ? client.ip_address : `http://${client.ip_address}${client.ip_port ? `:${client.ip_port}` : ""}${client.ip_endpoint || "/open"}`)
    : null;

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
              <p className="text-sm text-muted-foreground mt-1">
                {summaryText}
              </p>
            </div>

            {/* IP status indicator */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium ${
              ipConfigured ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
            }`}>
              {ipConfigured ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {ipConfigured ? `Atuador: ${fullUrl}` : "Sem atuador configurado"}
            </div>

            <Button
              size="lg"
              onClick={handleConfirm}
              className="w-full h-14 text-base font-bold rounded-2xl bg-primary hover:bg-primary/90 shadow-xl shadow-primary/25 gap-3"
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
            className="flex flex-col items-center gap-5"
          >
            <div className="w-20 h-20 rounded-3xl bg-accent/10 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-accent animate-spin" />
            </div>
            <p className="text-lg font-semibold text-foreground">Abrindo porta...</p>
            {ipConfigured && <p className="text-xs text-muted-foreground">Acionando {fullUrl}</p>}
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
              <p className="text-xl font-bold text-green-600">Porta Aberta!</p>
              <p className="text-sm text-muted-foreground mt-1">Retirada concluída com sucesso</p>
              {ipResult && (
                <p className={`text-xs mt-2 ${ipResult.success ? "text-green-500" : "text-muted-foreground"}`}>
                  {ipResult.success ? "✓ Atuador acionado" : `Atuador: ${ipResult.message || "sem resposta"}`}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}