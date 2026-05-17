import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Delete, User } from "lucide-react";

export default function EmployeePinModal({ open, onClose, employees, onEmployeeIdentified }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!open) {
      setPin("");
      setError("");
    }
  }, [open]);

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

        <div className="space-y-6 pt-2">
          <p className="text-sm text-muted-foreground text-center">
            Digite seu código PIN de 4 dígitos
          </p>

          {/* PIN display */}
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

          {/* Numpad */}
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

          <Button variant="ghost" className="w-full rounded-xl text-muted-foreground" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}