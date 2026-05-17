import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Wifi, Eye, EyeOff, UserPlus } from "lucide-react";

export default function ClientForm({ client, onClose }) {
  const queryClient = useQueryClient();
  const nameToEmail = (name) =>
    name.trim().toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "") + "@adifer-app.com";

  const [form, setForm] = useState({
    name: client?.name || "",
    email: client?.email || "",
    password: "",
    company: client?.company || "",
    ip_address: client?.ip_address || "",
    ip_port: client?.ip_port || "",
    ip_endpoint: client?.ip_endpoint || "/open",
    active: client?.active ?? true,
    notes: client?.notes || "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleNameChange = (name) => {
    setForm((f) => ({ ...f, name, email: client ? f.email : nameToEmail(name) }));
  };

  const mutation = useMutation({
    mutationFn: async (data) => {
      const { password, ...clientData } = data;
      if (client) {
        // Se informou nova senha, recria o registro de auth (ignora se já existir)
        if (password) {
          try {
            await base44.auth.register({ email: clientData.email, password });
          } catch (err) {
            const msg = (err?.message || "").toLowerCase();
            if (!msg.includes("already") && !msg.includes("exist") && !msg.includes("registered")) {
              throw err;
            }
          }
        }
        return base44.entities.Client.update(client.id, clientData);
      } else {
        // Tenta registrar o usuário; ignora erro se já existir
        try {
          await base44.auth.register({ email: clientData.email, password });
        } catch (err) {
          const msg = (err?.message || "").toLowerCase();
          if (!msg.includes("already") && !msg.includes("exist") && !msg.includes("registered")) {
            throw err;
          }
        }
        return base44.entities.Client.create(clientData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success(client ? "Cliente atualizado!" : "Cliente criado com acesso ao sistema!");
      onClose();
    },
    onError: (err) => {
      toast.error("Erro ao salvar cliente: " + (err?.message || ""));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!client && !form.password) {
      toast.error("Informe a senha de acesso do cliente.");
      return;
    }
    mutation.mutate(form);
  };

  const fullUrl = form.ip_address
    ? `http://${form.ip_address}${form.ip_port ? `:${form.ip_port}` : ""}${form.ip_endpoint || ""}`
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Nome * <span className="text-muted-foreground font-normal">(usado como login)</span></Label>
          <Input value={form.name} onChange={(e) => handleNameChange(e.target.value)} required className="rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label>Empresa / Setor</Label>
          <Input value={form.company} onChange={(e) => set("company", e.target.value)} className="rounded-xl" />
        </div>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/30">
        <div className="flex items-center gap-2 mb-1">
          <UserPlus className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Acesso ao Sistema</span>
        </div>
        <div className="space-y-1.5">
          <Label>{client ? "Nova Senha (opcional)" : "Senha de Acesso *"}</Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required={!client}
              className="rounded-xl pr-10"
              placeholder={client ? "Deixe em branco para não alterar" : "Defina a senha do cliente"}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {client
              ? <>Login: <span className="font-mono text-primary">{client.email}</span></>
              : <>O cliente acessa com o <strong>Nome</strong> e esta senha.{form.name && <> Login: <span className="font-mono text-primary">{nameToEmail(form.name)}</span></>}</>
            }
          </p>
        </div>
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