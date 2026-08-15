'use client';

import { useState } from 'react';
import { Layout, Menu } from 'antd';
import {
  AppstoreOutlined,
  DatabaseOutlined,
  PartitionOutlined,
  TableOutlined,
  AimOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';

const { Sider: AntSider } = Layout;

const items = [
  { key: '/', icon: <AppstoreOutlined />, label: 'Dashboard' },
  { key: '/schema', icon: <DatabaseOutlined />, label: 'Schema' },
  { key: '/twin', icon: <PartitionOutlined />, label: 'Twin' },
  { key: '/tables', icon: <TableOutlined />, label: 'Tables' },
  { key: '/reachability', icon: <AimOutlined />, label: 'Reachability' },
];

export function Sider() {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AntSider
      className="twin-sider"
      width={220}
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      trigger={null}
      style={{ height: '100%' }}
    >
      <div
        style={{
          padding: collapsed ? '20px 0' : '20px 16px',
          fontWeight: 700,
          fontSize: collapsed ? 20 : 16,
          letterSpacing: 0.4,
          textAlign: collapsed ? 'center' : 'left',
          color: 'var(--twin-brand)',
          borderBottom: '1px solid var(--twin-border)',
        }}
        onClick={() => setCollapsed((c) => !c)}
      >
        {collapsed ? 'TD' : 'Twin'}
      </div>
      <Menu
        mode="inline"
        selectedKeys={[pathname]}
        items={items}
        onClick={({ key }) => router.push(key as string)}
        style={{ borderRight: 0, background: 'transparent' }}
      />
    </AntSider>
  );
}
