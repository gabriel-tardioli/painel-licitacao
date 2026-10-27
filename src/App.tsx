import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import VisaoExecutiva from "./pages/VisaoExecutiva";
import FunilLicitacoes from "./pages/FunilLicitacoes";
import Financeiro from "./pages/Financeiro";
import AnaliseRegional from "./pages/AnaliseRegional";
import BaseDetalhada from "./pages/BaseDetalhada";
import ImportacaoDados from "./pages/ImportacaoDados";
import Relatorio from "./pages/Relatorio";
import RelatorioVideo from "./pages/RelatorioVideo";
import NotFound from "./pages/NotFound";
import { EditaisDataProvider } from "./context/EditaisDataContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <EditaisDataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<VisaoExecutiva />} />
            <Route path="/funil" element={<FunilLicitacoes />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/regional" element={<AnaliseRegional />} />
            <Route path="/base" element={<BaseDetalhada />} />
            <Route path="/importacao" element={<ImportacaoDados />} />
            <Route path="/relatorio" element={<Relatorio />} />
            <Route path="/relatorio-video" element={<RelatorioVideo />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </EditaisDataProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
