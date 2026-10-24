import "./styles.css";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import type { Me, SetupState } from "@snug/shared";
import { CloudOff } from "lucide-react";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Route, Switch } from "wouter";
import { ApiError, api, queryClient } from "./api";
import { Layout } from "./components/layout";
import { ToastProvider } from "./components/toast";
import { Button, Empty, Spinner } from "./components/ui";
import { AuthPage } from "./pages/auth";
import { HomePage } from "./pages/home";
import { LibraryPage } from "./pages/library";
import { SearchPage } from "./pages/search";
import { SeriesPage } from "./pages/series";
import { SettingsPage } from "./pages/settings";
import { StatsPage } from "./pages/stats";
import { SetupPage } from "./pages/setup";

/** First run → create admin; signed out → sign in; no TMDB key → setup; then the app. */
function App() {
  const setup = useQuery({ queryKey: ["setup"], queryFn: () => api<SetupState>("/setup") });
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Me>("/me").catch((e) => (e instanceof ApiError && e.status === 401 ? null : Promise.reject(e))),
  });

  if (setup.isPending || me.isPending) return <Spinner />;
  // An unreachable server must never look like a fresh install (which would offer to create an account).
  if (setup.isError || me.isError) return <Unreachable retry={() => Promise.all([setup.refetch(), me.refetch()])} />;
  if (!setup.data.hasUsers) return <AuthPage firstRun />;
  if (!me.data) return <AuthPage firstRun={false} />;
  if (!setup.data.hasTmdbKey) return <SetupPage me={me.data} />;

  return (
    <Layout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/library" component={LibraryPage} />
        <Route path="/search" component={SearchPage} />
        <Route path="/stats" component={StatsPage} />
        <Route path="/series/:id">{(p) => <SeriesPage key={p.id} id={p.id} />}</Route>
        <Route path="/settings">
          <SettingsPage me={me.data} />
        </Route>
        <Route>
          <HomePage />
        </Route>
      </Switch>
    </Layout>
  );
}

function Unreachable({ retry }: { retry: () => unknown }) {
  useEffect(() => {
    const timer = setInterval(retry, 3000);
    return () => clearInterval(timer);
  }, [retry]);
  return (
    <Empty icon={<CloudOff className="size-10" />} title="Can't reach Snug">
      The server isn't answering. Retrying every few seconds…
      <div className="mt-5">
        <Button variant="ghost" onClick={retry}>
          Retry now
        </Button>
      </div>
    </Empty>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) navigator.serviceWorker.register("/sw.js");
