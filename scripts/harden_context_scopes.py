from pathlib import Path

path = Path('src/context/AppContext.tsx')
text = path.read_text(encoding='utf-8')

old = '''    const unsubReports = onSnapshot(collection(firestoreDb, 'reports'), (snapshot) => {
      const list: UserReport[] = [];
      snapshot.forEach(doc => list.push(doc.data() as UserReport));
      setReports(list);
    });

    const unsubVerifications = onSnapshot(collection(firestoreDb, 'verifications'), (snapshot) => {
      const list: VerificationRequest[] = [];
      snapshot.forEach(doc => list.push(doc.data() as VerificationRequest));
      setVerifications(list);
    });
'''

new = '''    let unsubReports = () => {};
    let unsubVerifications = () => {};

    const syncModerationData = async (user: any | null) => {
      unsubReports();
      unsubVerifications();
      unsubReports = () => {};
      unsubVerifications = () => {};
      setReports([]);
      setVerifications([]);

      if (!user) return;

      try {
        const tokenResult = await user.getIdTokenResult();
        const isAdminClaim = tokenResult.claims.role === 'ADMIN' || tokenResult.claims.role === 'SUPER_ADMIN';

        if (isAdminClaim) {
          unsubReports = onSnapshot(
            collection(firestoreDb, 'reports'),
            snapshot => setReports(snapshot.docs.map(reportDoc => reportDoc.data() as UserReport)),
            error => console.warn('[Firestore] Error sincronizando reportes administrativos:', error)
          );
          unsubVerifications = onSnapshot(
            collection(firestoreDb, 'verifications'),
            snapshot => setVerifications(snapshot.docs.map(verificationDoc => verificationDoc.data() as VerificationRequest)),
            error => console.warn('[Firestore] Error sincronizando verificaciones administrativas:', error)
          );
        } else {
          unsubVerifications = onSnapshot(
            query(collection(firestoreDb, 'verifications'), where('userId', '==', user.uid)),
            snapshot => setVerifications(snapshot.docs.map(verificationDoc => verificationDoc.data() as VerificationRequest)),
            error => console.warn('[Firestore] Error sincronizando verificaciones propias:', error)
          );
        }
      } catch (error) {
        console.warn('[Firestore] No se pudo determinar el alcance administrativo de la sesión:', error);
      }
    };

    void syncModerationData(firebaseAuth.currentUser);
    const unsubAuthModeration = firebaseAuth.onAuthStateChanged(user => {
      void syncModerationData(user);
    });
'''

if old not in text:
    raise SystemExit('MODERATION_LISTENER_BLOCK_NOT_FOUND')
text = text.replace(old, new, 1)
text = text.replace('      unsubReports();\n      unsubVerifications();\n      unsubClientTransactions();', '      unsubReports();\n      unsubVerifications();\n      unsubAuthModeration();\n      unsubClientTransactions();', 1)
path.write_text(text, encoding='utf-8')
