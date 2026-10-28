import { get } from "@vercel/blob";
import { getFileForDownload } from "@/server/data/project-updates";
import { getViewer } from "@/server/auth/viewer";

// Downloads of uploaded files. Files are private in Vercel Blob; this route
// checks that the signed-in person can see the file's project before streaming
// it, so a shared or guessed link is useless to anyone else.

export async function GET(_request: Request, { params }: RouteContext<"/api/files/[id]">) {
  const viewer = await getViewer();
  if (!viewer) return new Response("Please sign in.", { status: 401 });

  const file = await getFileForDownload(viewer, (await params).id);
  if (!file) return new Response("Not found.", { status: 404 });
  // Seed files are static sample documents in /public.
  if (file.isSeed) return Response.redirect(new URL(file.blobUrl, _request.url), 302);

  const blob = await get(file.blobPathname, { access: "private" });
  if (!blob || blob.statusCode !== 200) return new Response("Not found.", { status: 404 });

  return new Response(blob.stream, {
    headers: {
      "content-type": file.contentType,
      "content-disposition": `inline; filename="${file.name.replace(/"/g, "")}"`,
      "x-content-type-options": "nosniff",
      "cache-control": "private, no-store",
    },
  });
}
