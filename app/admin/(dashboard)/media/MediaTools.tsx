"use client";

import { useActionState } from "react";
import Image from "next/image";
import type { MediaActionState } from "@/lib/admin/media-fields";
import { batchMediaAction, previewMediaAction, saveLogoAction } from "./actions";

const accept = "image/jpeg,image/png,image/webp";
const card = "space-y-3 border border-neutral-200 bg-white p-5";
const field = "block w-full border border-neutral-300 p-2 text-sm";
const button = "min-h-11 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";

function Result({ state }: { state: MediaActionState }) {
  return (
    <div aria-live="polite" className="text-sm">
      {state.error && <p className="text-red-800">{state.error}</p>}
      {state.message && <p>{state.message}</p>}
      {state.resume?.length ? <ul className="mt-2 space-y-1 break-all text-red-800">{state.resume.map((line) => <li key={line}>{line}</li>)}</ul> : null}
    </div>
  );
}

export default function MediaTools() {
  const [preview, previewAction, previewPending] = useActionState(previewMediaAction, {});
  const [logo, logoAction, logoPending] = useActionState(saveLogoAction, {});
  const [batch, batchAction, batchPending] = useActionState(batchMediaAction, {});

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form action={previewAction} className={card}>
        <h2 className="font-bold">Preview watermark</h2>
        <label className="block text-sm">Photo<input name="photo" type="file" accept={accept} required className={field} /></label>
        <label className="block text-sm">
          Profile
          <select name="profile" className={field}>
            <option value="catalog">Catalog</option>
            <option value="project">Project / bulk supply</option>
            <option value="order">Order progress</option>
            <option value="swatch">Material swatch</option>
          </select>
        </label>
        <button disabled={previewPending} className={button}>Generate preview</button>
        <Result state={preview} />
        {preview.preview && <Image src={preview.preview} alt="Watermark preview" width={640} height={640} unoptimized className="h-auto max-w-full" />}
      </form>
      <form action={logoAction} className={card}>
        <h2 className="font-bold">Official brand logo</h2>
        <p className="text-sm text-neutral-600">Upload the approved logo. A transparent PNG works best.</p>
        <label className="block text-sm">Logo<input type="file" name="logo" accept={accept} required className={field} /></label>
        <button disabled={logoPending} className={button}>Save logo</button>
        <Result state={logo} />
      </form>
      <form action={batchAction} className={card + " lg:col-span-2"}>
        <h2 className="font-bold">Regenerate or migrate catalog photos</h2>
        <p className="text-sm text-neutral-600">Enter protected URLs to regenerate from their private originals. For legacy photos, attach clean originals and enter one filename=legacy storage path or URL per line. Existing catalog references will keep pointing to the same photos.</p>
        <label className="block text-sm">Image references<textarea name="entries" required rows={5} className={field} /></label>
        <label className="block text-sm">Legacy originals<input name="originals" type="file" accept={accept} multiple className={field} /></label>
        <label className="flex items-center gap-2 text-sm"><input name="clean_sources" type="checkbox" /> Replacement files are clean originals.</label>
        <button disabled={batchPending} className={button}>Process batch</button>
        <Result state={batch} />
      </form>
    </div>
  );
}
