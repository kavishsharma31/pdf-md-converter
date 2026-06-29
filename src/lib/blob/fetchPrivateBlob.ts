import { get } from "@vercel/blob";

export async function fetchPrivateBlobAsBuffer(
  pathname: string,
): Promise<Buffer> {
  const result = await get(pathname, {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error("Could not read uploaded PDF.");
  }

  const arrayBuffer = await new Response(result.stream).arrayBuffer();

  return Buffer.from(arrayBuffer);
}
