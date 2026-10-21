import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    // Every loading or saving problem is shown here, so pages only decide what happens next.
    queryCache: new QueryCache({
      onError: (e, query) => {
        if (query.queryKey[0] !== "photo-urls")
          toast.error(errorMessage(e, "Não foi possível carregar os dados."), {
            id: String(query.queryKey[0]),
          });
      },
    }),
    mutationCache: new MutationCache({
      onError: (e) => {
        toast.error(errorMessage(e, "Não foi possível guardar."));
      },
    }),
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
