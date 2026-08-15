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
import { useUiStore } from '@/state/uiStore';
import { useTwinStore } from '@/state/twinStore';
import { darkTheme, lightTheme, cssVarValues } from '@/theme/theme';
import { bootstrapFirstRun } from '@/shell/bootstrap';
import { Header } from '@/shell/Header';
import { Sider } from '@/shell/Sider';
import { useAutosave } from '@/shell/useAutosave';

const { Content } = Layout;

export function RootShell({ children }: { children: React.ReactNode }) {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const setActiveTwin = useUiStore((s) => s.setActiveTwin);
  const setDoc = useTwinStore((s) => s.setDoc);
  const [booted, setBooted] = useState(false);

  // First-run bootstrap (create demo twin, load active twin, apply prefs).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await bootstrapFirstRun();
      if (cancelled) return;
      if (result.theme) setTheme(result.theme);
      if (result.activeTwinId) setActiveTwin(result.activeTwinId);
      if (result.doc) setDoc(result.doc);
      setBooted(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [setActiveTwin, setDoc, setTheme]);

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
