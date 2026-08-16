/**
 * IT-infrastructure starter pack.
 *
 * Full definition per `.scratch/it-twin-designer/research/starter-pack-draft.md`.
 * 11 Types, 9 relation types, 14 capability flags, 14 data-categories, 4-tier classification.
 */

import type {
  CapabilityDef,
  DataCategoryDef,
  RelationTypeDef,
  TwinSchema,
  TypeDef,
} from './types';

const ICON = {
  Server: 'DesktopOutlined',
  Database: 'DatabaseOutlined',
  Table: 'TableOutlined',
  Column: 'FieldNumberOutlined',
  DatabaseUser: 'UserOutlined',
  Role: 'SafetyOutlined',
  SqlLogin: 'KeyOutlined',
  WebService: 'CloudOutlined',
  ApiEndpoint: 'LinkOutlined',
  UiApp: 'AppstoreOutlined',
  User: 'UserOutlined',
} as const;

const TYPES: TypeDef[] = [
  {
    id: 'type.server',
    name: 'Server',
    icon: ICON.Server,
    sections: [
      {
        id: 'sec.identity',
        name: 'Identity',
        fields: [
          { id: 'name', name: 'Name', type: 'text', required: true, summary: true },
          { id: 'host', name: 'Host', type: 'text', summary: true },
          { id: 'instance', name: 'Instance', type: 'text' },
          {
            id: 'environment',
            name: 'Environment',
            type: 'enum',
            options: ['Prod', 'Dev', 'Test'],
            summary: true,
          },
          {
            id: 'serverType',
            name: 'Server Type',
            type: 'enum',
            options: ['MSSQL', 'Postgres', 'MySQL', 'Oracle', 'Other'],
            summary: true,
          },
          { id: 'description', name: 'Description', type: 'text' },
        ],
      },
      {
        id: 'sec.security',
        name: 'Security',
        fields: [{ id: 'capabilities', name: 'Capabilities', type: 'multi-tag' }],
      },
    ],
  },
  {
    id: 'type.database',
    name: 'Database',
    icon: ICON.Database,
    sections: [
      {
        id: 'sec.identity',
        name: 'Identity',
        fields: [
          { id: 'name', name: 'Name', type: 'text', required: true, summary: true },
          { id: 'description', name: 'Description', type: 'text' },
        ],
      },
      {
        id: 'sec.security',
        name: 'Security',
        fields: [{ id: 'capabilities', name: 'Capabilities', type: 'multi-tag' }],
      },
    ],
  },
  {
    id: 'type.table',
    name: 'Table',
    icon: ICON.Table,
    sections: [
      {
        id: 'sec.identity',
        name: 'Identity',
        fields: [
          { id: 'name', name: 'Name', type: 'text', required: true, summary: true },
          { id: 'schema', name: 'Schema', type: 'text', summary: true },
          { id: 'description', name: 'Description', type: 'text' },
        ],
      },
      {
        id: 'sec.security',
        name: 'Security',
        fields: [{ id: 'capabilities', name: 'Capabilities', type: 'multi-tag' }],
      },
    ],
  },
  {
    id: 'type.column',
    name: 'Column',
    icon: ICON.Column,
    sections: [
      {
        id: 'sec.identity',
        name: 'Identity',
        fields: [
          { id: 'name', name: 'Name', type: 'text', required: true, summary: true },
          { id: 'dataType', name: 'Data Type', type: 'text', summary: true },
          { id: 'nullable', name: 'Nullable', type: 'boolean' },
          { id: 'isPartOfKey', name: 'Part of key', type: 'boolean' },
          { id: 'description', name: 'Description', type: 'text' },
        ],
      },
      {
        id: 'sec.classification',
        name: 'Classification',
        fields: [
          {
            id: 'classification',
            name: 'Classification',
            type: 'enum',
            options: ['public', 'internal', 'confidential', 'restricted'],
          },
          { id: 'dataCategory', name: 'Data category', type: 'multi-tag' },
        ],
      },
      {
        id: 'sec.security',
        name: 'Security',
        fields: [{ id: 'capabilities', name: 'Capabilities', type: 'multi-tag' }],
      },
    ],
  },
  {
    id: 'type.databaseUser',
    name: 'DatabaseUser',
    icon: ICON.DatabaseUser,
    sections: [
      {
        id: 'sec.identity',
        name: 'Identity',
        fields: [
          { id: 'name', name: 'Name', type: 'text', required: true, summary: true },
          { id: 'description', name: 'Description', type: 'text' },
        ],
      },
      {
        id: 'sec.security',
        name: 'Security',
        fields: [{ id: 'capabilities', name: 'Capabilities', type: 'multi-tag' }],
      },
    ],
  },
  {
    id: 'type.role',
    name: 'Role',
    icon: ICON.Role,
    sections: [
      {
        id: 'sec.identity',
        name: 'Identity',
        fields: [
          { id: 'name', name: 'Name', type: 'text', required: true, summary: true },
          {
            id: 'roleType',
            name: 'Role Type',
            type: 'enum',
            options: ['standard', 'custom'],
            summary: true,
          },
          { id: 'description', name: 'Description', type: 'text' },
        ],
      },
      {
        id: 'sec.security',
        name: 'Security',
        fields: [{ id: 'capabilities', name: 'Capabilities', type: 'multi-tag' }],
      },
    ],
  },
  {
    id: 'type.sqlLogin',
    name: 'SqlLogin',
    icon: ICON.SqlLogin,
    sections: [
      {
        id: 'sec.identity',
        name: 'Identity',
        fields: [
          { id: 'name', name: 'Name', type: 'text', required: true, summary: true },
          {
            id: 'loginType',
            name: 'Login Type',
            type: 'enum',
            options: ['SQL', 'Windows', 'AzureAD'],
            summary: true,
          },
          { id: 'description', name: 'Description', type: 'text' },
        ],
      },
      {
        id: 'sec.security',
        name: 'Security',
        fields: [{ id: 'capabilities', name: 'Capabilities', type: 'multi-tag' }],
      },
    ],
  },
  {
    id: 'type.webService',
    name: 'WebService',
    icon: ICON.WebService,
    sections: [
      {
        id: 'sec.identity',
        name: 'Identity',
        fields: [
          { id: 'name', name: 'Name', type: 'text', required: true, summary: true },
          { id: 'technology', name: 'Technology', type: 'text', summary: true },
          { id: 'description', name: 'Description', type: 'text' },
        ],
      },
      {
        id: 'sec.dataLayer',
        name: 'Data Layer',
        fields: [
          {
            id: 'dataAccessMode',
            name: 'Data Access Mode',
            type: 'enum',
            options: ['direct-SQL', 'ORM', 'stored-proc'],
            summary: true,
          },
          { id: 'dataLayerDescription', name: 'Description', type: 'text' },
        ],
      },
      {
        id: 'sec.security',
        name: 'Security',
        fields: [{ id: 'capabilities', name: 'Capabilities', type: 'multi-tag' }],
      },
    ],
  },
  {
    id: 'type.apiEndpoint',
    name: 'ApiEndpoint',
    icon: ICON.ApiEndpoint,
    sections: [
      {
        id: 'sec.identity',
        name: 'Identity',
        fields: [
          { id: 'name', name: 'Name', type: 'text', required: true, summary: true },
          {
            id: 'httpMethod',
            name: 'HTTP Method',
            type: 'enum',
            options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            summary: true,
          },
          { id: 'path', name: 'Path', type: 'text', summary: true },
          { id: 'description', name: 'Description', type: 'text' },
        ],
      },
      {
        id: 'sec.security',
        name: 'Security',
        fields: [{ id: 'capabilities', name: 'Capabilities', type: 'multi-tag' }],
      },
    ],
  },
  {
    id: 'type.uiApp',
    name: 'UiApp',
    icon: ICON.UiApp,
    sections: [
      {
        id: 'sec.identity',
        name: 'Identity',
        fields: [
          { id: 'name', name: 'Name', type: 'text', required: true, summary: true },
          { id: 'technology', name: 'Technology', type: 'text', summary: true },
          { id: 'description', name: 'Description', type: 'text' },
        ],
      },
      {
        id: 'sec.security',
        name: 'Security',
        fields: [{ id: 'capabilities', name: 'Capabilities', type: 'multi-tag' }],
      },
    ],
  },
  {
    id: 'type.user',
    name: 'User',
    icon: ICON.User,
    sections: [
      {
        id: 'sec.identity',
        name: 'Identity',
        fields: [
          { id: 'name', name: 'Name', type: 'text', required: true, summary: true },
          { id: 'username', name: 'Username', type: 'text', summary: true },
          { id: 'email', name: 'Email', type: 'text' },
          { id: 'department', name: 'Department', type: 'text' },
          { id: 'businessRole', name: 'Business Role', type: 'text' },
          { id: 'description', name: 'Description', type: 'text' },
        ],
      },
      {
        id: 'sec.security',
        name: 'Security',
        fields: [{ id: 'capabilities', name: 'Capabilities', type: 'multi-tag' }],
      },
    ],
  },
];

