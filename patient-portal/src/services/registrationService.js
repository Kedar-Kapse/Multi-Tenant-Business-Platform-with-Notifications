import api, { ACCESS_SECURITY } from './api';

const AUTH = `${ACCESS_SECURITY}/api/auth`;

export const registrationApi = {
  requestOtp: (identifier, channel, purpose) =>
    api.post(`${AUTH}/otp/generate`, { identifier, channel, purpose }).then(r => r.data),

  verifyOtp: (identifier, otpCode, purpose) =>
    api.post(`${AUTH}/otp/verify`, { identifier, otpCode, purpose }).then(r => r.data),

  resendOtp: (identifier, channel, purpose) =>
    api.post(`${AUTH}/otp/resend`, { identifier, channel, purpose }).then(r => r.data),

  completeRegistration: (verificationToken, password) =>
    api.post(`${AUTH}/register/complete`, { verificationToken, password }).then(r => r.data),

  resetPassword: (verificationToken, password) =>
    api.post(`${AUTH}/forgot-password/complete`, { verificationToken, password }).then(r => r.data),
};
