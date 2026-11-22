/**
 * The message to show a user for a failed request. The backend always answers
 * errors as { status, error, message, fieldErrors? }.
 */
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const data = err?.response?.data;
  if (data?.message && typeof data.message === 'string') return data.message;
  if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
    const first = Object.values(data.fieldErrors)[0];
    if (first) return String(first);
  }
  if (err?.response?.status === 403) return 'You do not have permission to do this.';
  if (!err?.response && err?.message === 'Network Error') return 'Cannot reach the server. Check your connection.';
  return fallback;
}

export const fieldErrors = (err) => err?.response?.data?.fieldErrors || {};
export const statusOf = (err) => err?.response?.status;
