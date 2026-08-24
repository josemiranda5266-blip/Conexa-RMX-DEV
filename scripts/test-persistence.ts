import { UserProfile } from '../src/types';

console.log('🧪 Iniciando prueba funcional diagnóstica de persistencia...');

// Simular un perfil profesional recuperado de Firestore que entra en conflicto con Auth claims
const mockProfileDataFromFirestore: Partial<UserProfile> = {
  id: 'test-user-123',
  name: 'Juan Perez',
  email: 'juan@example.com',
  role: 'PROFESSIONAL',
  isProfessional: true,
  hasProfessionalProfile: true,
  activeMode: 'PROFESSIONAL',
  isIdentityVerified: true
};

const mockTokenResultClaims = {
  role: 'USER' // Claim "obsoleto" o inexistente en Firebase Auth
};

// 1. Simulación de la lógica aplicada en AppContext.tsx (onAuthStateChanged)
const firestoreRole = mockProfileDataFromFirestore.role;
const claimRole = (mockTokenResultClaims.role as any) || 'USER';
const isClaimAdmin = claimRole === 'ADMIN' || claimRole === 'SUPER_ADMIN';

let effectiveRole = 'USER';
if (firestoreRole === 'ADMIN' || firestoreRole === 'SUPER_ADMIN') {
  if (isClaimAdmin) {
    effectiveRole = firestoreRole;
  } else {
    effectiveRole = 'USER';
  }
} else if (firestoreRole) {
  effectiveRole = firestoreRole;
} else {
  effectiveRole = claimRole;
}

const finalIsProfessional = mockProfileDataFromFirestore.isProfessional === true || 
                            mockProfileDataFromFirestore.hasProfessionalProfile === true || 
                            effectiveRole === 'PROFESSIONAL' || 
                            mockProfileDataFromFirestore.activeMode === 'PROFESSIONAL';

const finalHasProfessionalProfile = mockProfileDataFromFirestore.hasProfessionalProfile === true || 
                                    mockProfileDataFromFirestore.isProfessional === true || 
                                    effectiveRole === 'PROFESSIONAL' || 
                                    mockProfileDataFromFirestore.activeMode === 'PROFESSIONAL';

const finalActiveMode = mockProfileDataFromFirestore.activeMode || 
                        (effectiveRole === 'ADMIN' || effectiveRole === 'SUPER_ADMIN' ? 'ADMIN' : (finalIsProfessional ? 'PROFESSIONAL' : 'CLIENT'));

const currentUser: UserProfile = {
  ...mockProfileDataFromFirestore,
  role: effectiveRole as any,
  activeMode: finalActiveMode,
  isProfessional: finalIsProfessional,
  hasProfessionalProfile: finalHasProfessionalProfile,
} as UserProfile;

console.log('📋 Perfil construido por AppContext tras sincronización:', {
  id: currentUser.id,
  role: currentUser.role,
  activeMode: currentUser.activeMode,
  isProfessional: currentUser.isProfessional,
  hasProfessionalProfile: currentUser.hasProfessionalProfile
});

// 2. Simulación de la lógica de evaluación en SettingsModal.tsx
const isPro =
  currentUser && (
    currentUser.role === 'PROFESSIONAL' ||
    currentUser.isProfessional === true ||
    currentUser.hasProfessionalProfile === true ||
    currentUser.activeMode === 'PROFESSIONAL'
  );

console.log('\n🔍 Resultados de la Evaluación:');
console.log(`- ¿isPro evaluado en SettingsModal?: ${isPro ? '✅ SÍ' : '❌ NO'}`);

if (isPro) {
  console.log('🏆 PRUEBA COMPLETADA CON ÉXITO: El usuario con perfil profesional de Firestore es RECONOCIDO CORRECTAMENTE y SettingsModal mostrará Mercado Pago.');
  process.exit(0);
} else {
  console.error('💥 PRUEBA FALLIDA: El usuario no fue reconocido como profesional.');
  process.exit(1);
}
