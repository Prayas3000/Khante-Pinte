import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function CustomerAuth({ mode, setMode, onClose, onAuth, onGoogle }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const requestCustomerReset = async () => {
    setError('');
    setSuccess('');
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin
      });
      if (resetError) throw resetError;
      setSuccess(
        'If this email has an account, a password reset link has been sent. Check your inbox and spam folder.'
      );
    } catch (resetError) {
      setError(resetError.message || 'Could not send the reset email.');
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setError('');
    setSuccess('');
    if (!email.trim() || !password || (mode === 'signup' && (!name.trim() || !phone.trim()))) {
      setError(mode === 'signup' ? 'Please complete all fields.' : 'Enter your email and password.');
      return;
    }
    if (mode === 'signup' && phone.replace(/\D/g, '').length !== 10) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim(), phone: phone.trim(), account_type: 'customer' } }
        });
        if (authError) throw authError;
        if (data.session) {
          onAuth({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            userId: data.user?.id,
            avatarUrl: ''
          });
        } else {
          setSuccess('Account created. Check your email to confirm your account, then log in.');
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (authError) throw authError;
        const metadata = data.user?.user_metadata || {};
        onAuth({
          name: metadata.full_name || metadata.name || 'Food lover',
          email: data.user?.email || email.trim(),
          phone: metadata.phone || '',
          userId: data.user?.id,
          avatarUrl: metadata.avatar_url || ''
        });
      }
    } catch (authError) {
      const message = authError.message || 'Could not complete sign in.';
      setError(
        message.toLowerCase().includes('invalid login credentials')
          ? 'Incorrect email or password.'
          : message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="checkout-modal auth-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">CUSTOMER ACCOUNT</span>
            <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close authentication">
            <X />
          </button>
        </div>
        <div className="checkout-scroll">
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="you@example.com"
            />
          </label>
          {!forgotMode && mode === 'signup' && (
            <>
              <label>
                Full name
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                />
              </label>
              <label>
                Phone number
                <input
                  value={phone}
                  onChange={e =>
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                  }
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit phone number"
                />
              </label>
            </>
          )}
          {!forgotMode && (
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="At least 6 characters"
              />
            </label>
          )}
          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{success}</p>}
          {forgotMode ? (
            <>
              <button
                className="btn-primary full"
                onClick={requestCustomerReset}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send password reset link'}
              </button>
              <button
                className="text-link"
                onClick={() => {
                  setForgotMode(false);
                  setError('');
                  setSuccess('');
                }}
              >
                Back to customer login
              </button>
            </>
          ) : (
            <>
              <button className="btn-primary full" onClick={submit} disabled={loading}>
                {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create account'}
              </button>
              <button className="google-auth-button" onClick={onGoogle}>
                <span className="google-g">G</span> Continue with Google
              </button>
              {mode === 'login' && (
                <button
                  className="text-link"
                  onClick={() => {
                    setForgotMode(true);
                    setError('');
                    setSuccess('');
                  }}
                >
                  Forgot password?
                </button>
              )}
              <p className="guest-note">
                {mode === 'login' ? 'New here?' : 'Already have an account?'}{' '}
                <button
                  className="text-link"
                  onClick={() => {
                    setMode(mode === 'login' ? 'signup' : 'login');
                    setError('');
                    setSuccess('');
                  }}
                >
                  {mode === 'login' ? 'Create an account' : 'Login'}
                </button>
              </p>
              <button className="btn-outline full" onClick={onClose}>
                Continue as guest
              </button>
            </>
          )}
          <small className="prototype-note">
            You can still place an order as a guest. Your account is securely managed by Supabase.
          </small>
        </div>
      </div>
    </div>
  );
}
