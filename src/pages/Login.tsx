import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Lock, UserPlus, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha email e senha',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const emailNormalized = email.trim().toLowerCase();

    try {
      // Login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailNormalized,
        password: password,
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }

      if (!authData?.user) {
        throw new Error('Usuário não encontrado');
      }

      // Bootstrap: promover primeiro usuário a admin (idempotente)
      try {
        await supabase.functions.invoke('bootstrap-admin', { method: 'POST' });
      } catch (e) {
        console.warn('bootstrap-admin falhou/ignorou:', e);
      }

      // Verificar role de admin
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError) {
        console.error('Role check error:', roleError);
        await supabase.auth.signOut();
        toast({
          title: 'Erro ao verificar permissões',
          description: 'Tente novamente',
          variant: 'destructive',
        });
        return;
      }

      if (!roleData) {
        await supabase.auth.signOut();
        toast({
          title: 'Acesso negado',
          description: 'Você não tem permissão de administrador.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Login realizado',
        description: 'Bem-vindo ao CBOS Ocitocina',
      });

      navigate('/admin');
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Erro ao fazer login. Tente novamente.';
      
      if (error?.message?.includes('Invalid login credentials')) {
        errorMessage = 'Email ou senha incorretos';
      } else if (error?.message?.includes('Email not confirmed')) {
        errorMessage = 'Confirme seu email antes de fazer login';
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Erro no login',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    const emailNormalized = email.trim().toLowerCase();
    if (!emailNormalized) {
      toast({ title: 'Informe seu email', description: 'Preencha o campo de email para receber o link.' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailNormalized,
        options: { emailRedirectTo: `${window.location.origin}/admin` },
      });
      if (error) throw error;
      toast({ title: 'Link enviado', description: 'Verifique seu email para entrar sem senha.' });
    } catch (error: any) {
      toast({ title: 'Erro ao enviar link', description: error?.message || 'Tente novamente', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const emailNormalized = email.trim().toLowerCase();
    if (!emailNormalized) {
      toast({ title: 'Informe seu email', description: 'Preencha o campo de email para receber o link.' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailNormalized, {
        redirectTo: `${window.location.origin}/reset`,
      });
      if (error) throw error;
      toast({ title: 'Verifique seu email', description: 'Enviamos um link para redefinir sua senha.' });
    } catch (error: any) {
      toast({ title: 'Erro ao enviar link', description: error?.message || 'Tente novamente', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos',
        variant: 'destructive',
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter pelo menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const emailNormalized = email.trim().toLowerCase();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailNormalized,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
        },
      });

      if (error) {
        console.error('Signup error:', error);
        throw error;
      }

      if (data.user) {
        toast({
          title: 'Conta criada!',
          description: 'Entre em contato com o administrador para liberar seu acesso ao sistema.',
          duration: 5000,
        });
        
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      let errorMessage = 'Não foi possível criar a conta';
      
      if (error?.message?.includes('already registered')) {
        errorMessage = 'Este email já está cadastrado';
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Erro no cadastro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="absolute top-4 right-4">
        <Button 
          variant="outline" 
          onClick={() => navigate('/cbos-setup')}
          className="gap-2"
        >
          <FileText className="w-4 h-4" />
          Documentação CBOS
        </Button>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">CBOS Ocitocina</CardTitle>
          <CardDescription>
            Sistema interno da Ocitocina Viagens & Sonhos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login" className="gap-2">
                <Lock className="w-4 h-4" />
                Login
              </TabsTrigger>
              <TabsTrigger value="signup" className="gap-2">
                <UserPlus className="w-4 h-4" />
                Cadastrar
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="login-email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="admin@ocitocina.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="login-password" className="text-sm font-medium">
                    Senha
                  </label>
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <div className="flex items-center gap-2">
                    <input id="show-pass" type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
                    <label htmlFor="show-pass" className="text-xs">Mostrar senha</label>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
                <div className="mt-2 grid grid-cols-1 gap-2 text-center">
                  <Button type="button" variant="link" onClick={handleMagicLink} disabled={loading}>
                    Entrar com link por email (sem senha)
                  </Button>
                  <Button type="button" variant="link" onClick={handleResetPassword} disabled={loading}>
                    Esqueci minha senha
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="signup-email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-password" className="text-sm font-medium">
                    Senha (mínimo 6 caracteres)
                  </label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirm-password" className="text-sm font-medium">
                    Confirmar Senha
                  </label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Criando conta...' : 'Criar Conta'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Após criar sua conta, aguarde aprovação do administrador.
                </p>
                <div className="text-center mt-4">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => navigate('/request-access')}
                    className="text-sm"
                  >
                    Não tem conta? Solicite acesso aqui
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
