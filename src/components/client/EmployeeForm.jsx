import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Fingerprint } from "lucide-react";

export default function EmployeeForm({ client, onClose }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [pinCode, setPinCode] = useState("");

  const handlePinChange = (v) => {
    if (/^\d{0,4}$/.test(v)) setPinCode(v);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      return base44.entities.Employee.create({
        name,
        client_id: client.id,
        client_email: client.email,
        pin_code: pinCode,
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
    if (pinCode.length !== 4) {
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
          Código PIN de Acesso * (4 dígitos)
        </Label>
        <Input
          value={pinCode}
          onChange={(e) => handlePinChange(e.target.value)}
          required
          placeholder="Ex: 1234"
          className="rounded-xl font-mono tracking-widest text-center text-lg"
          maxLength={4}
          inputMode="numeric"
        />
        <p className="text-xs text-muted-foreground">
          O funcionário usará este PIN para se identificar antes de cada retirada.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">Cancelar</Button>
        <Button
          type="submit"
          disabled={mutation.isPending || !name.trim() || pinCode.length !== 4}
          className="rounded-xl"
        >
          {mutation.isPending ? "Cadastrando..." : "Cadastrar Funcionário"}
        </Button>
      </div>
    </form>
  );
}