import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { sanitizePlainText } from '@/utils/formatters';

export function CustomerAuth({ mode, setMode, onClose, onAuth, onGoogle }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const googleBtnContainerRef = useRef(null);
  const googleClientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '737261871377-h94rjoa3he6e2s67qr74bhblgqa927cg.apps.googleusercontent.com';

  useEffect(() => {
    let checkInterval = null;

    const initGoogleGsi = () => {
      if (window.google?.accounts?.id && googleClientId && googleBtnContainerRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async response => {
              if (!response?.credential) return;
              setLoading(true);
              setError('');
              try {
                const { data, error: idTokenErr } = await supabase.auth.signInWithIdToken({
                  provider: 'google',
                  token: response.credential
                });
                if (idTokenErr) throw idTokenErr;
                const user = data.user;
                const metadata = user?.user_metadata || {};
                onAuth({
                  name: metadata.full_name || metadata.name || user?.email?.split('@')[0] || 'Food lover',
                  email: user?.email || '',
                  phone: metadata.phone || '',
                  userId: user?.id,
                  avatarUrl: metadata.avatar_url || ''
                });
              } catch (authErr) {
                console.error('Google native sign-in error:', authErr);
                setError(authErr.message || 'Google sign-in failed.');
              } finally {
                setLoading(false);
              }
            }
          });

          // Render Google button directly inside container
          googleBtnContainerRef.current.innerHTML = '';
          const containerW = googleBtnContainerRef.current.offsetWidth;
          const buttonWidth = containerW && containerW >= 200 ? Math.min(containerW, 360) : 320;
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: 'outline',
            size: 'large',
            width: buttonWidth,
            text: mode === 'signup' ? 'signup_with' : 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left'
          });

          if (checkInterval) clearInterval(checkInterval);
        } catch (err) {
          console.warn('GIS initialization error:', err);
        }
      }
    };

    initGoogleGsi();
    if (!window.google?.accounts?.id) {
      checkInterval = setInterval(initGoogleGsi, 300);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [mode, googleClientId]);

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
    const cleanName = sanitizePlainText(name, 50);
    if (!email.trim() || !password || (mode === 'signup' && (!cleanName || !phone.trim()))) {
      setError(mode === 'signup' ? 'Please complete all fields.' : 'Enter your email or phone and password.');
      return;
    }
    if (mode === 'signup') {
      if (cleanName.length < 3) {
        setError('Full name must be at least 3 characters.');
        return;
      }
      if (cleanName.length > 50) {
        setError('Full name cannot exceed 50 characters.');
        return;
      }
      if (phone.replace(/\D/g, '').length !== 10) {
        setError('Phone number must be exactly 10 digits.');
        return;
      }
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
          options: { data: { full_name: cleanName, phone: phone.trim(), account_type: 'customer' } }
        });
        if (authError) throw authError;

        if (data.session) {
          // Immediately upsert customer profile
          await supabase.from('customers').upsert(
            {
              auth_user_id: data.user.id,
              name: cleanName,
              phone: phone.trim()
            },
            { onConflict: 'auth_user_id' }
          );

          onAuth({
            name: cleanName,
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
                  onChange={e => setName(e.target.value.slice(0, 50))}
                  placeholder="Your full name (3-50 letters)"
                  minLength={3}
                  maxLength={50}
                  required
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
              <div
                ref={googleBtnContainerRef}
                style={{
                  width: '100%',
                  minHeight: 44,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  margin: '4px 0'
                }}
              >
                <button type="button" className="google-auth-button" onClick={onGoogle}>
                  <span className="google-g">G</span> Continue with Google
                </button>
              </div>
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
            You can also order directly as a guest without creating an account.
          </small>
        </div>
      </div>
    </div>
  );
}
