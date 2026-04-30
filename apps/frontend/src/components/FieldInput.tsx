import type { ChangeEvent } from 'react';
import { FieldConfig } from '../entities';

type FieldInputProps = {
  field: FieldConfig;
  value: string;
  onChange: (value: string) => void;
};

export default function FieldInput({ field, value, onChange }: FieldInputProps) {
  const inputId = `field-${field.key}`;
  const commonProps = {
    id: inputId,
    name: field.key,
    required: field.required,
    readOnly: field.readOnly,
    value,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(event.target.value),
  };

  if (field.type === 'textarea') {
    return (
      <label className="field" htmlFor={inputId}>
        <span>{field.label}</span>
        <textarea {...commonProps} rows={3} placeholder={field.placeholder} />
      </label>
    );
  }

  if (field.type === 'json') {
    return (
      <label className="field" htmlFor={inputId}>
        <span>{field.label}</span>
        <textarea
          {...commonProps}
          className="code-input"
          rows={4}
          placeholder={field.placeholder}
        />
      </label>
    );
  }

  if (field.type === 'select' || field.type === 'boolean') {
    const options = field.type === 'boolean' ? ['true', 'false'] : field.options ?? [];
    return (
      <label className="field" htmlFor={inputId}>
        <span>{field.label}</span>
        <select
          id={inputId}
          name={field.key}
          required={field.required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {!field.required && <option value="">--</option>}
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === 'date') {
    return (
      <label className="field" htmlFor={inputId}>
        <span>{field.label}</span>
        <input type="date" {...commonProps} />
      </label>
    );
  }

  if (field.type === 'datetime') {
    return (
      <label className="field" htmlFor={inputId}>
        <span>{field.label}</span>
        <input type="datetime-local" {...commonProps} />
      </label>
    );
  }

  return (
    <label className="field" htmlFor={inputId}>
      <span>{field.label}</span>
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        step={field.type === 'number' ? 'any' : undefined}
        {...commonProps}
        placeholder={field.placeholder}
      />
    </label>
  );
}
