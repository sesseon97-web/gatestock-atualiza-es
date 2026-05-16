import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function CategoryManager({ onClose }) {
  const [newName, setNewName] = useState("");
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.Category.list("name"),
  });

  const createMutation = useMutation({
    mutationFn: (name) => base44.entities.Category.create({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setNewName("");
      toast.success("Categoria adicionada!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Category.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoria removida!");
    },
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate(newName.trim());
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nova categoria..."
          className="rounded-xl"
        />
        <Button type="submit" disabled={createMutation.isPending} className="rounded-xl shrink-0">
          <Plus className="w-4 h-4" />
        </Button>
      </form>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma categoria cadastrada.</p>
        )}
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/50 border border-border">
            <span className="text-sm font-medium">{cat.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:bg-destructive/10"
              onClick={() => deleteMutation.mutate(cat.id)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-1">
        <Button variant="outline" onClick={onClose} className="rounded-xl">Fechar</Button>
      </div>
    </div>
  );
}