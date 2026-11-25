import Image from "next/image";

export default function ProjectGallery({ images, title }: { images: string[]; title: string }) {
  if (!images.length) return null;
  const count = images.length;
  const featureFirst = count > 2;

  return (
    <div className="sanra-project-gallery" data-count={count}>
      {images.map((source, index) => {
        const wide = featureFirst && index === 0;
        const fullRow = count > 2 && count % 2 === 0 && index === count - 1;
        return (
          <figure
            className={"sanra-project-photo" + (wide ? " sanra-project-photo--cover" : "") + (fullRow ? " sanra-project-photo--wide" : "")}
            key={source}
          >
            <picture>
              <source media="(max-width: 760px)" srcSet={source + "?size=mobile"} />
              <Image
                fill
                unoptimized
                src={source}
                alt={title + ", delivery photo " + (index + 1) + " of " + count}
                sizes={wide || fullRow ? "(max-width: 760px) 100vw, 55vw" : "(max-width: 760px) 50vw, 28vw"}
              />
            </picture>
          </figure>
        );
      })}
    </div>
  );
}
