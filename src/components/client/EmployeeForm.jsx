import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const nameToEmail = (name) =>
  name.trim().toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "") + "@adifer.local";

// Senha padrão sem necessidade de o funcionário configurar
const DEFAULT_PASSWORD = "funcionario@adifer";

export default function EmployeeForm({ client, onClose }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const email = nameToEmail(name);
      // Cria o login do funcionário (sem senha definida pelo usuário)
      try {
        await base44.auth.register({ email, password: DEFAULT_PASSWORD });
      } catch (err) {
        const msg = err?.message || "";
        // Ignora se já existir
        if (!msg.toLowerCase().includes("already") && !msg.toLowerCase().includes("exist")) {
          throw err;
        }
      }
      // Cria o registro do funcionário
      return base44.entities.Employee.create({
        name,
        client_id: client.id,
        client_email: client.email,
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
        {name.trim() && (
          <p className="text-xs text-muted-foreground">
            Login gerado: <span className="font-mono text-primary">{nameToEmail(name)}</span>
          </p>
        )}
      </div>

      <div className="rounded-xl bg-muted/40 border border-border p-3 text-xs text-muted-foreground space-y-1">
        <p>O funcionário acessa o sistema com:</p>
        <p>• <strong>Login:</strong> {name.trim() ? nameToEmail(name) : "nome.gerado@adifer.local"}</p>
        <p>• <strong>Senha:</strong> <span className="font-mono">{DEFAULT_PASSWORD}</span></p>
        <p className="text-amber-600">O funcionário pode trocar a senha após o primeiro acesso.</p>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending || !name.trim()} className="rounded-xl">
          {mutation.isPending ? "Cadastrando..." : "Cadastrar Funcionário"}
        </Button>
      </div>
    </form>
  );
}