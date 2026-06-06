import { create } from 'zustand';
import type { UserPlant } from '../types';

interface CollectionState {
  plants: UserPlant[];
  isLoading: boolean;
  searchQuery: string;
  sortOrder: 'newest' | 'oldest' | 'a-z' | 'z-a';
  filterTag: string | null;
  setPlants: (plants: UserPlant[]) => void;
  setLoading: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSortOrder: (order: 'newest' | 'oldest' | 'a-z' | 'z-a') => void;
  setFilterTag: (tag: string | null) => void;
}

export const useCollectionStore = create<CollectionState>((set) => ({
  plants: [],
  isLoading: false,
  searchQuery: '',
  sortOrder: 'newest',
  filterTag: null,

  setPlants: (plants) => set({ plants }),
  setLoading: (isLoading) => set({ isLoading }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setFilterTag: (filterTag) => set({ filterTag }),
}));

export function getFilteredPlants(state: Pick<CollectionState, 'plants' | 'searchQuery' | 'sortOrder' | 'filterTag'>): UserPlant[] {
  let result = [...state.plants];

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    result = result.filter((p) => {
      const common = p.plant?.common_name?.toLowerCase() ?? '';
      const scientific = p.plant?.scientific_name?.toLowerCase() ?? '';
      return common.includes(q) || scientific.includes(q);
    });
  }

  if (state.filterTag) {
    result = result.filter((p) => p.tags?.includes(state.filterTag!));
  }

  switch (state.sortOrder) {
    case 'newest':
      result.sort((a, b) => new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime());
      break;
    case 'oldest':
      result.sort((a, b) => new Date(a.discovered_at).getTime() - new Date(b.discovered_at).getTime());
      break;
    case 'a-z':
      result.sort((a, b) => (a.plant?.common_name ?? '').localeCompare(b.plant?.common_name ?? ''));
      break;
    case 'z-a':
      result.sort((a, b) => (b.plant?.common_name ?? '').localeCompare(a.plant?.common_name ?? ''));
      break;
  }

  return result;
}
