/**
 * Acme Corp demo twin — the SSN worked example from starter-pack-draft §5.
 *
 * Expressible entirely with starter-pack Types and relations.
 */

import type { TwinDoc, TwinObject, TwinRelation } from './types';
import { buildStarterPack } from './starterPack';

function obj(
  id: string,
  typeId: string,
  values: Record<string, unknown> = {},
  capabilities: string[] = [],
  dataCategory?: string[],
): TwinObject {
  const out: TwinObject = {
    id,
    typeId,
    values: { name: values.name ?? id, ...values },
    capabilities,
  };
  if (dataCategory) out.dataCategory = dataCategory;
  return out;
}

function rel(
  id: string,
  relationTypeId: string,
  fromId: string,
  toId: string,
): TwinRelation {
  return { id, relationTypeId, fromId, toId };
}

export function buildAcmeDemoTwin(): TwinDoc {
  const schema = buildStarterPack();

  const objects: TwinObject[] = [
    // Topology
    obj('server', 'type.server', {
      name: 'PROD-SQL-01',
      host: 'prod-sql-01.acme.corp',
      environment: 'Prod',
      serverType: 'MSSQL',
    }, ['encryption-at-rest']),
    obj('db', 'type.database', { name: 'CustomerDB' }, ['encryption-at-rest', 'audit-logging']),
    obj('table', 'type.table', { name: 'Customer', schema: 'dbo' }, ['row-level-security']),
    obj('ssn', 'type.column', {
      name: 'SSN',
      dataType: 'varchar(11)',
      nullable: false,
      classification: 'restricted',
    }, ['masking', 'encryption-at-rest', 'audit-logging'], ['SSN']),
    obj('name', 'type.column', {
      name: 'Name',
      dataType: 'nvarchar(200)',
      nullable: false,
      classification: 'internal',
    }, ['audit-logging'], ['FullName']),
    obj('email', 'type.column', {
      name: 'Email',
      dataType: 'varchar(200)',
      nullable: true,
      classification: 'internal',
    }, ['audit-logging'], ['Email']),
    obj('phone', 'type.column', {
      name: 'Phone',
      dataType: 'varchar(50)',
      nullable: true,
      classification: 'internal',
    }, ['audit-logging'], ['Phone']),

    // DB principals
    obj('appReader', 'type.databaseUser', { name: 'app_reader' }),
    obj('role', 'type.role', { name: 'db_datareader', roleType: 'standard' }, ['rbac', 'audit-logging']),
    obj('login', 'type.sqlLogin', { name: 'svc_customer_api', loginType: 'SQL' }, ['mfa']),

    // Service / exposure
    obj('service', 'type.webService', {
      name: 'customer-api',
      technology: 'Node.js',
      dataAccessMode: 'ORM',
    }, ['tls', 'audit-logging']),
    obj('endpoint', 'type.apiEndpoint', {
      name: 'GET /api/customers',
      httpMethod: 'GET',
      path: '/api/customers',
    }, ['auth-required', 'rate-limiting', 'audit-logging']),

    // Consumption
    obj('portal', 'type.uiApp', {
      name: 'customer-portal',
      technology: 'React',
    }, ['sso', 'tls']),
    obj('jane', 'type.user', {
      name: 'Jane Doe',
      username: 'jdoe',
      email: 'jane.doe@acme.corp',
      department: 'Customer Service',
      businessRole: 'CSR',
    }, ['mfa', 'vpn-required', 'sso']),
  ];

  const relations: TwinRelation[] = [
    rel('c1', 'rel.contains', 'server', 'db'),
    rel('c2', 'rel.contains', 'db', 'table'),
    rel('c3', 'rel.contains', 'table', 'ssn'),
    rel('c4', 'rel.contains', 'table', 'name'),
    rel('c5', 'rel.contains', 'table', 'email'),
    rel('c6', 'rel.contains', 'table', 'phone'),
    rel('c7', 'rel.contains', 'db', 'appReader'),
    rel('c8', 'rel.contains', 'db', 'role'),
    rel('c9', 'rel.contains', 'server', 'login'),
    rel('a1', 'rel.accesses', 'appReader', 'table'),
    rel('a2', 'rel.accesses', 'role', 'table'),
    rel('m1', 'rel.memberOf', 'appReader', 'role'),
    rel('m2', 'rel.mapsTo', 'appReader', 'login'),
    rel('u1', 'rel.usedAsServiceAccountBy', 'service', 'login'),
    rel('e1', 'rel.exposes', 'service', 'endpoint'),
    rel('r1', 'rel.returns', 'endpoint', 'ssn'),
    rel('cl1', 'rel.calls', 'portal', 'endpoint'),
    rel('us1', 'rel.uses', 'jane', 'portal'),
  ];

  const now = Date.now();
  return {
    id: 'twin-acme-demo',
    name: 'Acme Corp (demo)',
    createdAt: now,
    updatedAt: now,
    schema,
    objects,
    relations,
    graphLayout: null,
    queryHistory: [],
    meta: { isDemo: true },
  };
}
