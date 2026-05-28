import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Pencil, Trash2, Wifi, Package, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ClientForm from "@/components/admin/ClientForm";
import ClientAllocations from "@/components/admin/ClientAllocations";
import ClientRepresentative from "@/components/admin/ClientRepresentative";
import { toast } from "sonner";

export default function Clients() {
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [expandedClient, setExpandedClient] = useState(null);
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente excluído");
    },
  });

  const handleEdit = (client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingClient(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            Clientes
          </h1>
          <p className="text-muted-foreground mt-1">{clients.length} clientes cadastrados</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Novo Cliente
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum cliente cadastrado</p>
          <Button className="mt-4 rounded-xl" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar Cliente
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <div key={client.id} className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="p-5 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-lg">
                    {client.name?.[0]?.toUpperCase() || "C"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{client.name}</h3>
                      <Badge variant={client.active ? "default" : "secondary"} className="text-xs">
                        {client.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{client.email}</p>
                    {client.company && <p className="text-xs text-muted-foreground">{client.company}</p>}
                    <p className="text-xs text-muted-foreground/50 font-mono mt-0.5">ID: {client.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {client.ip_address ? (
                    <Badge variant="outline" className="gap-1 text-xs text-green-600 border-green-300">
                      <Wifi className="w-3 h-3" /> {client.ip_address}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                      <Wifi className="w-3 h-3" /> Sem IP
                    </Badge>
                  )}
                  <Button
                    variant="ghost" size="sm"
                    className="gap-1 text-xs rounded-lg"
                    onClick={() => setExpandedClient(expandedClient === client.id ? null : client.id)}
                  >
                    <Package className="w-3.5 h-3.5" /> Produtos
                    {expandedClient === client.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(client)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                    onClick={() => deleteMutation.mutate(client.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              {expandedClient === client.id && (
                <div className="border-t border-border bg-muted/30 p-5 space-y-6">
                  <ClientRepresentative client={client} />
                  <div className="border-t border-border pt-4">
                    <ClientAllocations client={client} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <ClientForm client={editingClient} onClose={handleClose} />
        </DialogContent>
      </Dialog>
    </div>
  );
}