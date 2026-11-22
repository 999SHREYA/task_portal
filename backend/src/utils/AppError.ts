export interface ErrorDetail {
  field: string;
  message: string;
}

// An error we throw on purpose. It carries an HTTP status code so the
// central error handler knows what to send back.
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: ErrorDetail[]
  ) {
    super(message);
  }
}
