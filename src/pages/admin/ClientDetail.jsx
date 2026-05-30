import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Building2, Mail, Wifi, FileText, User, Package,
  AlertTriangle, Upload, X, ExternalLink, Pencil, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ClientForm from "@/components/admin/ClientForm";
import ClientAllocations from "@/components/admin/ClientAllocations";
import ClientRepresentative from "@/components/admin/ClientRepresentative";
import { toast } from "sonner";

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium text-foreground break-all">{value}</span>
    </div>
  );
}

function ContractSection({ client }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Client.update(client.id, { contract_url: file_url });
      setUploading(false);
      return file_url;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client", client.id] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Contrato anexado com sucesso!");
    },
    onError: () => {
      setUploading(false);
      toast.error("Erro ao enviar contrato.");
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => base44.entities.Client.update(client.id, { contract_url: "" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client", client.id] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Contrato removido.");
    },
  });

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" /> Contrato
      </h3>

      {client.contract_url ? (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl p-4">
          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Contrato anexado</p>
            <p className="text-xs text-muted-foreground truncate">{client.contract_url}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline" size="sm" className="rounded-lg gap-1 text-xs"
              onClick={() => window.open(client.contract_url, "_blank")}
            >
              <ExternalLink className="w-3 h-3" /> Abrir
            </Button>
            <Button
              variant="ghost" size="icon" className="h-8 w-8 text-destructive"
              onClick={() => removeMutation.mutate()}
              disabled={removeMutation.isPending}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full h-24 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <Upload className="w-5 h-5" />
            <span className="text-xs">{uploading ? "Enviando..." : "Clique para anexar contrato (PDF, DOC, imagem)"}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function AllocationsTable({ client }) {
  const { data: allocations = [] } = useQuery({
    queryKey: ["allocations", client.id],
    queryFn: () => base44.entities.ClientAllocation.filter({ client_id: client.id }),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  if (allocations.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 text-xs text-muted-foreground font-medium px-3 pb-1">
        <span className="col-span-4">Produto</span>
        <span className="col-span-2 text-center">Alocado</span>
        <span className="col-span-2 text-center">Estoque</span>
        <span className="col-span-2 text-center">Qtd Mín.</span>
        <span className="col-span-2 text-center">Preço R$</span>
      </div>
      {allocations.map((alloc) => {
        const prod = products.find((p) => p.id === alloc.product_id);
        const stock = prod?.quantity || 0;
        const lowStock = (alloc.min_quantity || 0) > 0 && stock <= (alloc.min_quantity || 0);
        return (
          <div key={alloc.id} className="grid grid-cols-12 items-center bg-muted/40 rounded-xl border border-border px-3 py-3 text-sm">
            <div className="col-span-4 flex items-center gap-2 min-w-0">
              {prod?.image_url ? (
                <img src={prod.image_url} alt={alloc.product_name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-primary" />
                </div>
              )}
              <span className="font-medium truncate">{alloc.product_name}</span>
            </div>
            <span className="col-span-2 text-center font-medium">{alloc.allocated_quantity} {prod?.unit || "un."}</span>
            <span className={`col-span-2 text-center font-medium flex items-center justify-center gap-1 ${lowStock ? "text-amber-600" : ""}`}>
              {lowStock && <AlertTriangle className="w-3 h-3" />}
              {stock}
            </span>
            <span className="col-span-2 text-center text-muted-foreground">{alloc.min_quantity || "-"}</span>
            <span className="col-span-2 text-center font-semibold text-primary">
              {alloc.sale_price ? `R$ ${Number(alloc.sale_price).toFixed(2)}` : "-"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showEdit, setShowEdit] = useState(false);

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const list = await base44.entities.Client.filter({ id });
      return list[0] || null;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Cliente não encontrado.</p>
        <Button className="mt-4 rounded-xl" onClick={() => navigate("/clientes")}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate("/clientes")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-xl flex-shrink-0">
          {client.name?.[0]?.toUpperCase() || "C"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
            <Badge variant={client.active ? "default" : "secondary"} className="text-xs">
              {client.active ? "Ativo" : "Inativo"}
            </Badge>
          </div>
          {client.company && <p className="text-sm text-muted-foreground">{client.company}</p>}
        </div>
        <Button variant="outline" className="rounded-xl gap-2" onClick={() => setShowEdit(true)}>
          <Pencil className="w-4 h-4" /> Editar Cliente
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna esquerda */}
        <div className="space-y-4">
          {/* Dados do cliente */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-1">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-primary" /> Dados do Cliente
            </h3>
            <InfoRow label="Nome" value={client.name} />
            <InfoRow label="E-mail" value={client.email} />
            <InfoRow label="Empresa" value={client.company} />
            <InfoRow label="Usuário App" value={client.app_username} />
            <InfoRow label="Observações" value={client.notes} />
          </div>

          {/* Atuador */}
          {client.ip_address && (
            <div className="bg-card rounded-2xl border border-border p-5 space-y-1">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                <Wifi className="w-4 h-4 text-primary" /> Atuador (Porta)
              </h3>
              <InfoRow label="URL" value={client.ip_address} />
            </div>
          )}

          {/* Representante */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <ClientRepresentative client={client} />
          </div>

          {/* Contrato */}
          <ContractSection client={client} />
        </div>

        {/* Coluna direita — produtos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> Produtos Alocados
            </h3>
            <AllocationsTable client={client} />
          </div>

          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> Gerenciar Alocações
            </h3>
            <ClientAllocations client={client} />
          </div>
        </div>
      </div>

      {/* Dialog editar */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <ClientForm client={client} onClose={() => setShowEdit(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}