import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Delete, User, Nfc, Fingerprint } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function EmployeePinModal({ open, onClose, employees, onEmployeeIdentified, clientId }) {
  const [mode, setMode] = useState("tag"); // "tag" | "pin"
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [scanning, setScanning] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setPin("");
      setError("");
      setMode("tag");
      stopPolling();
    } else {
      startPolling();
    }
    return () => stopPolling();
  }, [open]);

  useEffect(() => {
    if (open && mode === "tag") {
      startPolling();
    } else {
      stopPolling();
    }
  }, [mode, open]);

  const startPolling = () => {
    stopPolling();
    setScanning(true);
    pollRef.current = setInterval(async () => {
      try {
        const scans = await base44.entities.TagScan.filter({
          client_id: clientId,
          consumed: false,
        }, "-created_date", 1);

        if (scans && scans.length > 0) {
          const scan = scans[0];

          // Ignora scans de registro (tag desconhecida)
          if (scan.employee_id === "__registro__") {
            await base44.entities.TagScan.update(scan.id, { consumed: true });
            triggerError("Tag não cadastrada. Use o PIN ou cadastre a tag.");
            return;
          }

          // Marca como consumida imediatamente
          await base44.entities.TagScan.update(scan.id, { consumed: true });

          // Valida se o funcionário está na lista ativa
          const emp = employees.find(
            (e) => e.id === scan.employee_id && e.active !== false
          );
          if (emp) {
            stopPolling();
            onEmployeeIdentified(emp);
          } else {
            triggerError("Tag não reconhecida ou funcionário inativo.");
          }
        }
      } catch {
        // silencioso
      }
    }, 1500);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setScanning(false);
  };

  const triggerError = (msg) => {
    setError(msg);
    setShake(true);
    setTimeout(() => {
      setError("");
      setShake(false);
    }, 2500);
  };

  const handleDigit = (d) => {
    if (pin.length >= 4) return;
    const newPin = pin + d;
    setPin(newPin);
    setError("");

    if (newPin.length === 4) {
      const matched = employees.find((e) => e.pin_code === newPin && e.active !== false);
      if (matched) {
        onEmployeeIdentified(matched);
        setPin("");
      } else {
        setShake(true);
        setError("PIN inválido. Tente novamente.");
        setTimeout(() => {
          setPin("");
          setShake(false);
        }, 800);
      }
    }
  };

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1));
    setError("");
  };

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Identificação do Funcionário
          </DialogTitle>
        </DialogHeader>

        {/* Toggle tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          <button
            onClick={() => setMode("tag")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
              mode === "tag"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Nfc className="w-4 h-4" /> Tag RFID
          </button>
          <button
            onClick={() => setMode("pin")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
              mode === "pin"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Fingerprint className="w-4 h-4" /> PIN
          </button>
        </div>

        <div className="space-y-5 pt-1">

          {/* TAG MODE */}
          {mode === "tag" && (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className={`w-28 h-28 rounded-3xl flex items-center justify-center transition-all ${
                scanning
                  ? "bg-primary/10 animate-pulse border-2 border-primary/40"
                  : "bg-muted border-2 border-border"
              }`}>
                <Nfc className={`w-14 h-14 ${scanning ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {scanning ? "Aguardando leitura da tag..." : "Leitor inativo"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Aproxime a tag RFID/NFC do leitor
                </p>
              </div>
              {error && (
                <p className={`text-xs text-destructive text-center bg-destructive/10 rounded-lg py-2 px-4 w-full ${shake ? "animate-bounce" : ""}`}>
                  {error}
                </p>
              )}
            </div>
          )}

          {/* PIN MODE */}
          {mode === "pin" && (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Digite seu código PIN de 4 dígitos
              </p>

              <div className={`flex justify-center gap-3 ${shake ? "animate-bounce" : ""}`}>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                      pin.length > i
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    {pin.length > i ? "●" : ""}
                  </div>
                ))}
              </div>

              {error && (
                <p className="text-xs text-destructive text-center bg-destructive/10 rounded-lg py-2">
                  {error}
                </p>
              )}

              <div className="grid grid-cols-3 gap-2">
                {digits.map((d, i) => {
                  if (d === "") return <div key={i} />;
                  if (d === "⌫") {
                    return (
                      <Button
                        key={i}
                        variant="outline"
                        className="h-14 rounded-xl text-lg font-medium"
                        onClick={handleDelete}
                      >
                        <Delete className="w-5 h-5" />
                      </Button>
                    );
                  }
                  return (
                    <Button
                      key={i}
                      variant="outline"
                      className="h-14 rounded-xl text-xl font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => handleDigit(d)}
                    >
                      {d}
                    </Button>
                  );
                })}
              </div>
            </>
          )}

          <Button variant="ghost" className="w-full rounded-xl text-muted-foreground" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}