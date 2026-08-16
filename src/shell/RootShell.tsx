'use client';

/**
 * RootShell — single client shell shared by every route.
 *
 * Owns:
 *  - AntD ConfigProvider (theme + cssVar)
 *  - Zustand providers (none required; just import)
 *  - ReactFlowProvider
 *  - Dexie `db` (lazy)
 *  - First-run bootstrap: create the demo Acme twin if none exists
 *  - Theme CSS variables applied to <html>
 */

import { useEffect, useState } from 'react';
import { ConfigProvider, App as AntApp, Layout, theme as antdTheme } from 'antd';
import { ReactFlowProvider } from '@xyflow/react';
import { usePathname, useRouter } from 'next/navigation';
import { useUiStore, type UiState } from '@/state/uiStore';
import { useTwinStore } from '@/state/twinStore';
import { darkTheme, lightTheme, cssVarValues } from '@/theme/theme';
import { bootstrapFirstRun } from '@/shell/bootstrap';
import { Header } from '@/shell/Header';
import { Sider } from '@/shell/Sider';
import { useAutosave } from '@/shell/useAutosave';

const { Content } = Layout;

const VALID_VIEWS = new Set(['/', '/schema', '/twin', '/tables', '/reachability']);

export function RootShell({ children }: { children: React.ReactNode }) {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const setActiveTwin = useUiStore((s) => s.setActiveTwin);
  const setActiveView = useUiStore((s) => s.setActiveView);
  const activeTwinId = useUiStore((s) => s.activeTwinId);
  const setDoc = useTwinStore((s) => s.setDoc);
  const router = useRouter();
  const pathname = usePathname() || '/';
  const [booted, setBooted] = useState(false);

  // First-run bootstrap (create demo twin, load active twin, apply prefs).
  // Also honors a ?twinId= query param: if it names a different twin, load it.
  // Static-export safe: the query is read from window.location, never a path segment.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const paramTwinId =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('twinId')
          : null;
      const result = await bootstrapFirstRun();
      if (cancelled) return;
      if (result.theme) setTheme(result.theme);
      if (result.activeTwinId) setActiveTwin(result.activeTwinId);
      if (result.doc) setDoc(result.doc);

      // ?twinId= overrides the saved active twin when it names a real twin.
      if (paramTwinId && paramTwinId !== result.activeTwinId) {
        const { getTwin } = await import('@/state/db');
        const t = await getTwin(paramTwinId);
        if (t) {
          setDoc(t);
          setActiveTwin(t.id);
        }
      }

      setBooted(true);

      // Restore the last view — but only when the user landed on '/' (the
      // default). A bookmarked deep link is an explicit intent we honor.
      if (
        !paramTwinId &&
        pathname === '/' &&
        result.activeView &&
        result.activeView !== '/' &&
        VALID_VIEWS.has(result.activeView)
      ) {
        router.replace(result.activeView);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setActiveTwin, setDoc, setTheme]);

  // Persist + sync the active view as the user navigates (story 33).
  useEffect(() => {
    if (!booted) return;
    setActiveView(pathname as UiState['activeView']);
    import('@/state/db').then(({ setKv }) => setKv('activeView', pathname));
  }, [booted, pathname, setActiveView]);

  // Keep ?twinId= in sync with the active twin so a reload reopens the same twin.
  useEffect(() => {
    if (!booted || !activeTwinId) return;
    const currentTwinId =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('twinId')
        : null;
    if (currentTwinId !== activeTwinId) {
      router.replace(`${pathname}?twinId=${activeTwinId}`);
    }
  }, [booted, activeTwinId, pathname, router]);

  // Apply CSS variables to <html> for React Flow and global theme.
  useEffect(() => {
    const vars = cssVarValues(theme);
    for (const [k, v] of Object.entries(vars)) {
      document.documentElement.style.setProperty(k, v);
    }
  }, [theme]);

  // Persist theme on change.
  useEffect(() => {
    if (!booted) return;
    import('@/state/db').then(({ setKv }) => setKv('theme', theme));
  }, [booted, theme]);

  const themeConfig = theme === 'dark' ? darkTheme : lightTheme;

  return (
    <ConfigProvider theme={themeConfig} componentSize="middle">
      <AntApp>
        <ReactFlowProvider>
          <Layout className="twin-app" hasSider>
            <Sider />
            <Layout>
              <Header />
              <Content className="twin-app__main">{children}</Content>
            </Layout>
          </Layout>
        </ReactFlowProvider>
      </AntApp>
    </ConfigProvider>
  );
}
