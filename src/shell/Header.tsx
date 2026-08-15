'use client';

import { useEffect, useState } from 'react';
import { Button, Dropdown, Modal, Space, Switch, Tooltip, message, Drawer, Form, Input } from 'antd';
import { AppstoreOutlined, ExportOutlined, ImportOutlined, SettingOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useTwinStore } from '@/state/twinStore';
import { useUiStore } from '@/state/uiStore';
import { useReachabilityStore } from '@/state/reachabilityStore';
import { exportTwinJson, importTwinJson } from '@/domain/migrate';
import { getDb, setKv, getKv, putTwin } from '@/state/db';
import { buildAcmeDemoTwin } from '@/domain/demoTwin';

export function Header() {
  const router = useRouter();
  const doc = useTwinStore((s) => s.doc);
  const dirty = useTwinStore((s) => s.dirty);
  const setDoc = useTwinStore((s) => s.setDoc);
  const activeTwinId = useUiStore((s) => s.activeTwinId);
  const setActiveTwin = useUiStore((s) => s.setActiveTwin);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const setRoot = useReachabilityStore((s) => s.setRoot);
  const [recent, setRecent] = useState<{ id: string; name: string }[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [includeLayout, setIncludeLayout] = useState(true);

  // Refresh recent-twins list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const twins = await getDb().twins.orderBy('updatedAt').reverse().limit(10).toArray();
      if (!cancelled) setRecent(twins.map((t) => ({ id: t.id, name: t.name })));
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTwinId, doc?.updatedAt]);

  const switchTwin = async (id: string) => {
    const t = await getDb().twins.get(id);
    if (t) {
      setDoc(t);
      setActiveTwin(id);
      await setKv('activeTwinId', id);
      setPickerOpen(false);
    }
  };

  const createBlank = async () => {
    const t = buildAcmeDemoTwin();
    t.id = `twin-${Date.now().toString(36)}`;
    t.name = 'New twin';
    t.meta = { isDemo: false };
    t.objects = [];
    t.relations = [];
    await putTwin(t);
    setDoc(t);
    setActiveTwin(t.id);
    await setKv('activeTwinId', t.id);
    setPickerOpen(false);
  };

  const resetToDemo = async () => {
    const t = buildAcmeDemoTwin();
    await putTwin(t);
    setDoc(t);
    setActiveTwin(t.id);
    await setKv('activeTwinId', t.id);
    setPickerOpen(false);
    message.success('Demo twin reloaded');
  };

  const doExport = () => {
    if (!doc) return;
    const json = exportTwinJson(doc, { includeLayout });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name.replace(/\s+/g, '-').toLowerCase()}.twin.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
    message.success('Exported');
  };

  const doImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const imported = importTwinJson(text);
        imported.name = `${imported.name} (imported)`;
        await putTwin(imported);
        setDoc(imported);
        setActiveTwin(imported.id);
        await setKv('activeTwinId', imported.id);
        message.success('Imported');
      } catch (e) {
        message.error('Import failed: invalid file');
      }
    };
    input.click();
  };

  return (
    <div className="twin-header">
      <span className="twin-header__title">IT-Twin Designer</span>
      <Dropdown
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        trigger={['click']}
        menu={{
          items: [
            ...recent.map((t) => ({
              key: t.id,
              label: (
                <span style={{ fontWeight: t.id === activeTwinId ? 600 : 400 }}>
                  {t.name} {t.id === activeTwinId ? '· active' : ''}
                </span>
              ),
              onClick: () => switchTwin(t.id),
            })),
            { type: 'divider' as const },
            { key: '__new', label: '+ New blank twin', onClick: () => void createBlank() },
            { key: '__demo', label: 'Reset to demo', onClick: () => void resetToDemo() },
          ],
        }}
      >
        <Button>
          <Space>
            <AppstoreOutlined />
            {doc?.name ?? 'No twin'}
            {dirty && <span style={{ color: '#fab219' }}>●</span>}
          </Space>
        </Button>
      </Dropdown>

      <Button icon={<ImportOutlined />} onClick={doImport}>
        Import
      </Button>
      <Button icon={<ExportOutlined />} onClick={() => setExportOpen(true)}>
        Export
      </Button>
      <Button
        type="primary"
        onClick={() => {
          setRoot(null);
          router.push('/reachability');
        }}
      >
        Run reachability
      </Button>

      <div className="twin-header__spacer" />

      <Tooltip title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}>
        <Switch
          checked={theme === 'dark'}
          onChange={(v) => setTheme(v ? 'dark' : 'light')}
          checkedChildren="Dark"
          unCheckedChildren="Light"
        />
      </Tooltip>

      <Button
        type="text"
        icon={<SettingOutlined />}
        onClick={() => setSettingsOpen(true)}
      />

      <Modal
        title="Export twin"
        open={exportOpen}
        onCancel={() => setExportOpen(false)}
        onOk={doExport}
        okText="Download JSON"
      >
        <Form layout="vertical">
          <Form.Item label="Options">
            <Space direction="vertical">
              <Switch
                checked={includeLayout}
                onChange={setIncludeLayout}
                checkedChildren="Include graph layout"
                unCheckedChildren="Strip graph layout"
              />
              <span style={{ color: 'var(--twin-text-muted)', fontSize: 12 }}>
                Stripping layout lets a shared twin not impose your hand-placed positions on the recipient.
              </span>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="Settings"
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        width={360}
      >
        <Form layout="vertical">
          <Form.Item label="Theme">
            <Switch
              checked={theme === 'dark'}
              onChange={(v) => setTheme(v ? 'dark' : 'light')}
              checkedChildren="Dark"
              unCheckedChildren="Light"
            />
          </Form.Item>
          <Form.Item label="Active twin">
            <Input value={doc?.name ?? ''} readOnly />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
