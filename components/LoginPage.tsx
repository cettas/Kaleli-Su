import React, { useState } from 'react';
import { User } from '../types';
import { DEFAULT_USERS } from '../constants';

interface LoginPageProps {
  role: "Ofis Personeli" | "Kurye" | "Admin";
  onLogin: (user: User) => void;
  onCancel: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ role, onLogin, onCancel }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const roleConfig = {
    "Ofis Personeli": {
      icon: 'fa-desktop',
      gradient: 'from-indigo-500 to-purple-500',
      bgLight: 'from-indigo-50 to-purple-50',
      title: 'OFİS PERSONELİ GİRİŞİ'
    },
    "Kurye": {
      icon: 'fa-motorcycle',
      gradient: 'from-amber-500 to-orange-500',
      bgLight: 'from-amber-50 to-orange-50',
      title: 'KURYE GİRİŞİ'
    },
    "Admin": {
      icon: 'fa-user-shield',
      gradient: 'from-rose-500 to-pink-500',
      bgLight: 'from-rose-50 to-pink-50',
      title: 'ADMİN GİRİŞİ'
    }
  };

  const config = roleConfig[role];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate loading for better UX
    setTimeout(() => {
      const user = DEFAULT_USERS.find(u => u.username === username && u.password === password && u.role === role);

      if (user) {
        onLogin(user);
      } else {
        setError('Kullanıcı adı veya şifre hatalı!');
        setIsLoading(false);
      }
    }, 500);
  };

  const demoCredentials = {
    "Admin": { username: 'admin', password: 'admin123' },
    "Ofis Personeli": { username: 'ofis', password: 'ofis123' },
    "Kurye": { username: 'kurye', password: 'kurye123' }
  };

  const demo = demoCredentials[role];

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-scale-in">
        <div className="bg-white/10 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl border border-white/10">
          {/* Logo & Icon */}
          <div className="text-center mb-8">
            <div className="relative inline-flex mb-6">
              <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient} rounded-[2.5rem] blur-xl opacity-50 animate-glow`} />
              <div className={`relative w-24 h-24 bg-gradient-to-br ${config.gradient} rounded-[2.5rem] flex items-center justify-center text-white text-4xl shadow-2xl border border-white/20`}>
                <i className={`fas ${config.icon}`}></i>
              </div>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase mb-2">SUDAĞITIM <span className="text-indigo-400">PRO</span></h1>
            <p className={`bg-gradient-to-r ${config.bgLight} bg-clip-text text-transparent font-bold text-sm uppercase tracking-[0.2em]`}>
              {config.title}
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                Kullanıcı Adı
              </label>
              <div className="relative">
                <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl px-5 py-4 pl-12 text-white font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-500"
                  placeholder="Kullanıcı adınız"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                Şifre
              </label>
              <div className="relative">
                <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl px-5 py-4 pl-12 text-white font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-500"
                  placeholder="Şifreniz"
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl px-4 py-3 text-rose-300 text-sm font-bold flex items-center gap-3 animate-slide-in-down">
                <div className="w-8 h-8 bg-rose-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <i className="fas fa-exclamation-circle text-rose-400"></i>
                </div>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-gradient-to-r ${config.gradient} text-white font-black uppercase tracking-wider py-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3`}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner animate-spin"></i>
                  <span>Giriş Yapılıyor...</span>
                </>
              ) : (
                <>
                  <span>GİRİŞ YAP</span>
                  <i className="fas fa-arrow-right"></i>
                </>
              )}
            </button>
          </form>

          {/* Cancel Button */}
          <button
            onClick={onCancel}
            className="w-full mt-6 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-widest py-3 transition-all flex items-center justify-center gap-2 group"
          >
            <i className="fas fa-arrow-left group-hover:-translate-x-1 transition-transform"></i>
            <span>Geri Dön</span>
          </button>

          {/* Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-slate-700/50">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-4">
              Demo Giriş Bilgileri
            </p>
            <div className="bg-slate-900/50 rounded-2xl p-4 space-y-3 border border-slate-700/30">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400 text-xs font-medium">Kullanıcı:</span>
                <button
                  type="button"
                  onClick={() => setUsername(demo.username)}
                  className="text-white font-mono text-sm font-bold hover:text-indigo-400 transition-colors flex items-center gap-2"
                >
                  {demo.username}
                  <i className="fas fa-copy text-[10px] text-slate-500 hover:text-indigo-400"></i>
                </button>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400 text-xs font-medium">Şifre:</span>
                <button
                  type="button"
                  onClick={() => setPassword(demo.password)}
                  className="text-white font-mono text-sm font-bold hover:text-indigo-400 transition-colors flex items-center gap-2"
                >
                  {demo.password}
                  <i className="fas fa-copy text-[10px] text-slate-500 hover:text-indigo-400"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
