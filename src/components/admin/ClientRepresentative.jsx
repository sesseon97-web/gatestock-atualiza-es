import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ClientRepresentative({ client }) {
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const representatives = users.filter((u) => u.role === "representante");

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.update(client.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Representante atualizado!");
    },
  });

  const handleSelect = (repId) => {
    const rep = representatives.find((r) => r.id === repId);
    updateMutation.mutate({
      representative_id: repId,
      representative_name: rep?.full_name || rep?.email || "",
    });
  };

  const handleRemove = () => {
    updateMutation.mutate({ representative_id: "", representative_name: "" });
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
        <UserCheck className="w-4 h-4 text-primary" /> Representante Responsável
      </p>

      {representatives.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum usuário com role "representante" cadastrado.</p>
      ) : (
        <div className="flex items-center gap-2">
          <Select value={client.representative_id || ""} onValueChange={handleSelect}>
            <SelectTrigger className="flex-1 h-9 rounded-xl text-sm">
              <SelectValue placeholder="Selecionar representante..." />
            </SelectTrigger>
            <SelectContent>
              {representatives.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.full_name || r.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {client.representative_id && (
            <Button
              variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive"
              onClick={handleRemove}
              title="Remover representante"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {client.representative_name && (
        <p className="text-xs text-muted-foreground">
          Atual: <span className="font-medium text-foreground">{client.representative_name}</span>
        </p>
      )}
    </div>
  );
}