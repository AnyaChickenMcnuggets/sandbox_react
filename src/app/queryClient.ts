import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toastStore } from "../components/feedback/toastStore";

interface SilentMeta {
  silent?: boolean;
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const meta = query.meta as SilentMeta | undefined;
      if (meta?.silent) return; // поллинг мониторинга не должен спамить тостами на каждый неудачный тик
      toastStore.pushError(error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      toastStore.pushError(error);
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
});
