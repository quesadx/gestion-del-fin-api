import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../api';
import { useAppState } from '../appState';
import { ActionConfig, EntityConfig, FieldConfig } from '../entities';
import FieldInput from './FieldInput';
import ListPanel from './ListPanel';

type FormState = {
  values: Record<string, string>;
  error: string | null;
  success: string | null;
  loading: boolean;
};

function initValues(fields: FieldConfig[]) {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = field.defaultValue ?? '';
    return acc;
  }, {});
}

function parseValue(field: FieldConfig, raw: string) {
  if (raw === '') return undefined;

  if (field.type === 'number') {
    const value = Number(raw);
    return Number.isNaN(value) ? undefined : value;
  }

  if (field.type === 'boolean') {
    return raw === 'true';
  }

  if (field.type === 'json') {
    return JSON.parse(raw);
  }

  if (field.type === 'datetime') {
    const value = new Date(raw);
    return Number.isNaN(value.getTime()) ? raw : value.toISOString();
  }

  return raw;
}

function buildPayload(fields: FieldConfig[], values: Record<string, string>, campId: string) {
  const payload: Record<string, unknown> = {};

  fields.forEach((field) => {
    const raw = values[field.key] ?? '';
    if (field.autoFromCampId && campId) {
      payload[field.key] = Number(campId);
      return;
    }

    if (raw === '') return;

    payload[field.key] = parseValue(field, raw);
  });

  return payload;
}

function validateRequired(fields: FieldConfig[], values: Record<string, string>, campId: string) {
  const missing = fields.find((field) => {
    if (!field.required) return false;
    if (field.autoFromCampId && campId) return false;
    return !values[field.key];
  });
  return missing?.label;
}

type ActionFormProps = {
  action: ActionConfig;
  selectedId: string;
  setSelectedId: (value: string) => void;
  campId: string;
  apiBaseUrl: string;
  token: string | null;
  onUnauthorized: () => void;
  onSuccess: () => void;
};

function ActionForm({
  action,
  selectedId,
  setSelectedId,
  campId,
  apiBaseUrl,
  token,
  onUnauthorized,
  onSuccess,
}: ActionFormProps) {
  const [state, setState] = useState<FormState>({
    values: initValues(action.fields),
    error: null,
    success: null,
    loading: false,
  });

  useEffect(() => {
    if (!campId) return;
    const updates: Record<string, string> = {};
    action.fields.forEach((field) => {
      if (field.autoFromCampId) {
        updates[field.key] = campId;
      }
    });
    if (Object.keys(updates).length === 0) return;
    setState((prev) => ({
      ...prev,
      values: {
        ...prev.values,
        ...updates,
      },
    }));
  }, [campId, action.fields]);

  const setFieldValue = (key: string, value: string) => {
    setState((prev) => ({
      ...prev,
      values: {
        ...prev.values,
        [key]: value,
      },
    }));
  };

  const reset = () => {
    const nextValues = initValues(action.fields);
    if (campId) {
      action.fields.forEach((field) => {
        if (field.autoFromCampId) {
          nextValues[field.key] = campId;
        }
      });
    }
    setState({ values: nextValues, error: null, success: null, loading: false });
  };

  const handleSubmit = async () => {
    if (action.requiresId && !selectedId) {
      setState((prev) => ({ ...prev, error: 'Select an ID to continue.' }));
      return;
    }

    if (action.path.includes(':campId') && !campId) {
      setState((prev) => ({ ...prev, error: 'Set an active camp ID to continue.' }));
      return;
    }

    const missingField = validateRequired(action.fields, state.values, campId);
    if (missingField) {
      setState((prev) => ({ ...prev, error: `Missing required field: ${missingField}` }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, error: null, success: null, loading: true }));
      const payload = buildPayload(action.fields, state.values, campId);

      await apiFetch({
        baseUrl: apiBaseUrl,
        path: action.path,
        method: action.method,
        token,
        pathParams: { id: selectedId, campId },
        body: Object.keys(payload).length ? payload : undefined,
      });

      setState((prev) => ({
        ...prev,
        loading: false,
        success: `${action.label} succeeded.`,
      }));
      onSuccess();
      reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed.';
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        onUnauthorized();
      }
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  };

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2>{action.label}</h2>
          <p className="muted">
            {action.method} {action.path}
          </p>
        </div>
        {action.requiresId && (
          <label className="field compact">
            <span>ID</span>
            <input
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              placeholder="Select or type an ID"
            />
          </label>
        )}
      </div>
      {action.fields.length > 0 && (
        <div className="form-grid">
          {action.fields.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              value={state.values[field.key] ?? ''}
              onChange={(value) => setFieldValue(field.key, value)}
            />
          ))}
        </div>
      )}
      {state.error && <div className="error">{state.error}</div>}
      {state.success && <div className="success">{state.success}</div>}
      <button className="button" onClick={() => void handleSubmit()} disabled={state.loading}>
        {state.loading ? 'Working...' : action.label}
      </button>
    </section>
  );
}

export default function CrudPage({ entity }: { entity: EntityConfig }) {
  const { token, apiBaseUrl, campId, logout } = useAppState();
  const [selectedId, setSelectedId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const actionForms: ActionConfig[] = [
    ...(entity.create ? [entity.create] : []),
    ...(entity.update ? [entity.update] : []),
    ...(entity.deleteAction ? [entity.deleteAction] : []),
    ...(entity.actions ?? []),
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{entity.label}</h1>
          <p className="muted">Basic CRUD operations for {entity.label.toLowerCase()}.</p>
        </div>
        {selectedId && <div className="selected-id">Selected ID: {selectedId}</div>}
      </div>

      <ListPanel
        title={entity.list.label}
        list={entity.list}
        campId={campId}
        apiBaseUrl={apiBaseUrl}
        token={token}
        refreshKey={refreshKey}
        onSelectId={setSelectedId}
      />

      {entity.secondaryLists?.map((list) => (
        <ListPanel
          key={list.key}
          title={list.label}
          list={list}
          campId={campId}
          apiBaseUrl={apiBaseUrl}
          token={token}
          refreshKey={refreshKey}
        />
      ))}

      {actionForms.map((action) => (
        <ActionForm
          key={action.key}
          action={action}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          campId={campId}
          apiBaseUrl={apiBaseUrl}
          token={token}
          onUnauthorized={logout}
          onSuccess={() => setRefreshKey((value) => value + 1)}
        />
      ))}
    </div>
  );
}
