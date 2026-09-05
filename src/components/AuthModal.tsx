import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'login'
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(defaultTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      if (activeTab === 'register') {
        if (!name.trim()) {
          setErrorMessage('Por favor, ingresá tu nombre completo.');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMessage('Las contraseñas no coinciden.');
          setIsLoading(false);
          return;
        }

        // 1. Firebase Auth Registration
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        // 2. Create User Document in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          name: name.trim(),
          role: 'CLIENT', // Rol base por defecto
          isProfessionalVerified: false,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          rating: 5.0,
          reviewCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        setSuccessMessage('¡Cuenta creada exitosamente! Bienvenido a CONEXA.');
        setTimeout(() => {
          handleClose();
        }, 1200);
      } else {
        // Firebase Auth Login
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        // Ensure user document exists in Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            name: user.displayName || email.split('@')[0],
            role: 'CLIENT',
            isProfessionalVerified: false,
            avatar: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            createdAt: serverTimestamp()
          });
        }

        setSuccessMessage('¡Sesión iniciada con éxito!');
        setTimeout(() => {
          handleClose();
        }, 800);
      }
    } catch (err: any) {
      console.error('Firebase Auth error:', err);
      let msg = 'Ocurrió un error al procesar la solicitud.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'Este correo electrónico ya está registrado. Probá iniciar sesión.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = 'Correo o contraseña incorrectos. Verificá los datos ingresados.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'La contraseña es muy débil. Debe tener al menos 6 caracteres.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'El formato del correo electrónico no es válido.';
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Check / initialize Firestore user doc
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email || '',
          name: user.displayName || user.email?.split('@')[0] || 'Usuario CONEXA',
          role: 'CLIENT',
          isProfessionalVerified: false,
          avatar: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          rating: 5.0,
          reviewCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      setSuccessMessage('¡Acceso con Google completado!');
      setTimeout(() => {
        handleClose();
      }, 800);
    } catch (err: any) {
      console.error('Google Auth error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMessage('No se pudo completar el acceso con Google. Intentá nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 relative overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Subtle decorative glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-red-600/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-blue-600/10 blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 text-white flex items-center justify-center font-black shadow-md shadow-red-600/30">
              CX
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">CONEXA RMX</h3>
              <p className="text-[11px] text-zinc-400">Autenticación Unificada</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs: Iniciar Sesión / Registrarse */}
        <div className="flex bg-zinc-950 p-1 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'bg-slate-900 text-white shadow-sm border border-slate-700'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-sm border border-red-500/40'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Google One-Click Button */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-slate-800 hover:border-slate-700 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continuar con Google</span>
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[11px] font-semibold text-zinc-400 absolute">
            o con tu correo
          </span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {activeTab === 'register' && (
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                <span>Nombre Completo</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Marcelo Rossi"
                required
                className="w-full px-4 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-zinc-400" />
              <span>Correo Electrónico</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu.email@ejemplo.com"
              required
              className="w-full px-4 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Contraseña</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              className="w-full px-4 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          {activeTab === 'register' && (
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Confirmar Contraseña</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repetí la contraseña"
                required
                className="w-full px-4 py-2.5 bg-zinc-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-red-600/30 border border-red-500/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <span>{isLoading ? 'Procesando...' : activeTab === 'register' ? 'Crear Cuenta' : 'Entrar a Mi Cuenta'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Dual profile note */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-zinc-400 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p>
            Tu cuenta te permite solicitar presupuestos como cliente y, una vez verificada tu matrícula, activar el modo profesional para enviar cotizaciones y cobrar.
          </p>
        </div>

      </div>
    </div>
  );
};
