import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Fingerprint, Nfc, Scan, X, CheckCircle2, Loader2 } from "lucide-react";

export default function EmployeeForm({ client, onClose }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [tagUid, setTagUid] = useState("");
  const [listeningUid, setListeningUid] = useState(false);
  const pollingRef = useRef(null);

  const handlePinChange = (v) => {
    if (/^\d{0,4}$/.test(v)) setPinCode(v);
  };

  const handleTagUidChange = (v) => {
    setTagUid(v.toUpperCase().slice(0, 20));
  };

  const startListening = () => {
    setListeningUid(true);
    setTagUid("");

    // Polling a cada 2s buscando TagScans com employee_id == "__registro__" não consumidos
    pollingRef.current = setInterval(async () => {
      try {
        const scans = await base44.entities.TagScan.filter(
          { employee_id: "__registro__", client_id: client.id, consumed: false },
          "-created_date",
          1
        );
        if (scans && scans.length > 0) {
          const scan = scans[0];
          // Marca como consumido
          await base44.entities.TagScan.update(scan.id, { consumed: true });
          setTagUid(scan.uid);
          setListeningUid(false);
          clearInterval(pollingRef.current);
          toast.success("UID capturado: " + scan.uid);
        }
      } catch (err) {
        // silencioso
      }
    }, 2000);
  };

  const stopListening = () => {
    setListeningUid(false);
    clearInterval(pollingRef.current);
  };

  // Limpa o polling ao desmontar
  useEffect(() => {
    return () => clearInterval(pollingRef.current);
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      return base44.entities.Employee.create({
        name,
        client_id: client.id,
        client_email: client.email,
        pin_code: pinCode || undefined,
        tag_uid: tagUid || undefined,
        active: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", client.id] });
      toast.success(`Funcionário "${name}" cadastrado com sucesso!`);
      onClose();
    },
    onError: (err) => {
      toast.error("Erro ao cadastrar funcionário: " + (err?.message || ""));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!pinCode && !tagUid) {
      toast.error("Informe ao menos um método de acesso: PIN ou UID da Tag.");
      return;
    }
    if (pinCode && pinCode.length !== 4) {
      toast.error("O PIN deve ter exatamente 4 dígitos.");
      return;
    }
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label>Nome do Funcionário *</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Ex: Carlos Silva"
          className="rounded-xl"
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label className="flex items-center gap-2">
          <Fingerprint className="w-4 h-4 text-primary" />
          Código PIN de Acesso (4 dígitos)
        </Label>
        <Input
          value={pinCode}
          onChange={(e) => handlePinChange(e.target.value)}
          placeholder="Ex: 1234"
          className="rounded-xl font-mono tracking-widest text-center text-lg"
          maxLength={4}
          inputMode="numeric"
        />
        <p className="text-xs text-muted-foreground">
          Opcional se usar Tag RFID/NFC.
        </p>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs text-muted-foreground">
          <span className="bg-background px-2">ou</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="flex items-center gap-2">
          <Nfc className="w-4 h-4 text-primary" />
          UID da Tag RFID/NFC
        </Label>

        {/* Botão de captura automática */}
        {!listeningUid ? (
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl gap-2 border-dashed border-primary/50 text-primary hover:bg-primary/5"
            onClick={startListening}
          >
            <Scan className="w-4 h-4" />
            Registrar via leitura do hardware
          </Button>
        ) : (
          <div className="rounded-xl border border-primary bg-primary/5 p-4 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-sm font-medium text-primary">Aguardando leitura da tag...</p>
            <p className="text-xs text-muted-foreground">Aproxime a tag RFID/NFC do leitor</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={stopListening}
              className="gap-1 text-muted-foreground text-xs"
            >
              <X className="w-3 h-3" /> Cancelar
            </Button>
          </div>
        )}

        {/* Campo manual + indicador de sucesso */}
        <div className="relative">
          <Input
            value={tagUid}
            onChange={(e) => handleTagUidChange(e.target.value)}
            placeholder="Ou digite manualmente: A1B2C3D4"
            className="rounded-xl font-mono tracking-widest text-center text-lg uppercase pr-9"
            maxLength={20}
            disabled={listeningUid}
          />
          {tagUid && !listeningUid && (
            <CheckCircle2 className="w-4 h-4 text-green-500 absolute right-3 top-1/2 -translate-y-1/2" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Use o botão acima para capturar automaticamente via hardware, ou digite o código manualmente.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">Cancelar</Button>
        <Button
          type="submit"
          disabled={mutation.isPending || !name.trim()}
          className="rounded-xl"
        >
          {mutation.isPending ? "Cadastrando..." : "Cadastrar Funcionário"}
        </Button>
      </div>
    </form>
  );
}