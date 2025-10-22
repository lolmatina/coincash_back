const bcrypt = require('bcryptjs');

async function testPasswordHashing() {
  const password = 'Lokaloka99!';
  
  console.log('🔍 Password Hashing Test');
  console.log('========================');
  console.log(`Password: ${password}`);
  console.log(`Password length: ${password.length}`);
  console.log('');
  
  // Hash the password with the same settings as the app
  const hashedPassword = await bcrypt.hash(password, 10);
  
  console.log('Generated hash:');
  console.log(hashedPassword);
  console.log('');
  
  // Test comparison
  const isValid = await bcrypt.compare(password, hashedPassword);
  console.log(`Hash comparison test: ${isValid}`);
  console.log('');
  
  // Compare with stored hash
  const storedHash = '$2a$10$0wsieiZ.Zj0fD1riuxonwuxptWo4YdNdchcB/PvlXTfMZlMfIOL9q';
  const storedComparison = await bcrypt.compare(password, storedHash);
  
  console.log('Database comparison:');
  console.log(`Stored hash: ${storedHash}`);
  console.log(`Password matches stored hash: ${storedComparison}`);
  console.log('');
  
  // Test with different variations
  console.log('Testing variations:');
  const variations = [
    'Lokaloka99!',
    'lokaloka99!',
    'Lokaloka99',
    'Lokaloka99! ',
    ' Lokaloka99!',
  ];
  
  for (const variation of variations) {
    const matches = await bcrypt.compare(variation, storedHash);
    console.log(`"${variation}" (length: ${variation.length}) -> ${matches}`);
  }
}

testPasswordHashing().catch(console.error);
