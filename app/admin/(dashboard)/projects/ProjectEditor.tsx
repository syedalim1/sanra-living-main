"use client";

import { useActionState } from "react";
import Image from "next/image";
import { adminImageUrl } from "@/lib/media/paths";
import type { SupplyProject } from "@/lib/media/projects";
import { saveProjectAction } from "./actions";

const field = "mt-1 block w-full border border-neutral-300 p-2 text-sm";

export default function ProjectEditor({ project }: { project?: SupplyProject & { published: boolean; revision: number } }) {
  const [state, action, pending] = useActionState(saveProjectAction, {});

  return (
    <form action={action} className="mt-4 space-y-4">
      {project && <>
        <input type="hidden" name="id" value={project.id} />
        <input type="hidden" name="revision" value={project.revision} />
      </>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label>Project title<input className={field} name="title" defaultValue={project?.title} maxLength={120} required /></label>
        <label>Product type<input className={field} name="product_type" defaultValue={project?.product_type} maxLength={100} required /></label>
        <label>Delivered quantity<input className={field} name="quantity" type="number" min="1" max="1000000" defaultValue={project?.quantity} required /></label>
        <label>Public location<input className={field} name="location" defaultValue={project?.location} maxLength={120} required /></label>
        <label>Delivery date<input className={field} name="delivery_date" type="date" defaultValue={project?.delivery_date ?? ""} /></label>
        <label className="sm:col-span-2">Delivery details<textarea className={field} name="delivery_details" defaultValue={project?.delivery_details ?? ""} maxLength={800} /></label>
      </div>
      <label className="block">Add authentic photographs<input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple className={field} /></label>
      {Boolean(project?.photo_urls.length) && (
        <div className="flex flex-wrap gap-3">
          {project?.photo_urls.map((url, index) => {
            const src = adminImageUrl(url);
            return src && (
              <div key={url} className="w-36 space-y-2 break-words text-xs">
                <Image src={src} alt={"Project photo " + (index + 1)} width={144} height={100} unoptimized className="aspect-[4/3] object-contain bg-neutral-100" />
                <a href={src + "?view=original"} className="block underline">Download original</a>
                <label className="flex items-center gap-2"><input type="checkbox" name="remove_photo" value={url} /> Remove photo</label>
              </div>
            );
          })}
        </div>
      )}
      <label className="flex items-center gap-2"><input name="published" type="checkbox" defaultChecked={project?.published} /> Publish in Our Projects</label>
      <label className="flex items-center gap-2"><input name="approved" type="checkbox" /> These details and photos are approved for public use.</label>
      <button className="min-h-11 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={pending || (!project && Boolean(state.message))}>Save project</button>
      <p aria-live="polite" className={state.error ? "text-sm text-red-800" : "text-sm"}>{state.error ?? state.message}</p>
    </form>
  );
}
