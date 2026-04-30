export type FieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'textarea'
  | 'json'
  | 'select';

export type FieldConfig = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  defaultValue?: string;
  readOnly?: boolean;
  autoFromCampId?: boolean;
};

export type ListConfig = {
  key: string;
  label: string;
  path: string;
  pagination?: boolean;
};

export type ActionConfig = {
  key: string;
  label: string;
  method: string;
  path: string;
  fields: FieldConfig[];
  requiresId?: boolean;
  description?: string;
};

export type EntityConfig = {
  key: string;
  label: string;
  route: string;
  list: ListConfig;
  create?: ActionConfig;
  update?: ActionConfig;
  deleteAction?: ActionConfig;
  actions?: ActionConfig[];
  secondaryLists?: ListConfig[];
};

const campStatusOptions = ['ACTIVE', 'ABANDONED'];
const personStatusOptions = ['SICK', 'HEALTHY', 'INJURED', 'AWAY', 'DEAD'];
const expeditionStatusOptions = ['PLANNED', 'ONGOING', 'RETURNED', 'CANCELLED'];
const transferTypeOptions = ['RESOURCE', 'PERSON', 'MIXED'];
const transferItemStatusOptions = ['SICK', 'HEALTHY', 'INJURED', 'AWAY', 'DEAD'];

