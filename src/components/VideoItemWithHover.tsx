import { useEffect, useState, useRef } from "react";
import { Movie } from "src/types/Movie";
import { usePortal } from "src/providers/PortalProvider";
// Trakt has no images of its own, so we look up a poster live from OMDb using
// this title's IMDb id. RTK Query caches this per imdb_id automatically, so
// re-rendering the same card never re-fetches its poster twice.
import { useGetPosterByImdbIdQuery } from "src/store/slices/omdbApiSlice";
import VideoItemWithHoverPure from "./VideoItemWithHoverPure";
interface VideoItemWithHoverProps {
  video: Movie;
}

export default function VideoItemWithHover({ video }: VideoItemWithHoverProps) {
  const setPortal = usePortal();
  const elementRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Skip the request entirely if this title has no imdb_id to look up.
  const { data: posterUrl } = useGetPosterByImdbIdQuery(video.imdb_id ?? "", {
    skip: !video.imdb_id,
  });

  useEffect(() => {
    if (isHovered) {
      setPortal(elementRef.current, video);
    }
  }, [isHovered]);

  return (
    <VideoItemWithHoverPure
      ref={elementRef}
      handleHover={setIsHovered}
      src={posterUrl || ""}
    />
  );
}
