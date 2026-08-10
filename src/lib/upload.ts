import { supabase } from "@/lib/supabase";

export type UploadFolder = "companies" | "profiles" | "posts" | "groups" | "licenses";

/**
 * Uploads a File or Blob to Supabase Storage bucket 'uploads'
 * under the specified folder ('companies', 'profiles', 'posts', 'groups', 'licenses').
 * Returns the public HTTPS URL of the uploaded file.
 */
export async function uploadToStorage(
  file: File | Blob,
  folder: UploadFolder,
  customFileName?: string
): Promise<string> {
  let fileExt = "png";
  if (file instanceof File && file.name) {
    const ext = file.name.split(".").pop();
    if (ext) fileExt = ext.toLowerCase();
  } else if (file.type) {
    const ext = file.type.split("/")[1];
    if (ext) fileExt = ext.toLowerCase();
  }

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);
  const name = customFileName ? customFileName : `${timestamp}_${randomStr}.${fileExt}`;
  const filePath = `${folder}/${name}`;

  const { data, error } = await supabase.storage
    .from("uploads")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    console.error(`[uploadToStorage] Error uploading to ${filePath}:`, error);
    throw new Error(`Error uploading image: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from("uploads")
    .getPublicUrl(filePath);

  if (!publicUrlData?.publicUrl) {
    throw new Error("Could not retrieve public URL for uploaded file.");
  }

  return publicUrlData.publicUrl;
}