const RELATION_TYPES: RelationTypeDef[] = [
  {
    id: 'rel.contains',
    name: 'contains',
    forwardLabel: 'contains',
    reverseLabel: 'contained in',
    fromTypeIds: [
      'type.server',
      'type.database',
      'type.table',
    ],
    toTypeIds: [
      'type.database',
      'type.sqlLogin',
      'type.table',
      'type.databaseUser',
      'type.role',
      'type.column',
    ],
    propagatesReachability: false,
    direction: 'forward',
  },
  {
    id: 'rel.accesses',
    name: 'accesses',
    forwardLabel: 'accesses',
    reverseLabel: 'accessed by',
    fromTypeIds: ['type.databaseUser', 'type.role'],
    toTypeIds: ['type.table', 'type.column'],
    propagatesReachability: true,
    direction: 'bidirectional',
  },
  {
    id: 'rel.memberOf',
    name: 'memberOf',
    forwardLabel: 'member of',
    reverseLabel: 'has member',
    fromTypeIds: ['type.databaseUser'],
    toTypeIds: ['type.role'],
    propagatesReachability: true,
    direction: 'forward',
    modeDependent: true,
  },
  {
    id: 'rel.mapsTo',
    name: 'mapsTo',
    forwardLabel: 'maps to',
    reverseLabel: 'mapped by',
    fromTypeIds: ['type.databaseUser'],
    toTypeIds: ['type.sqlLogin'],
    propagatesReachability: true,
    direction: 'bidirectional',
  },
  {
    id: 'rel.usedAsServiceAccountBy',
    name: 'usedAsServiceAccountBy',
    forwardLabel: 'uses service account',
    reverseLabel: 'service account of',
    fromTypeIds: ['type.webService'],
    toTypeIds: ['type.sqlLogin'],
    propagatesReachability: true,
    direction: 'bidirectional',
  },
  {
    id: 'rel.exposes',
    name: 'exposes',
    forwardLabel: 'exposes',
    reverseLabel: 'exposed by',
    fromTypeIds: ['type.webService'],
    toTypeIds: ['type.apiEndpoint'],
    propagatesReachability: true,
    direction: 'bidirectional',
  },
  {
    id: 'rel.returns',
    name: 'returns',
    forwardLabel: 'returns',
    reverseLabel: 'returned by',
    fromTypeIds: ['type.apiEndpoint'],
    toTypeIds: ['type.column', 'type.table'],
    propagatesReachability: true,
    direction: 'bidirectional',
  },
  {
    id: 'rel.calls',
    name: 'calls',
    forwardLabel: 'calls',
    reverseLabel: 'called by',
    fromTypeIds: ['type.uiApp'],
    toTypeIds: ['type.apiEndpoint'],
    propagatesReachability: true,
    direction: 'bidirectional',
  },
  {
    id: 'rel.uses',
    name: 'uses',
    forwardLabel: 'uses',
    reverseLabel: 'used by',
    fromTypeIds: ['type.user'],
    toTypeIds: ['type.uiApp'],
    propagatesReachability: true,
    direction: 'bidirectional',
  },
];

