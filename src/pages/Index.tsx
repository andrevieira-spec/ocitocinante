import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plane, MapPin, Heart, Star } from "lucide-react";

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-background z-0" />
        <div className="container mx-auto px-4 z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Ocitocina Viagens & Sonhos
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-muted-foreground max-w-2xl mx-auto">
            Transforme seus sonhos de viagem em realidade. Pacotes exclusivos para destinos nacionais e internacionais.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" className="gap-2">
              <Heart className="w-5 h-5" />
              Explorar Destinos
            </Button>
            <Button size="lg" variant="outline" className="gap-2" asChild>
              <a href="https://ocitocina.lojamoblix.com" target="_blank" rel="noopener noreferrer">
                <Plane className="w-5 h-5" />
                Ver Loja Completa
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Por que escolher a Ocitocina?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Destinos Exclusivos</h3>
              <p className="text-muted-foreground">
                Pacotes personalizados para os melhores destinos nacionais e internacionais
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Atendimento Humanizado</h3>
              <p className="text-muted-foreground">
                Suporte dedicado para realizar seus sonhos de viagem com todo cuidado
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Experiências Memoráveis</h3>
              <p className="text-muted-foreground">
                Criamos momentos inesquecíveis em cada viagem planejada
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Pronto para realizar seus sonhos?</h2>
          <p className="text-xl mb-8 text-muted-foreground max-w-2xl mx-auto">
            Converse com nosso assistente virtual e descubra o pacote perfeito para você
          </p>
          <Button size="lg" className="gap-2" asChild>
            <a href="https://ocitocina.lojamoblix.com" target="_blank" rel="noopener noreferrer">
              <Plane className="w-5 h-5" />
              Visitar Nossa Loja
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© 2025 Ocitocina Viagens & Sonhos. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
