import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Wifi, WifiOff, Plus, Trash2, Clock, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { format } from "date-fns";
import { useAuth } from "@/lib/AuthContext";

const DEV_EMAIL = "sesseon97@gmail.com";

export default function Armarios() {
  const { user } = useAuth();
  const isDev = user?.email === DEV_EMAIL;
  const queryClient = useQueryClient();
  const [novoId, setNovoId] = useState("");
  const [novoNome, setNovoNome] = useState("");

  const { data: armarios = [], isLoading } = useQuery({
    queryKey: ["armarios"],
    queryFn: () => base44.entities.Armario.list("-ultima_comunicacao"),
    refetchInterval: 10000,
  });

  const criarMutation = useMutation({
    mutationFn: (data) => base44.entities.Armario.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["armarios"] });
      setNovoId("");
      setNovoNome("");
    },
  });

  const deletarMutation = useMutation({
    mutationFn: (id) => base44.entities.Armario.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["armarios"] }),
  });

  const handleCriar = () => {
    if (!novoId.trim()) return;
    criarMutation.mutate({
      identificador: novoId.trim().toUpperCase(),
      nome: novoNome.trim() || novoId.trim().toUpperCase(),
      online: false,
    });
  };

  const isOnline = (armario) => {
    if (!armario.ultima_comunicacao) return false;
    const diff = Date.now() - new Date(armario.ultima_comunicacao).getTime();
    return diff < 60000; // considera online se comunicou nos últimos 60s
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Armários</h1>
        <p className="text-muted-foreground mt-1">Gerenciamento de hardware ESP32</p>
      </div>

      {/* Aviso de desenvolvedor */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-5 py-4">
        <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-800">Área reservada ao desenvolvedor</p>
          <p className="text-sm text-amber-700 mt-0.5">
            Esta tela é destinada exclusivamente à configuração técnica dos armários ESP32.
            Alterações incorretas podem impedir o funcionamento do hardware.
          </p>
        </div>
      </div>

      {/* Adicionar armário — apenas desenvolvedor */}
      {isDev ? (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-foreground">Adicionar Armário</h2>
          <div className="flex gap-3 flex-wrap">
            <Input
              placeholder="Identificador (ex: ARMARIO001)"
              value={novoId}
              onChange={(e) => setNovoId(e.target.value)}
              className="max-w-xs"
            />
            <Input
              placeholder="Nome amigável (opcional)"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={handleCriar} disabled={!novoId.trim() || criarMutation.isPending}>
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-muted border border-border rounded-xl px-5 py-4">
          <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <p className="text-sm text-muted-foreground">Apenas o desenvolvedor pode adicionar ou remover armários.</p>
        </div>
      )}

      {/* Lista de armários */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : armarios.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
          <Wifi className="w-10 h-10 mx-auto mb-3 opacity-30" />
          Nenhum armário cadastrado
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {armarios.map((armario) => {
            const online = isOnline(armario);
            return (
              <div key={armario.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">{armario.identificador}</span>
                  <Badge className={online ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}>
                    {online ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
                    {online ? "Online" : "Offline"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{armario.nome}</p>
                <p className="text-xs font-mono bg-muted text-muted-foreground rounded px-2 py-1 select-all">ID: {armario.id}</p>
                {armario.versao && (
                  <p className="text-xs text-muted-foreground">Firmware: v{armario.versao}</p>
                )}
                {armario.ultima_comunicacao && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(armario.ultima_comunicacao), "dd/MM/yyyy HH:mm:ss")}
                  </p>
                )}
                {isDev && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
                    onClick={() => deletarMutation.mutate(armario.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Remover
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}