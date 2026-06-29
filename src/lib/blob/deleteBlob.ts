import { del } from "@vercel/blob";

export async function deleteBlob(pathname: string): Promise<void> {
  await del(pathname, { token: process.env.BLOB_READ_WRITE_TOKEN });
}
