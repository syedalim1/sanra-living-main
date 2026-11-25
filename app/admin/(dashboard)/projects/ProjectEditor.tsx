"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { adminImageUrl, MAX_PROJECT_PHOTOS } from "@/lib/media/paths";
import type { SupplyProject } from "@/lib/media/projects";
import { deleteProjectAction, saveProjectAction } from "./actions";

type Photo = { key: string; src: string; file?: File };
type EditableProject = SupplyProject & { published: boolean; revision: number };

const field = "mt-1 block w-full border border-neutral-300 p-2 text-sm";
const photoButton = "grid h-11 w-11 place-items-center border border-neutral-200 disabled:opacity-30";

export default function ProjectEditor({ project }: { project?: EditableProject }) {
  const [state, saveAction, saving] = useActionState(saveProjectAction, {});
  const [deleteState, deleteAction, deleting] = useActionState(deleteProjectAction, {});
  const [photos, setPhotos] = useState<Photo[]>(() => (project?.photo_urls ?? []).flatMap((url) => {
    const src = adminImageUrl(url);
    return src ? [{ key: url, src }] : [];
  }));
  const [photoError, setPhotoError] = useState("");
  const previews = useRef(new Set<string>());
  const nextPreview = useRef(0);
  const busy = saving || deleting;

  useEffect(() => {
    const urls = previews.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!files.length) return;
    if (photos.length + files.length > MAX_PROJECT_PHOTOS) {
      setPhotoError("Choose no more than eight photos in total.");
      return;
    }
    setPhotoError("");
    const additions = files.map((file) => {
      const src = URL.createObjectURL(file);
      previews.current.add(src);
      return { key: "local-" + nextPreview.current++, src, file };
    });
    setPhotos((current) => [...current, ...additions]);
  }

  function movePhoto(index: number, direction: number) {
    setPhotos((current) => {
      const ordered = [...current];
      const [photo] = ordered.splice(index, 1);
      ordered.splice(index + direction, 0, photo);
      return ordered;
    });
  }

  function removePhoto(photo: Photo) {
    if (photo.file) {
      URL.revokeObjectURL(photo.src);
      previews.current.delete(photo.src);
    }
    setPhotoError("");
    setPhotos((current) => current.filter(({ key }) => key !== photo.key));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    form.set("ordered_photos", "on");
    let files = 0;
    for (const photo of photos) {
      if (photo.file) form.append("photos", photo.file);
      form.append("photo_order", photo.file ? "upload:" + files++ : photo.key);
    }
    startTransition(() => saveAction(form));
  }

  return (
    <>
      <form onSubmit={submit} className="mt-4 space-y-4">
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
          <label className="sm:col-span-2">Project description<textarea className={field} name="delivery_details" defaultValue={project?.delivery_details ?? ""} maxLength={800} /></label>
        </div>
        <fieldset disabled={busy} className="space-y-3">
          <legend className="font-semibold">Delivery photos</legend>
          <p className="text-sm text-neutral-600">Add up to eight photos. The first one appears on the project card.</p>
          <label className="block">
            Add delivery photos
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPhotos} className={field} />
          </label>
          {photoError && <p role="alert" className="text-sm text-red-800">{photoError}</p>}
          {photos.length > 0 && (
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((photo, index) => (
                <li key={photo.key} className="min-w-0 space-y-2 border border-neutral-200 p-2 text-xs">
                  <Image src={photo.src} alt={"Delivery photo " + (index + 1)} width={200} height={150}
                    unoptimized className="aspect-[4/3] w-full object-contain bg-neutral-100" />
                  <p className="font-medium">{index === 0 ? "Cover photo" : "Photo " + (index + 1)}</p>
                  {photo.file
                    ? <p className="truncate" title={photo.file.name}>{photo.file.name}</p>
                    : <a href={photo.src + "?view=original"} className="underline">Download original</a>}
                  <div className="flex flex-wrap items-center gap-1">
                    <button type="button" disabled={index === 0} onClick={() => movePhoto(index, -1)}
                      aria-label={"Move photo " + (index + 1) + " earlier"} className={photoButton}>
                      <ChevronLeft size={16} aria-hidden="true" />
                    </button>
                    <button type="button" disabled={index === photos.length - 1} onClick={() => movePhoto(index, 1)}
                      aria-label={"Move photo " + (index + 1) + " later"} className={photoButton}>
                      <ChevronRight size={16} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => removePhoto(photo)} className="min-h-11 px-2 underline">
                      Remove <span className="sr-only">photo {index + 1}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </fieldset>
        <label className="flex items-center gap-2"><input name="published" type="checkbox" defaultChecked={project?.published} /> Publish in Our Projects</label>
        <label className="flex items-center gap-2"><input name="approved" type="checkbox" /> These details and photos are approved for public use.</label>
        <button className="min-h-11 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy || (!project && Boolean(state.message))}>
          {saving ? "Saving…" : "Save project"}
        </button>
        <p aria-live="polite" className={state.error ? "text-sm text-red-800" : "text-sm"}>{state.error ?? state.message}</p>
      </form>
      {project && (
        <details className="mt-4 border-t border-neutral-200 pt-4">
          <summary className="cursor-pointer text-sm font-semibold text-red-800">Delete project</summary>
          <form action={deleteAction} className="mt-3 space-y-2 text-sm">
            <input type="hidden" name="id" value={project.id} />
            <input type="hidden" name="revision" value={project.revision} />
            <label className="flex items-center gap-2">
              <input name="confirm_delete" type="checkbox" required /> Permanently delete this project and its photos.
            </label>
            <button disabled={busy} className="min-h-11 border border-red-800 px-4 py-2 font-semibold text-red-800 disabled:opacity-50">
              {deleting ? "Deleting…" : "Delete project"}
            </button>
            <p aria-live="polite" className="text-red-800">{deleteState.error ?? deleteState.message}</p>
          </form>
        </details>
      )}
    </>
  );
}