export const entities: EntityConfig[] = [
  {
    key: 'camps',
    label: 'Camps',
    route: 'camps',
    list: { key: 'list', label: 'Camps', path: '/camps' },
    create: {
      key: 'create',
      label: 'Create camp',
      method: 'POST',
      path: '/camps',
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'location', label: 'Location', type: 'text' },
        { key: 'status', label: 'Status', type: 'select', options: campStatusOptions },
        { key: 'ai_context_prompt', label: 'AI context', type: 'textarea' },
      ],
    },
    update: {
      key: 'update',
      label: 'Update camp',
      method: 'PUT',
      path: '/camps/:id',
      fields: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'location', label: 'Location', type: 'text' },
        { key: 'status', label: 'Status', type: 'select', options: campStatusOptions },
        { key: 'ai_context_prompt', label: 'AI context', type: 'textarea' },
      ],
      requiresId: true,
    },
    deleteAction: {
      key: 'delete',
      label: 'Delete camp',
      method: 'DELETE',
      path: '/camps/:id',
      fields: [],
      requiresId: true,
    },
  },
  {
    key: 'resources',
    label: 'Resources',
    route: 'resources',
    list: { key: 'list', label: 'Resources', path: '/resources', pagination: true },
    create: {
      key: 'create',
      label: 'Create resource',
      method: 'POST',
      path: '/resources',
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'unit', label: 'Unit', type: 'text', required: true },
        { key: 'daily_ration', label: 'Daily ration', type: 'number', required: true },
        { key: 'minimum_stock', label: 'Minimum stock', type: 'number', required: true },
        { key: 'auto_daily', label: 'Auto daily', type: 'boolean' },
      ],
    },
    update: {
      key: 'update',
      label: 'Update resource',
      method: 'PUT',
      path: '/resources/:id',
      fields: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'unit', label: 'Unit', type: 'text' },
        { key: 'daily_ration', label: 'Daily ration', type: 'number' },
        { key: 'minimum_stock', label: 'Minimum stock', type: 'number' },
        { key: 'auto_daily', label: 'Auto daily', type: 'boolean' },
      ],
      requiresId: true,
    },
    deleteAction: {
      key: 'delete',
      label: 'Delete resource',
      method: 'DELETE',
      path: '/resources/:id',
      fields: [],
      requiresId: true,
    },
  },
  {
    key: 'professions',
    label: 'Professions',
    route: 'professions',
    list: { key: 'list', label: 'Professions', path: '/professions' },
    create: {
      key: 'create',
      label: 'Create profession',
      method: 'POST',
      path: '/professions',
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
      ],
    },
    update: {
      key: 'update',
      label: 'Update profession',
      method: 'PUT',
      path: '/professions/:id',
      fields: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
      ],
      requiresId: true,
    },
    deleteAction: {
      key: 'delete',
      label: 'Delete profession',
      method: 'DELETE',
      path: '/professions/:id',
      fields: [],
      requiresId: true,
    },
  },
  {
    key: 'users',
    label: 'Users',
    route: 'users',
    list: { key: 'list', label: 'Users', path: '/users' },
    create: {
      key: 'create',
      label: 'Create user',
      method: 'POST',
      path: '/users',
      fields: [
        { key: 'username', label: 'Username', type: 'text', required: true },
        { key: 'password', label: 'Password', type: 'text', required: true },
        { key: 'camp_id', label: 'Camp ID', type: 'number', required: true },
        { key: 'role_id', label: 'Role ID', type: 'number', required: true },
        { key: 'is_active', label: 'Is active', type: 'boolean' },
        { key: 'last_activity', label: 'Last activity', type: 'datetime' },
        { key: 'created_at', label: 'Created at', type: 'datetime' },
      ],
    },
    update: {
      key: 'update',
      label: 'Update user',
      method: 'PUT',
      path: '/users/:id',
      fields: [
        { key: 'username', label: 'Username', type: 'text' },
        { key: 'password', label: 'Password', type: 'text' },
        { key: 'camp_id', label: 'Camp ID', type: 'number' },
        { key: 'role_id', label: 'Role ID', type: 'number' },
        { key: 'is_active', label: 'Is active', type: 'boolean' },
        { key: 'last_activity', label: 'Last activity', type: 'datetime' },
        { key: 'created_at', label: 'Created at', type: 'datetime' },
      ],
      requiresId: true,
    },
    deleteAction: {
      key: 'delete',
      label: 'Delete user',
      method: 'DELETE',
      path: '/users/:id',
      fields: [],
      requiresId: true,
    },
  },
  {
    key: 'people',
    label: 'People',
    route: 'people',
    list: {
      key: 'list',
      label: 'People',
      path: '/camps/:campId/people',
      pagination: true,
    },
    create: {
      key: 'create',
      label: 'Create person',
      method: 'POST',
      path: '/camps/:campId/people',
      fields: [
        { key: 'full_name', label: 'Full name', type: 'text', required: true },
        {
          key: 'camp_id',
          label: 'Camp ID',
          type: 'number',
          required: true,
          autoFromCampId: true,
          readOnly: true,
        },
        { key: 'profession_id', label: 'Profession ID', type: 'number', required: true },
        { key: 'admitted_at', label: 'Admitted at', type: 'datetime', required: true },
        { key: 'status', label: 'Status', type: 'select', options: personStatusOptions },
        { key: 'age', label: 'Age', type: 'number' },
        { key: 'identification_code', label: 'ID code', type: 'text' },
        { key: 'blood_type', label: 'Blood type', type: 'text' },
        { key: 'skills_summary', label: 'Skills summary', type: 'textarea' },
        { key: 'photo_url', label: 'Photo URL', type: 'text' },
      ],
    },
    update: {
      key: 'update',
      label: 'Update person',
      method: 'PUT',
      path: '/camps/:campId/people/:id',
      fields: [
        { key: 'full_name', label: 'Full name', type: 'text' },
        {
          key: 'camp_id',
          label: 'Camp ID',
          type: 'number',
          autoFromCampId: true,
          readOnly: true,
        },
        { key: 'profession_id', label: 'Profession ID', type: 'number' },
        { key: 'admitted_at', label: 'Admitted at', type: 'datetime' },
        { key: 'status', label: 'Status', type: 'select', options: personStatusOptions },
        { key: 'age', label: 'Age', type: 'number' },
        { key: 'identification_code', label: 'ID code', type: 'text' },
        { key: 'blood_type', label: 'Blood type', type: 'text' },
        { key: 'skills_summary', label: 'Skills summary', type: 'textarea' },
        { key: 'photo_url', label: 'Photo URL', type: 'text' },
      ],
      requiresId: true,
    },
    deleteAction: {
      key: 'delete',
      label: 'Delete person',
      method: 'DELETE',
      path: '/camps/:campId/people/:id',
      fields: [],
      requiresId: true,
    },
  },
  {
    key: 'admission',
    label: 'Admission',
    route: 'admission',
    list: {
      key: 'list',
      label: 'Admissions',
      path: '/admission/camps/:campId',
    },
    create: {
      key: 'create',
      label: 'Create admission',
      method: 'POST',
      path: '/admission/camps/:campId',
      fields: [
        { key: 'applicant_name', label: 'Applicant name', type: 'text', required: true },
        { key: 'applicant_age', label: 'Applicant age', type: 'number' },
        { key: 'applicant_skills', label: 'Applicant skills', type: 'textarea' },
        { key: 'health_notes', label: 'Health notes', type: 'textarea' },
        { key: 'background_notes', label: 'Background notes', type: 'textarea' },
        { key: 'photo_url', label: 'Photo URL', type: 'text' },
        { key: 'id_card_url', label: 'ID card URL', type: 'text' },
      ],
    },
    actions: [
      {
        key: 'review',
        label: 'Review admission',
        method: 'PATCH',
        path: '/admission/:id/review',
        fields: [
          {
            key: 'final_decision',
            label: 'Final decision',
            type: 'select',
            options: ['ACCEPTED', 'REJECTED'],
            required: true,
          },
        ],
        requiresId: true,
      },
    ],
  },
  {
    key: 'inventory',
    label: 'Inventory',
    route: 'inventory',
    list: {
      key: 'list',
      label: 'Inventory snapshot',
      path: '/inventory/:campId',
    },
    secondaryLists: [
      { key: 'audit', label: 'Inventory audit', path: '/inventory/audit/:campId' },
    ],
    create: {
      key: 'adjustment',
      label: 'Create manual adjustment',
      method: 'POST',
      path: '/inventory/adjustment',
      fields: [
        {
          key: 'camp_id',
          label: 'Camp ID',
          type: 'number',
          required: true,
          autoFromCampId: true,
          readOnly: true,
        },
        {
          key: 'resource_type_id',
          label: 'Resource type ID',
          type: 'number',
          required: true,
        },
        {
          key: 'type',
          label: 'Adjustment type',
          type: 'select',
          options: ['MANUAL_IN', 'MANUAL_OUT'],
          required: true,
        },
        { key: 'quantity', label: 'Quantity', type: 'number', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
      ],
    },
  },
  {
    key: 'explorations',
    label: 'Explorations',
    route: 'explorations',
    list: { key: 'list', label: 'Expeditions', path: '/expeditions' },
    create: {
      key: 'create',
      label: 'Create expedition',
      method: 'POST',
      path: '/expeditions',
      fields: [
        { key: 'camp_id', label: 'Camp ID', type: 'number', required: true },
        { key: 'created_by', label: 'Created by', type: 'number', required: true },
        { key: 'destination', label: 'Destination', type: 'text', required: true },
        { key: 'departure_date', label: 'Departure date', type: 'date', required: true },
        { key: 'expected_return_date', label: 'Expected return', type: 'date', required: true },
        { key: 'max_return_date', label: 'Max return', type: 'date', required: true },
        { key: 'actual_return_date', label: 'Actual return', type: 'date' },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: ['PLANNED', 'ONGOING'],
        },
        { key: 'notes', label: 'Notes', type: 'textarea' },
        {
          key: 'members',
          label: 'Members (JSON)',
          type: 'json',
          placeholder: '[{"person_id": 1}]',
          defaultValue: '[]',
        },
        {
          key: 'allocated_resources',
          label: 'Allocated resources (JSON)',
          type: 'json',
          placeholder: '[{"resource_type_id": 1, "amount": 2}]',
          defaultValue: '[]',
        },
      ],
    },
    update: {
      key: 'update',
      label: 'Update expedition',
      method: 'PUT',
      path: '/expeditions/:id',
      fields: [
        { key: 'camp_id', label: 'Camp ID', type: 'number' },
        { key: 'created_by', label: 'Created by', type: 'number' },
        { key: 'destination', label: 'Destination', type: 'text' },
        { key: 'departure_date', label: 'Departure date', type: 'date' },
        { key: 'expected_return_date', label: 'Expected return', type: 'date' },
        { key: 'max_return_date', label: 'Max return', type: 'date' },
        { key: 'actual_return_date', label: 'Actual return', type: 'date' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
        {
          key: 'members',
          label: 'Members (JSON)',
          type: 'json',
          placeholder: '[{"person_id": 1}]',
        },
        {
          key: 'allocated_resources',
          label: 'Allocated resources (JSON)',
          type: 'json',
          placeholder: '[{"resource_type_id": 1, "amount": 2}]',
        },
      ],
      requiresId: true,
    },
    deleteAction: {
      key: 'delete',
      label: 'Delete expedition',
      method: 'DELETE',
      path: '/expeditions/:id',
      fields: [
        { key: 'changed_by', label: 'Changed by', type: 'number', required: true },
        {
          key: 'return_member_status',
          label: 'Return member status',
          type: 'select',
          options: personStatusOptions,
        },
      ],
      requiresId: true,
    },
    actions: [
      {
        key: 'status',
        label: 'Update expedition status',
        method: 'PATCH',
        path: '/expeditions/:id/status',
        fields: [
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: expeditionStatusOptions,
            required: true,
          },
          { key: 'actual_return_date', label: 'Actual return', type: 'date' },
          { key: 'notes', label: 'Notes', type: 'textarea' },
          { key: 'changed_by', label: 'Changed by', type: 'number', required: true },
          {
            key: 'resources_to_return',
            label: 'Resources to return (JSON)',
            type: 'json',
            placeholder: '[{"resource_type_id": 1, "amount": 2}]',
          },
          {
            key: 'members',
            label: 'Members (JSON)',
            type: 'json',
            placeholder: '[{"person_id": 1}]',
          },
          {
            key: 'return_member_status',
            label: 'Return member status',
            type: 'select',
            options: personStatusOptions,
          },
        ],
        requiresId: true,
      },
    ],
  },
  {
    key: 'transfers',
    label: 'Transfers',
    route: 'transfers',
    list: { key: 'list', label: 'Transfers', path: '/transfers' },
    create: {
      key: 'create',
      label: 'Create transfer',
      method: 'POST',
      path: '/transfers',
      fields: [
        { key: 'requesting_camp', label: 'Requesting camp', type: 'number', required: true },
        { key: 'target_camp', label: 'Target camp', type: 'number', required: true },
        { key: 'type', label: 'Transfer type', type: 'select', options: transferTypeOptions },
        { key: 'notes', label: 'Notes', type: 'textarea' },
        { key: 'requested_by', label: 'Requested by', type: 'number', required: true },
        { key: 'leader_person_id', label: 'Leader person ID', type: 'number' },
        { key: 'scheduled_delivery_date', label: 'Scheduled delivery', type: 'datetime' },
        {
          key: 'items',
          label: 'Items (JSON)',
          type: 'json',
          placeholder: '[{"item_type": "RESOURCE", "resource_type_id": 1, "quantity": 5}]',
          required: true,
        },
      ],
    },
    actions: [
      {
        key: 'schedule',
        label: 'Schedule delivery',
        method: 'PATCH',
        path: '/transfers/:id/schedule',
        fields: [
          {
            key: 'scheduled_delivery_date',
            label: 'Scheduled delivery',
            type: 'datetime',
            required: true,
          },
        ],
        requiresId: true,
      },
      {
        key: 'approve-source',
        label: 'Approve by source',
        method: 'PATCH',
        path: '/transfers/:id/approve-source',
        fields: [
          { key: 'notes', label: 'Notes', type: 'textarea' },
          { key: 'scheduled_delivery_date', label: 'Scheduled delivery', type: 'datetime' },
        ],
        requiresId: true,
      },
      {
        key: 'approve-target',
        label: 'Approve by target',
        method: 'PATCH',
        path: '/transfers/:id/approve-target',
        fields: [{ key: 'notes', label: 'Notes', type: 'textarea' }],
        requiresId: true,
      },
      {
        key: 'complete',
        label: 'Complete transfer',
        method: 'PATCH',
        path: '/transfers/:id/complete',
        fields: [
          { key: 'notes', label: 'Notes', type: 'textarea' },
          {
            key: 'person_status',
            label: 'Person status',
            type: 'select',
            options: transferItemStatusOptions,
          },
        ],
        requiresId: true,
      },
      {
        key: 'reject',
        label: 'Reject transfer',
        method: 'PATCH',
        path: '/transfers/:id/reject',
        fields: [{ key: 'reason', label: 'Reason', type: 'textarea', required: true }],
        requiresId: true,
      },
    ],
  },
];
