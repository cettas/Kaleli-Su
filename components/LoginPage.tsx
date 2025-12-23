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

  const roleConfig = {
    "Ofis Personeli": {
      icon: 'fa-desktop',
      color: 'indigo',
      title: 'OFİS PERSONELİ GİRİŞİ'
    },
    "Kurye": {
      icon: 'fa-motorcycle',
      color: 'amber',
      title: 'KURYE GİRİŞİ'
    },
    "Admin": {
      icon: 'fa-user-shield',
      color: 'rose',
      title: 'ADMİN GİRİŞİ'
    }
  };

  const config = roleConfig[role];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = DEFAULT_USERS.find(u => u.username === username && u.password === password && u.role === role);

    if (user) {
      onLogin(user);
    } else {
      setError('Kullanıcı adı veya şifre hatalı!');
    }
  };

  return (
    <div className="h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700">
          {/* Logo & Icon */}
          <div className="text-center mb-8">
            <div className={`w-20 h-20 bg-${config.color}-600 rounded-[2rem] flex items-center justify-center text-white text-4xl mx-auto shadow-2xl shadow-${config.color}-500/20 mb-4`}>
              <i className={`fas ${config.icon}`}></i>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase">SUDAĞITIM <span className="text-indigo-500">PRO</span></h1>
            <p className={`text-${config.color}-400 font-bold text-sm uppercase tracking-widest mt-2`}>{config.title}</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                Kullanıcı Adı
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="Kullanıcı adınız"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                Şifre
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="Şifreniz"
              />
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-sm font-bold text-center">
                <i className="fas fa-exclamation-circle mr-2"></i>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-wider py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
            >
              GİRİŞ YAP
            </button>
          </form>

          {/* Cancel Button */}
          <button
            onClick={onCancel}
            className="w-full mt-4 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-widest py-2 transition-all"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Geri Dön
          </button>

          {/* Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-3">
              Demo Giriş Bilgileri
            </p>
            <div className="bg-slate-900 rounded-xl p-4 space-y-2 text-xs">
              {role === UserRole.ADMIN && (
                <>
                  <div className="flex justify-between text-slate-400">
                    <span>Kullanıcı:</span>
                    <span className="text-white font-mono">admin</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Şifre:</span>
                    <span className="text-white font-mono">admin123</span>
                  </div>
                </>
              )}
              {role === UserRole.OFFICE && (
                <>
                  <div className="flex justify-between text-slate-400">
                    <span>Kullanıcı:</span>
                    <span className="text-white font-mono">ofis</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Şifre:</span>
                    <span className="text-white font-mono">ofis123</span>
                  </div>
                </>
              )}
              {role === UserRole.COURIER && (
                <>
                  <div className="flex justify-between text-slate-400">
                    <span>Kullanıcı:</span>
                    <span className="text-white font-mono">kurye</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Şifre:</span>
                    <span className="text-white font-mono">kurye123</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