const CAPABILITIES: CapabilityDef[] = [
  { id: 'masking', name: 'Masking', abbreviation: 'mask', homeTypes: ['type.column'] },
  {
    id: 'encryption-at-rest',
    name: 'Encryption at rest',
    abbreviation: 'enc',
    homeTypes: ['type.server', 'type.database', 'type.table', 'type.column'],
  },
  { id: 'tokenization', name: 'Tokenization', abbreviation: 'tok', homeTypes: ['type.column'] },
  { id: 'hashing', name: 'Hashing', abbreviation: 'hash', homeTypes: ['type.column'] },
  {
    id: 'row-level-security',
    name: 'Row-level security',
    abbreviation: 'rls',
    homeTypes: ['type.table', 'type.database'],
  },
  { id: 'tls', name: 'TLS', abbreviation: 'tls', homeTypes: ['type.webService', 'type.apiEndpoint'] },
  { id: 'mtls', name: 'mTLS', abbreviation: 'mtls', homeTypes: ['type.webService', 'type.apiEndpoint'] },
  {
    id: 'mfa',
    name: 'MFA',
    abbreviation: 'mfa',
    homeTypes: ['type.sqlLogin', 'type.user', 'type.uiApp'],
  },
  { id: 'auth-required', name: 'Auth required', abbreviation: 'auth', homeTypes: ['type.apiEndpoint'] },
  {
    id: 'rbac',
    name: 'RBAC',
    abbreviation: 'rbac',
    homeTypes: ['type.role', 'type.apiEndpoint', 'type.webService'],
  },
  { id: 'sso', name: 'SSO', abbreviation: 'sso', homeTypes: ['type.uiApp', 'type.user'] },
  { id: 'vpn-required', name: 'VPN required', abbreviation: 'vpn', homeTypes: ['type.user', 'type.uiApp'] },
  { id: 'audit-logging', name: 'Audit logging', abbreviation: 'audit', homeTypes: [] },
  { id: 'rate-limiting', name: 'Rate limiting', abbreviation: 'rl', homeTypes: ['type.apiEndpoint'] },
];

