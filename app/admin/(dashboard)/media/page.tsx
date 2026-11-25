import { connection } from "next/server";
import MediaTools from "./MediaTools";

export const instant = false;

export default async function MediaPage() {
  await connection();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Photo protection</h1>
        <p className="mt-1 text-sm text-neutral-600">Preview, regenerate and batch-process watermarked photographs.</p>
      </header>
      <MediaTools />
    </div>
  );
}
