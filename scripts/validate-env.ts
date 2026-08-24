import { validateMercadoPagoEnv } from '../src/lib/envValidation.js';

console.log('🔍 Iniciando verificación de variables de entorno de Mercado Pago y Conexa RMX...\n');

try {
  const result = validateMercadoPagoEnv();

  if (result.warnings.length > 0) {
    console.warn('⚠️ ADVERTENCIAS:');
    result.warnings.forEach(w => console.warn(`   ${w}`));
    console.log('');
  }

  if (!result.isValid) {
    console.error('❌ ERRORES DE CONFIGURACIÓN DETECTADOS:');
    result.errors.forEach(err => console.error(`   ${err}`));
    console.error('\n💥 La verificación falló. Revisa y corrige las variables de entorno especificadas.');
    process.exit(1);
  } else {
    console.log('✅ TODAS LAS VARIABLES DE ENTORNO REQUERIDAS ESTÁN PRESENTES Y TIENEN FORMATO VÁLIDO:');
    console.log('   - MP_APP_ID: VÁLIDO');
    console.log('   - MP_CLIENT_SECRET: VÁLIDO');
    console.log('   - MP_TOKEN_ENCRYPTION_KEY: VÁLIDO (Base64 de 32 bytes)');
    console.log('   - MP_OAUTH_STATE_SECRET: VÁLIDO');
    console.log('   - MP_WEBHOOK_SECRET: VÁLIDO');
    console.log('   - APP_URL: VÁLIDO');
    console.log('   - CONEXA_PLATFORM_FEE_PERCENT: VÁLIDO');
    console.log('\n🎉 ¡Inicialización y verificación completadas con éxito!');
    process.exit(0);
  }
} catch (err: any) {
  console.error('\n❌ ERROR AL EJECUTAR LA VALIDACIÓN:');
  console.error(err?.message || err);
  process.exit(1);
}
