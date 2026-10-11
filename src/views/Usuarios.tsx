"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Trash2, Shield, ShieldCheck, Mail, User } from "lucide-react";

interface AllowedUser {
  id: number;
  email: string;
  name: string | null;
  is_admin: number;
  created_at: string;
}

export default function Usuarios() {
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/allowed-users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else if (res.status === 403) {
        setError("Acesso restrito a administradores");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async () => {
    if (!newEmail.trim()) {
      alert("Por favor, informe o email do usuário");
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      const res = await fetch("/api/allowed-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: newEmail.trim(), 
          name: newName.trim() || null,
          is_admin: false
        }),
      });
      
      if (res.ok) {
        setNewEmail("");
        setNewName("");
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao adicionar usuário");
      }
    } catch (err) {
      console.error("Error adding user:", err);
      alert("Erro ao adicionar usuário");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id: number, email: string) => {
    if (!confirm(`Tem certeza que deseja remover o acesso de ${email}?`)) return;

    try {
      const res = await fetch(`/api/allowed-users/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao excluir usuário");
      }
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Erro ao excluir usuário");
    }
  };

  const handleToggleAdmin = async (user: AllowedUser) => {
    const newIsAdmin = user.is_admin === 0;
    
    try {
      const res = await fetch(`/api/allowed-users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: user.name,
          is_admin: newIsAdmin
        }),
      });
      
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao atualizar usuário");
      }
    } catch (err) {
      console.error("Error updating user:", err);
      alert("Erro ao atualizar usuário");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-500/10 border-red-500/30">
        <CardContent className="p-6 text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-400">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-emerald-400" />
        <h2 className="text-xl font-semibold text-white">Usuários Autorizados</h2>
      </div>

      {/* Add User Form */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Novo Usuário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-gray-400">
            Adicione o email Google do usuário que terá acesso ao sistema.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <Mail className="w-3 h-3" />
                Email Google
              </Label>
              <Input
                type="email"
                placeholder="usuario@gmail.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <User className="w-3 h-3" />
                Nome (opcional)
              </Label>
              <Input
                type="text"
                placeholder="Nome do usuário"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
          
          <Button
            onClick={handleAddUser}
            disabled={saving || !newEmail.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            {saving ? "Adicionando..." : "Adicionar Usuário"}
          </Button>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-blue-400 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Lista de Usuários ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-gray-400 text-center py-4">
              Nenhum usuário cadastrado
            </p>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${user.is_admin ? "bg-amber-500/20" : "bg-blue-500/20"}`}>
                      {user.is_admin ? (
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                      ) : (
                        <User className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-white font-medium flex items-center gap-2">
                        {user.name || user.email}
                        {user.is_admin === 1 && (
                          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                            Admin
                          </span>
                        )}
                      </div>
                      {user.name && (
                        <div className="text-sm text-gray-400">{user.email}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleAdmin(user)}
                      className={`${
                        user.is_admin 
                          ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10" 
                          : "text-gray-400 hover:text-gray-300 hover:bg-slate-600"
                      }`}
                      title={user.is_admin ? "Remover admin" : "Tornar admin"}
                    >
                      {user.is_admin ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : (
                        <Shield className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id, user.email)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      title="Remover acesso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-300">
              <p className="font-medium mb-1">Sobre os acessos</p>
              <ul className="text-blue-300/80 space-y-1 text-xs">
                <li>• Apenas usuários com email cadastrado podem fazer login via Google</li>
                <li>• Administradores podem gerenciar usuários e acessar todas as funções</li>
                <li>• O administrador principal não pode ser removido</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
