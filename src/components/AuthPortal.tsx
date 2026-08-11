import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Shield, KeyRound, Mail, User, Phone, CheckCircle2, AlertCircle, Wrench, Users } from 'lucide-react';
import { Role } from '../types';

export const AuthPortal: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('USER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!auth) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-900 rounded-3xl text-center space-y-2">
        <AlertCircle className="mx-auto text-rose-600" size={36} />
        <h4 className="font-bold">Error del Sistema</h4>
        <p className="text-xs">El servicio de Firebase Auth no está inicializado en este entorno.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isLogin) {
        // Sign In
        await signInWithEmailAndPassword(auth, email, password);
        setSuccess('Sesión iniciada con éxito. Redireccionando...');
      } else {
        // Sign Up
        if (!name.trim()) {
          throw new Error('Por favor ingresá tu nombre completo.');
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        // Update Auth Profile
        await updateProfile(firebaseUser, {
          displayName: name,
          photoURL: selectedRole === 'PROFESSIONAL' 
            ? 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=150'
            : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
        });

        // Initialize user document in Firestore to secure their role mapping
        if (db) {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          await setDoc(userDocRef, {
            id: firebaseUser.uid,
            name,
            email,
            phonePrivate: phone,
            avatar: selectedRole === 'PROFESSIONAL' 
              ? 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=150'
              : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
            role: selectedRole,
            joinedDate: new Date().toLocaleDateString('es-AR'),
            activeMode: selectedRole,
            isProfessional: selectedRole === 'PROFESSIONAL',
            hasProfessionalProfile: selectedRole === 'PROFESSIONAL',
            professionName: selectedRole === 'PROFESSIONAL' ? 'Profesional Contratista' : undefined,
            location: {
              city: 'Santiago del Estero',
              province: 'Santiago del Estero',
              country: 'Argentina',
              lat: -27.7834,
              lng: -64.2642,
              approxZone: 'Santiago del Estero - Centro'
            },
            isIdentityVerified: false,
            identityVerificationStatus: 'NONE',
            rating: selectedRole === 'PROFESSIONAL' ? 5.0 : 0,
            reviewCount: 0,
            jobsCompleted: 0,
            trustScore: 60,
            availabilityStatus: 'DISPONIBLE'
          });
        }

        setSuccess('¡Cuenta registrada correctamente!');
      }
    } catch (err: any) {
      console.error('[CONEXA AUTH ERROR]', err);
      let errMsg = err.message || 'Ocurrió un error inesperado.';
      if (err.code === 'auth/email-already-in-use') {
        errMsg = 'Este correo electrónico ya está registrado.';
      } else if (err.code === 'auth/wrong-password') {
        errMsg = 'Contraseña incorrecta.';
      } else if (err.code === 'auth/user-not-found') {
        errMsg = 'No se encontró un usuario con este correo.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'La contraseña debe tener al menos 6 caracteres.';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg rotate-3">
          <Shield size={28} className="-rotate-3" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">CONEXA</h2>
        <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
          Plataforma de contratación segura con resguardo absoluto de datos privados para Santiago del Estero.
        </p>
      </div>

      {/* Login / Register Tab Switcher */}
      <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-2xl border border-slate-200/40 text-xs">
        <button
          onClick={() => { setIsLogin(true); setError(null); }}
          className={`py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
            isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Iniciar Sesión
        </button>
        <button
          onClick={() => { setIsLogin(false); setError(null); }}
          className={`py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
            !isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Registrarse
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 font-medium">
          <AlertCircle size={15} className="shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Authentication Form */}
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
        {!isLogin && (
          <>
            {/* Registration Role Selection Card */}
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">¿Cómo vas a usar la plataforma?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole('USER')}
                  className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    selectedRole === 'USER'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Users size={18} className={selectedRole === 'USER' ? 'text-blue-600' : 'text-slate-400'} />
                  <span className="font-bold">Como Cliente</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('PROFESSIONAL')}
                  className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    selectedRole === 'PROFESSIONAL'
                      ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Wrench size={18} className={selectedRole === 'PROFESSIONAL' ? 'text-emerald-600' : 'text-slate-400'} />
                  <span className="font-bold">Como Profesional</span>
                </button>
              </div>
            </div>

            {/* Full Name Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-800"
                />
              </div>
            </div>

            {/* Private Phone Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Celular (Privado y Protegido)</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="tel"
                  placeholder="Ej. 3855550192"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-800"
                />
              </div>
            </div>
          </>
        )}

        {/* Email Address Input */}
        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Correo Electrónico</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="email"
              required
              placeholder="Ej. juan@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-800"
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Contraseña</label>
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-800"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta Segura'}</span>
          )}
        </button>
      </form>
    </div>
  );
};
