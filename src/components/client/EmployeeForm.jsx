import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Fingerprint, Nfc } from "lucide-react";

export default function EmployeeForm({ client, onClose }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [tagUid, setTagUid] = useState("");

  const handlePinChange = (v) => {
    if (/^\d{0,4}$/.test(v)) setPinCode(v);
  };

  const handleTagUidChange = (v) => {
    // Aceita hex ou alfanumérico, uppercase
    setTagUid(v.toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 20));
  };

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
        <Input
          value={tagUid}
          onChange={(e) => handleTagUidChange(e.target.value)}
          placeholder="Ex: A1B2C3D4"
          className="rounded-xl font-mono tracking-widest text-center text-lg uppercase"
          maxLength={20}
        />
        <p className="text-xs text-muted-foreground">
          Código hexadecimal da tag. O leitor enviará este código automaticamente.
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