import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Wifi } from "lucide-react";

export default function ClientForm({ client, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: client?.name || "",
    email: client?.email || "",
    company: client?.company || "",
    ip_address: client?.ip_address || "",
    ip_port: client?.ip_port || "",
    ip_endpoint: client?.ip_endpoint || "/open",
    active: client?.active ?? true,
    notes: client?.notes || "",
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data) =>
      client
        ? base44.entities.Client.update(client.id, data)
        : base44.entities.Client.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success(client ? "Cliente atualizado!" : "Cliente criado!");
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const fullUrl = form.ip_address
    ? `http://${form.ip_address}${form.ip_port ? `:${form.ip_port}` : ""}${form.ip_endpoint || ""}`
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Nome *</Label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} required className="rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label>Empresa / Setor</Label>
          <Input value={form.company} onChange={(e) => set("company", e.target.value)} className="rounded-xl" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Email de Login *</Label>
        <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required className="rounded-xl" placeholder="mesmo email do usuário no sistema" />
        <p className="text-xs text-muted-foreground">Deve ser o mesmo email cadastrado como usuário no sistema.</p>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/30">
        <div className="flex items-center gap-2 mb-1">
          <Wifi className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Configuração de IP / Atuador</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Endereço IP</Label>
            <Input value={form.ip_address} onChange={(e) => set("ip_address", e.target.value)} placeholder="192.168.1.10" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label>Porta</Label>
            <Input value={form.ip_port} onChange={(e) => set("ip_port", e.target.value)} placeholder="8080" className="rounded-xl" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Endpoint (rota)</Label>
          <Input value={form.ip_endpoint} onChange={(e) => set("ip_endpoint", e.target.value)} placeholder="/open" className="rounded-xl" />
        </div>
        {fullUrl && (
          <p className="text-xs text-primary font-mono bg-primary/5 px-3 py-2 rounded-lg">
            {fullUrl}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Observações</Label>
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="rounded-xl" rows={2} />
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} />
        <Label>Cliente ativo</Label>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending} className="rounded-xl">
          {mutation.isPending ? "Salvando..." : client ? "Salvar" : "Criar Cliente"}
        </Button>
      </div>
    </form>
  );
}