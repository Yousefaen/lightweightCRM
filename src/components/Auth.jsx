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
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-zinc-100 via-white to-indigo-50">
      <div className="w-full max-w-md mx-4 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white text-xl font-bold mb-4">O</div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">Outreach CRM</h1>
          <p className="text-zinc-500">Sign in to manage your outreach pipeline</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-zinc-200/60 p-8">
          {sent ? (
            <div className="text-center space-y-4 animate-fade-in">
              <CheckCircle size={48} className="mx-auto text-green-500" />
              <h2 className="text-xl font-semibold text-zinc-900">Check your email</h2>
              <p className="text-zinc-500 text-sm">
                We sent a magic link to <span className="font-medium text-zinc-700">{email}</span>.
                Click the link in the email to sign in.
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Your name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Yousef"
                  className="w-full px-4 py-2.5 h-10 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Email address *
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 h-10 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    Send Magic Link <ArrowRight size={18} className="ml-2" />
                  </>
                )}
              </button>

              <p className="text-xs text-zinc-400 text-center">
                No password needed. We'll email you a sign-in link.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
