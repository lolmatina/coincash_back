const bcrypt = require('bcryptjs');

async function findMatchingPassword() {
  const storedHash = '$2a$10$0wsieiZ.Zj0fD1riuxonwuxptWo4YdNdchcB/PvlXTfMZlMfIOL9q';
  
  console.log('🔍 Finding Password That Matches Stored Hash');
  console.log('============================================');
  console.log(`Stored hash: ${storedHash}`);
  console.log('');
  
  // Test common passwords
  const testPasswords = [
    'Lokaloka99!',
    'test123',
    'password123',
    'Lokaloka99',
    'lokaloka99!',
    'Lokaloka99! ',
    ' Lokaloka99!',
    'Lokaloka99!',
    'Lokaloka99!',
    'Lokaloka99!',
  ];
  
  console.log('Testing passwords:');
  for (const password of testPasswords) {
    const matches = await bcrypt.compare(password, storedHash);
    console.log(`"${password}" (length: ${password.length}) -> ${matches ? '✅ MATCH' : '❌ NO MATCH'}`);
  }
  
  console.log('');
  console.log('💡 If none match, the password reset might not have worked correctly.');
}

findMatchingPassword().catch(console.error);
