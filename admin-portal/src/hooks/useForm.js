import { useState, useCallback } from 'react';
import { validateForm } from '../utils/validators';

/**
 * Form state management hook with validation.
 * @param {Object} initialValues - Initial form values
 * @param {Object} validationRules - { fieldName: [validatorFn, ...] }
 * @param {Function} onSubmit - Async submit handler
 */
export default function useForm(initialValues, validationRules = {}, onSubmit) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const setValue = useCallback((field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear error on change
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setValue(name, type === 'checkbox' ? checked : value);
  }, [setValue]);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    // Validate single field on blur
    if (validationRules[name]) {
      const fieldErrors = validateForm({ [name]: values[name] }, { [name]: validationRules[name] });
      setErrors((prev) => ({ ...prev, ...fieldErrors }));
    }
  }, [validationRules, values]);

  const validate = useCallback(() => {
    const formErrors = validateForm(values, validationRules);
    setErrors(formErrors);
    setTouched(Object.keys(validationRules).reduce((acc, k) => ({ ...acc, [k]: true }), {}));
    return Object.keys(formErrors).length === 0;
  }, [values, validationRules]);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      if (err?.response?.data?.errors) {
        setErrors(err.response.data.errors);
      }
    } finally {
      setSubmitting(false);
    }
  }, [validate, onSubmit, values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const setFormValues = useCallback((newValues) => {
    setValues((prev) => ({ ...prev, ...newValues }));
  }, []);

  return {
    values, errors, touched, submitting,
    setValue, handleChange, handleBlur, handleSubmit,
    validate, reset, setFormValues, setErrors,
  };
}
