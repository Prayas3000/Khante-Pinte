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
      setError(mode === 'signup' ? 'Please complete all fields.' : 'Enter your email or phone and password.');
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
          // Immediately upsert customer profile
          await supabase.from('customers').upsert(
            {
              auth_user_id: data.user.id,
              name: name.trim(),
              phone: phone.trim()
            },
            { onConflict: 'auth_user_id' }
          );

          onAuth({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            userId: data.user?.id,
            avatarUrl: ''
          });
        } else {
          setSuccess('Account created! Please check your email to confirm your account, then log in.');
        }
      } else {
        let loginIdentifier = email.trim();
        const digitsOnly = loginIdentifier.replace(/\D/g, '');

        // If user entered a 10-digit phone number instead of email
        if (digitsOnly.length === 10 && !loginIdentifier.includes('@')) {
          const { data: lookedUpEmail, error: lookupErr } = await supabase.rpc('lookup_email_by_phone', {
            p_phone: digitsOnly
          });
          if (lookedUpEmail) {
            loginIdentifier = lookedUpEmail;
          } else {
            throw new Error('No account found for this phone number. Please enter your email or sign up.');
          }
        }

        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: loginIdentifier,
          password
        });
        if (authError) throw authError;

        // Fetch or create customer profile
        let customerData = null;
        if (data.user?.id) {
          const { data: prof } = await supabase
            .from('customers')
            .select('name, phone, avatar_url')
            .eq('auth_user_id', data.user.id)
            .maybeSingle();
          customerData = prof;
        }

        const metadata = data.user?.user_metadata || {};
        onAuth({
          name: customerData?.name || metadata.full_name || metadata.name || data.user?.email?.split('@')[0] || 'Food lover',
          email: data.user?.email || loginIdentifier,
          phone: customerData?.phone || metadata.phone || '',
          userId: data.user?.id,
          avatarUrl: customerData?.avatar_url || metadata.avatar_url || ''
        });
      }
    } catch (authError) {
      const message = authError.message || 'Could not complete sign in.';
      setError(
        message.toLowerCase().includes('invalid login credentials')
          ? 'Incorrect email/phone or password.'
          : message.toLowerCase().includes('email not confirmed')
          ? 'Your email is not confirmed yet. Please check your inbox or spam folder.'
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
            {mode === 'login' ? 'Email address or 10-digit phone number' : 'Email address'}
            <input
              type={mode === 'login' ? 'text' : 'email'}
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder={mode === 'login' ? 'you@example.com or 98XXXXXXXX' : 'you@example.com'}
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
