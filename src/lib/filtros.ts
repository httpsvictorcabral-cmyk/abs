import { create } from 'zustand';
import type { FiltrosGlobais } from '@/types';

interface FiltrosState extends FiltrosGlobais {
  setFiltro: (key: keyof FiltrosGlobais, value: string | null) => void;
  resetFiltros: () => void;
  hasActiveFilters: () => boolean;
}

const defaultFiltros: FiltrosGlobais = {
  dataInicio: null,
  dataFim: null,
  empresaId: null,
  unidadeId: null,
  departamentoId: null,
  setorId: null,
  cargoId: null,
  gestorId: null,
  funcionarioId: null,
  tipoOcorrenciaId: null,
};

export const useFiltrosStore = create<FiltrosState>((set, get) => ({
  ...defaultFiltros,
  setFiltro: (key, value) => set({ [key]: value } as Partial<FiltrosState>),
  resetFiltros: () => set({ ...defaultFiltros }),
  hasActiveFilters: () => {
    const s = get();
    return Object.entries(defaultFiltros).some(
      ([k]) => s[k as keyof FiltrosGlobais] !== null
    );
  },
}));
