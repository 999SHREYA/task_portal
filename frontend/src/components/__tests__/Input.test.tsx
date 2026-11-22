import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import Input from '../ui/Input';

describe('Input', () => {
  it('connects the label to the input', async () => {
    render(<Input label="Email" />);
    const input = screen.getByLabelText('Email');
    await userEvent.type(input, 'a@b.com');
    expect(input).toHaveValue('a@b.com');
  });

  it('shows the error and marks the input invalid for screen readers', () => {
    render(<Input label="Email" error="Enter a valid email address" />);
    const input = screen.getByLabelText('Email');

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a valid email address');
  });

  it('shows a hint when there is no error', () => {
    render(<Input label="Name" hint="Your full name" />);
    expect(screen.getByText('Your full name')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid');
  });
});
