import { AdminPolicies } from '@/components/market/AdminPolicies';
import { Button } from '@/components/ui/button';
import { BackToHomeButton } from '@/components/navigation/BackToHomeButton';
import { ArrowLeft, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Policies() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6 flex gap-2">
          <Link to="/admin">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Admin
            </Button>
          </Link>
          <Link to="/cbos-setup">
            <Button variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />
              Documentação CBOS
            </Button>
          </Link>
          <BackToHomeButton />
        </div>
        <AdminPolicies />
      </div>
    </div>
  );
}
