import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Instagram, Youtube, Twitter } from 'lucide-react';

export const CompetitorForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    website_url: '',
    instagram_url: '',
    youtube_url: '',
    tiktok_url: '',
    x_url: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('competitors').insert([{
        name: formData.name,
        website_url: formData.website_url,
        instagram_url: formData.instagram_url || null,
        youtube_url: formData.youtube_url || null,
        tiktok_url: formData.tiktok_url || null,
        x_url: formData.x_url || null,
        is_active: true
      }]);

      if (error) throw error;

      toast({ title: 'Concorrente cadastrado com sucesso!' });
      setFormData({
        name: '',
        website_url: '',
        instagram_url: '',
        youtube_url: '',
        tiktok_url: '',
        x_url: ''
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao cadastrar concorrente',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cadastrar Novo Concorrente</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Concorrente *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Ex: CVC Turismo"
            />
          </div>

          <div>
            <Label htmlFor="website_url">Website *</Label>
            <div className="flex gap-2">
              <Globe className="w-5 h-5 mt-2 text-muted-foreground" />
              <Input
                id="website_url"
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                required
                placeholder="https://exemplo.com.br"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="instagram_url">Instagram</Label>
            <div className="flex gap-2">
              <Instagram className="w-5 h-5 mt-2 text-muted-foreground" />
              <Input
                id="instagram_url"
                type="url"
                value={formData.instagram_url}
                onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                placeholder="https://instagram.com/perfil"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="youtube_url">YouTube</Label>
            <div className="flex gap-2">
              <Youtube className="w-5 h-5 mt-2 text-muted-foreground" />
              <Input
                id="youtube_url"
                type="url"
                value={formData.youtube_url}
                onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                placeholder="https://youtube.com/@canal"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="tiktok_url">TikTok</Label>
            <div className="flex gap-2">
              <span className="text-xl mt-1">📱</span>
              <Input
                id="tiktok_url"
                type="url"
                value={formData.tiktok_url}
                onChange={(e) => setFormData({ ...formData, tiktok_url: e.target.value })}
                placeholder="https://tiktok.com/@usuario"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="x_url">X (Twitter)</Label>
            <div className="flex gap-2">
              <Twitter className="w-5 h-5 mt-2 text-muted-foreground" />
              <Input
                id="x_url"
                type="url"
                value={formData.x_url}
                onChange={(e) => setFormData({ ...formData, x_url: e.target.value })}
                placeholder="https://x.com/usuario"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Cadastrando...' : 'Cadastrar Concorrente'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};