export function FlairCard({
  img,
  className = "",
}: {
  img: string;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-[20px] bg-black ${className}`}>
      <img
        src={img}
        alt=""
        aria-hidden="true"
        className="mx-auto h-56 w-auto object-contain"
      />
    </div>
  );
}
