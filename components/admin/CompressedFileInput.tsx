import type { InputHTMLAttributes } from "react";

export default function CompressedFileInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return <input {...props} type="file" />;
}
