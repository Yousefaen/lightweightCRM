import { useState } from 'react';
import { Mail, ArrowRight, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: { display_name: displayName || email.split('@')[0] },
      },
    });

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Outreach CRM</h1>
          <p className="text-slate-500">Sign in to manage your outreach pipeline</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle size={48} className="mx-auto text-green-500" />
              <h2 className="text-xl font-semibold text-slate-900">Check your email</h2>
              <p className="text-slate-600 text-sm">
                We sent a magic link to <span className="font-medium">{email}</span>.
                Click the link in the email to sign in.
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Your name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Yousef"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Email address *
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    Send Magic Link <ArrowRight size={18} className="ml-2" />
                  </>
                )}
              </button>

              <p className="text-xs text-slate-400 text-center">
                No password needed. We'll email you a sign-in link.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
