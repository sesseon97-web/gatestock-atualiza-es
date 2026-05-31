import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { UserCheck, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function AssignClientsModal({ rep, open, onClose }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  // Clientes já atribuídos a este representante
  const assignedIds = new Set(
    clients.filter((c) => c.representative_id === rep.id).map((c) => c.id)
  );

  const [selected, setSelected] = useState(() => new Set(assignedIds));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises = clients.map((c) => {
        const wasAssigned = assignedIds.has(c.id);
        const isSelected = selected.has(c.id);
        if (isSelected && !wasAssigned) {
          return base44.entities.Client.update(c.id, {
            representative_id: rep.id,
            representative_name: rep.name,
          });
        } else if (!isSelected && wasAssigned) {
          return base44.entities.Client.update(c.id, {
            representative_id: "",
            representative_name: "",
          });
        }
        return null;
      });
      await Promise.all(promises.filter(Boolean));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Clientes atualizados com sucesso!");
      onClose();
    },
  });

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = clients.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary" />
            Clientes de {rep.name}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 py-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente encontrado</p>
          ) : (
            filtered.map((client) => (
              <label
                key={client.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selected.has(client.id)}
                  onCheckedChange={() => toggle(client.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{client.name}</p>
                  {client.company && (
                    <p className="text-xs text-muted-foreground truncate">{client.company}</p>
                  )}
                  {client.representative_id && client.representative_id !== rep.id && (
                    <p className="text-xs text-amber-600 mt-0.5">
                      Atribuído a: {client.representative_name}
                    </p>
                  )}
                </div>
              </label>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="rounded-xl"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Salvando..." : `Salvar (${selected.size} selecionados)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}