const DATA_CATEGORIES: DataCategoryDef[] = [
  {
    id: 'SSN',
    name: 'SSN',
    defaultClassification: 'restricted',
    recommendedCapabilities: ['masking', 'encryption-at-rest', 'audit-logging'],
  },
  {
    id: 'NationalID',
    name: 'National ID',
    defaultClassification: 'restricted',
    recommendedCapabilities: ['masking', 'encryption-at-rest', 'audit-logging'],
  },
  {
    id: 'PassportNumber',
    name: 'Passport',
    defaultClassification: 'restricted',
    recommendedCapabilities: ['masking', 'encryption-at-rest', 'audit-logging'],
  },
  {
    id: 'Email',
    name: 'Email',
    defaultClassification: 'internal',
    recommendedCapabilities: ['audit-logging'],
  },
  {
    id: 'Phone',
    name: 'Phone',
    defaultClassification: 'internal',
    recommendedCapabilities: ['audit-logging'],
  },
  {
    id: 'Address',
    name: 'Address',
    defaultClassification: 'internal',
    recommendedCapabilities: ['audit-logging'],
  },
  {
    id: 'FullName',
    name: 'Full name',
    defaultClassification: 'internal',
    recommendedCapabilities: ['audit-logging'],
  },
  {
    id: 'DateOfBirth',
    name: 'DOB',
    defaultClassification: 'confidential',
    recommendedCapabilities: ['masking', 'audit-logging'],
  },
  {
    id: 'CreditCard',
    name: 'Credit card',
    defaultClassification: 'restricted',
    recommendedCapabilities: ['masking', 'encryption-at-rest', 'audit-logging'],
  },
  {
    id: 'BankAccount',
    name: 'Bank account',
    defaultClassification: 'restricted',
    recommendedCapabilities: ['masking', 'encryption-at-rest', 'audit-logging'],
  },
  {
    id: 'Salary',
    name: 'Salary',
    defaultClassification: 'confidential',
    recommendedCapabilities: ['masking', 'audit-logging'],
  },
  {
    id: 'HealthData',
    name: 'Health data',
    defaultClassification: 'confidential',
    recommendedCapabilities: ['masking', 'audit-logging'],
  },
  {
    id: 'IPAddress',
    name: 'IP address',
    defaultClassification: 'internal',
    recommendedCapabilities: ['audit-logging'],
  },
  {
    id: 'Credentials',
    name: 'Credentials',
    defaultClassification: 'restricted',
    recommendedCapabilities: ['masking', 'encryption-at-rest', 'audit-logging'],
  },
];

export const STARTER_PACK_VERSION = 1;
export const SCHEMA_VERSION = 1;

export function buildStarterPack(): TwinSchema {
  return {
    types: TYPES.map((t) => ({ ...t, sections: t.sections.map((s) => ({ ...s, fields: [...s.fields] })) })),
    relationTypes: RELATION_TYPES.map((r) => ({ ...r })),
    capabilities: CAPABILITIES.map((c) => ({ ...c })),
    dataCategories: DATA_CATEGORIES.map((c) => ({ ...c })),
    schemaVersion: SCHEMA_VERSION,
    starterPackVersion: STARTER_PACK_VERSION,
  };
}
