import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string()
    .trim()
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  password: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(72, 'Senha muito longa')
});

export const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate inputs
      const validationResult = authSchema.safeParse({ email, password });
      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast({ 
          title: 'Erro de validação', 
          description: firstError.message, 
          variant: 'destructive' 
        });
        setLoading(false);
        return;
      }

      const { email: validEmail, password: validPassword } = validationResult.data;

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ 
          email: validEmail, 
          password: validPassword 
        });
        if (error) throw error;
        toast({ title: 'Login realizado com sucesso!' });
      } else {
        const { error } = await supabase.auth.signUp({ 
          email: validEmail, 
          password: validPassword,
          options: { emailRedirectTo: `${window.location.origin}/` }
        });
        if (error) throw error;
        toast({ title: 'Conta criada! Faça login para continuar.' });
      }
    } catch (error: any) {
      let userMessage = 'Ocorreu um erro. Tente novamente.';
      
      if (error.message === 'Invalid login credentials') {
        userMessage = 'Email ou senha incorretos';
      } else if (error.message?.includes('User already registered') || error.message?.includes('already registered')) {
        userMessage = 'Este email já está cadastrado. Faça login ou use outro email.';
        setIsLogin(true); // Switch to login form
      } else if (error.message?.includes('Email')) {
        userMessage = error.message;
      }
      
      toast({ title: 'Erro', description: userMessage, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">CBOS</CardTitle>
          <CardDescription>
            {isLogin ? 'Entre na sua conta' : 'Crie sua conta'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Carregando...' : isLogin ? 'Entrar' : 'Criar conta'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};