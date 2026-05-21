import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Wifi, Eye, EyeOff, UserPlus, KeyRound } from "lucide-react";

export default function ClientForm({ client, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: client?.name || "",
    email: client?.email || "",
    password: "",
    app_username: client?.app_username || "",
    app_password: client?.app_password || "",
    company: client?.company || "",
    ip_address: client?.ip_address || "",
    ip_port: client?.ip_port || "",
    ip_endpoint: client?.ip_endpoint || "",
    active: client?.active ?? true,
    notes: client?.notes || "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showAppPassword, setShowAppPassword] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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

  // Monta URL: se ip_address já for URL completa, usa direto; senão combina os campos
  const fullUrl = form.ip_address
    ? (form.ip_address.startsWith("http") ? form.ip_address : `http://${form.ip_address}${form.ip_port ? `:${form.ip_port}` : ""}${form.ip_endpoint || ""}`)
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

      <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/30">
        <div className="flex items-center gap-2 mb-1">
          <UserPlus className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Acesso ao Sistema (Dashboard)</span>
        </div>
        <div className="space-y-1.5">
          <Label>E-mail de Acesso *</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            required
            disabled={!!client}
            className="rounded-xl"
            placeholder="email@empresa.com"
          />
          {client && (
            <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado após o cadastro.</p>
          )}
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
            O cliente acessa o dashboard com este e-mail e senha.
          </p>
        </div>
      </div>

      {/* Credenciais do segundo login interno */}
      <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/30">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Login Interno do Cliente</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Usuário do App</Label>
            <Input
              value={form.app_username}
              onChange={(e) => set("app_username", e.target.value)}
              placeholder="Ex: empresa_abc"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Senha do App</Label>
            <div className="relative">
              <Input
                type={showAppPassword ? "text" : "password"}
                value={form.app_password}
                onChange={(e) => set("app_password", e.target.value)}
                placeholder="Senha de acesso"
                className="rounded-xl pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowAppPassword((v) => !v)}
              >
                {showAppPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          O cliente usará essas credenciais para acessar o dashboard após o login principal.
        </p>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/30">
        <div className="flex items-center gap-2 mb-1">
          <Wifi className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Configuração do Atuador (Porta)</span>
        </div>
        <div className="space-y-1.5">
          <Label>URL completa do atuador</Label>
          <Input
            value={form.ip_address}
            onChange={(e) => set("ip_address", e.target.value)}
            placeholder="http://192.168.1.10/abrir"
            className="rounded-xl font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Cole a URL completa que aciona a porta. Ex: <span className="font-mono">http://192.168.16.207/abrir</span>
          </p>
        </div>
        {fullUrl && (
          <p className="text-xs text-primary font-mono bg-primary/5 px-3 py-2 rounded-lg">
            ✓ {fullUrl}
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