// Form fields with a label and an error message wired up for screen readers.
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
}

// Shared wrapper: label + control + hint/error.
function Field({ id, label, error, hint, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={`field ${error ? 'field-invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="field-hint">{hint}</p>
      )}
    </div>
  );
}

// aria-invalid + aria-describedby let screen readers announce the error.
function useFieldIds(error?: string, givenId?: string) {
  const autoId = useId();
  const id = givenId ?? autoId;
  return { id, 'aria-invalid': Boolean(error) || undefined, 'aria-describedby': error ? `${id}-error` : undefined };
}

export default function Input({ label, error, hint, id, ...rest }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const ids = useFieldIds(error, id);
  return (
    <Field id={ids.id} label={label} error={error} hint={hint}>
      <input {...ids} {...rest} />
    </Field>
  );
}

export function Textarea({ label, error, hint, id, ...rest }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ids = useFieldIds(error, id);
  return (
    <Field id={ids.id} label={label} error={error} hint={hint}>
      <textarea rows={4} {...ids} {...rest} />
    </Field>
  );
}

interface SelectProps extends FieldProps, SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, error, hint, id, options, placeholder, ...rest }: SelectProps) {
  const ids = useFieldIds(error, id);
  return (
    <Field id={ids.id} label={label} error={error} hint={hint}>
      <select {...ids} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
