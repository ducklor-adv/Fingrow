// Simple SQLite Database Test
import { initDatabase, getDatabase, TABLES, dbHelpers } from './lib/database.js';

console.log('Testing SQLite database...');

async function quickTest() {
  try {
    console.log('Initializing SQLite database...');
    await initDatabase();

    console.log('✅ Database initialized successfully!');

    // Test creating a user
    console.log('Creating test user...');
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      world_id: 'test_world_id',
      referral_code: 'TEST2025'
    };

    const { data: user, error: userError } = await dbHelpers.insert(TABLES.USERS, userData);

    if (userError) {
      console.log('❌ Error creating user:', userError);
    } else {
      console.log('✅ User created successfully:', user);

      // Test selecting the user
      console.log('Selecting user...');
      const { data: users, error: selectError } = await dbHelpers.select(TABLES.USERS, '*', { username: 'testuser' });

      if (selectError) {
        console.log('❌ Error selecting user:', selectError);
      } else {
        console.log('✅ User found:', users[0]);
      }

      // Test updating the user
      console.log('Updating user...');
      const { data: updateResult, error: updateError } = await dbHelpers.update(TABLES.USERS, { full_name: 'Updated Test User' }, { id: user.id });

      if (updateError) {
        console.log('❌ Error updating user:', updateError);
      } else {
        console.log('✅ User updated successfully');
      }

      // Test deleting the user
      console.log('Deleting user...');
      const { data: deleteResult, error: deleteError } = await dbHelpers.delete(TABLES.USERS, { id: user.id });

      if (deleteError) {
        console.log('❌ Error deleting user:', deleteError);
      } else {
        console.log('✅ User deleted successfully');
      }
    }

  } catch (err) {
    console.log('❌ Test failed:', err.message);
    console.error(err);
  }
}

quickTest();