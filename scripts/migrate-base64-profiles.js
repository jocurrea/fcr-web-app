const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('Fetching users...');
  const { data: users, error: fetchError } = await supabase.from('users').select('id, profileImage');
  
  if (fetchError) {
    console.error('Error fetching users:', fetchError);
    return;
  }
  
  let migratedCount = 0;
  for (const user of users) {
    if (user.profileImage && user.profileImage.startsWith('data:image/')) {
      console.log('Migrating profile image for user:', user.id);
      
      const matches = user.profileImage.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        console.error('Invalid base64 string for user:', user.id);
        continue;
      }
      
      const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      const fileName = `${user.id}-${Date.now()}.${extension}`;
      const filePath = `profiles/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, buffer, {
          contentType: `image/${extension}`,
          upsert: true
        });
        
      if (uploadError) {
        console.error('Failed to upload image for user:', user.id, uploadError.message);
        continue;
      }
      
      const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filePath);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ profileImage: publicUrlData.publicUrl })
        .eq('id', user.id);
        
      if (updateError) {
        console.error('Failed to update user:', user.id, updateError.message);
      } else {
        console.log('Successfully migrated user:', user.id);
        migratedCount++;
      }
    }
  }
  console.log(`Migration complete. Total users migrated: ${migratedCount}`);
}

migrate();
