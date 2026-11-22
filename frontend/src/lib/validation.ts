// Small form validators. Each returns an object of field -> error message;
// an empty object means the form is valid.
import type { FieldError } from './api';

export type FormErrors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(values: { email: string; password: string }): FormErrors {
  const errors: FormErrors = {};
  if (!values.email.trim()) errors.email = 'Email is required';
  else if (!EMAIL_RE.test(values.email)) errors.email = 'Enter a valid email address';
  if (!values.password) errors.password = 'Password is required';
  return errors;
}

export function validateProject(values: { name: string; client: string }): FormErrors {
  const errors: FormErrors = {};
  if (values.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
  if (!values.client) errors.client = 'Choose a client';
  return errors;
}

export function validateTask(values: { title: string; dueDate: string }): FormErrors {
  const errors: FormErrors = {};
  if (values.title.trim().length < 2) errors.title = 'Title must be at least 2 characters';
  if (values.dueDate && Number.isNaN(Date.parse(values.dueDate))) errors.dueDate = 'Enter a valid date';
  return errors;
}

// Turns the API's validation details into the same field -> message shape.
export function toFormErrors(details: FieldError[]): FormErrors {
  return Object.fromEntries(details.map((d) => [d.field, d.message]));
}

export const hasErrors = (errors: FormErrors) => Object.keys(errors).length > 0;
