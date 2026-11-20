import React from 'react';
import { ChevronRight, ArrowLeft } from 'lucide-react';

export function AdminLogin({
  email,
  setEmail,
  password,
  setPassword,
  onLogin,
  onBack,
  loading,
  error,
  setError,
  forgotMode,
  setForgotMode,
  forgotLoading,
  forgotMessage,
  setForgotMessage,
  onForgot
}) {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-mark large">KP</div>
        <span className="eyebrow">STAFF ONLY</span>
        <h1>
          Admin <em>{forgotMode ? 'recovery' : 'login'}</em>
        </h1>
        <p>
          {forgotMode
            ? 'We will send a password reset link to your admin email.'
            : 'Sign in to manage orders, kitchen, inventory and sales.'}
        </p>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={e => {
              setEmail(e.target.value);
              setError('');
              setForgotMessage('');
            }}
            placeholder="Admin email"
          />
        </label>
        {!forgotMode && (
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                setError('');
              }}
              onKeyDown={e => e.key === 'Enter' && onLogin()}
              placeholder="Enter your password"
            />
          </label>
        )}
        {error && <p className="form-error">{error}</p>}
        {forgotMessage && (
          <p className={forgotMessage.toLowerCase().includes('sent') ? 'form-success' : 'form-error'}>
            {forgotMessage}
          </p>
        )}
        {forgotMode ? (
          <>
            <button
              className="btn-primary full"
              onClick={onForgot}
              disabled={forgotLoading}
            >
              {forgotLoading ? 'Sending request...' : 'Send password reset link'}
            </button>
            <button
              className="text-link"
              onClick={() => {
                setForgotMode(false);
                setForgotMessage('');
                setError('');
              }}
            >
              Back to Admin login
            </button>
          </>
        ) : (
          <>
            <button
              className="btn-primary full"
              onClick={onLogin}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'} {!loading && <ChevronRight />}
            </button>
            <button
              className="text-link"
              onClick={() => {
                setForgotMode(true);
                setError('');
                setForgotMessage('');
              }}
            >
              Forgot password?
            </button>
          </>
        )}
        <button className="back-link" onClick={onBack}>
          <ArrowLeft size={16} /> Back to customer website
        </button>
      </div>
    </div>
  );
}
