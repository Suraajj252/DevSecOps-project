import { useNavigate } from "react-router-dom";
import Stack from "@mui/material/Stack";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import ThumbUpOffAltIcon from "@mui/icons-material/ThumbUpOffAlt";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Movie } from "src/types/Movie";
import { usePortal } from "src/providers/PortalProvider";
import { useDetailModal } from "src/providers/DetailModalProvider";
import { formatMinuteToReadable, getRandomNumber } from "src/utils/common";
import NetflixIconButton from "./NetflixIconButton";
import MaxLineTypography from "./MaxLineTypography";
import AgeLimitChip from "./AgeLimitChip";
import QualityChip from "./QualityChip";
import GenreBreadcrumbs from "./GenreBreadcrumbs";
// Trakt has no images of its own - fetch this title's poster live from
// OMDb using its IMDb id.
import { useGetPosterByImdbIdQuery } from "src/store/slices/omdbApiSlice";
import { MEDIA_TYPE } from "src/types/Common";
import { useGetGenresQuery } from "src/store/slices/genre";
import { MAIN_PATH } from "src/constant";

interface VideoCardModalProps {
  video: Movie;
  anchorElement: HTMLElement;
}

export default function VideoCardModal({
  video,
  anchorElement,
}: VideoCardModalProps) {
  const navigate = useNavigate();

  const { data: posterUrl } = useGetPosterByImdbIdQuery(video.imdb_id ?? "", {
    skip: !video.imdb_id,
  });
  const { data: genres } = useGetGenresQuery(MEDIA_TYPE.Movie);
  const setPortal = usePortal();
  const rect = anchorElement.getBoundingClientRect();
  const { setDetailType } = useDetailModal();

  return (
    <Card
      onPointerLeave={() => {
        setPortal(null, null);
      }}
      sx={{
        width: rect.width * 1.5,
        height: "100%",
        borderRadius: "8px",
        overflow: "hidden",
        // --- Glassmorphism surface ------------------------------------
        backgroundColor: (theme) => theme.palette.glass.backgroundStrong,
        backdropFilter: (theme) => theme.palette.glass.blur,
        WebkitBackdropFilter: (theme) => theme.palette.glass.blur,
        border: (theme) => theme.palette.glass.border,
        boxShadow: (theme) => theme.palette.glass.shadow,
        // A quick scale-in entrance (this component only mounts once the
        // user has already hovered a card for a moment, so it should feel
        // like it "pops" into place rather than instantly appearing).
        animation: "netflixCardPortalIn 180ms cubic-bezier(0.4, 0, 0.2, 1)",
        "@keyframes netflixCardPortalIn": {
          from: { opacity: 0, transform: "scale(0.92)" },
          to: { opacity: 1, transform: "scale(1)" },
        },
      }}
    >
      <div
        style={{
          width: "100%",
          position: "relative",
          paddingTop: "calc(9 / 16 * 100%)",
        }}
      >
        <img
          src={posterUrl || ""}
          style={{
            top: 0,
            height: "100%",
            objectFit: "cover",
            position: "absolute",
            backgroundPosition: "50%",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            left: 0,
            right: 0,
            bottom: 0,
            paddingLeft: "16px",
            paddingRight: "16px",
            paddingBottom: "4px",
            position: "absolute",
          }}
        >
          <MaxLineTypography
            maxLine={2}
            sx={{ width: "80%", fontWeight: 700 }}
            variant="h6"
          >
            {video.title}
          </MaxLineTypography>
          <div style={{ flexGrow: 1 }} />
          <NetflixIconButton>
            <VolumeUpIcon />
          </NetflixIconButton>
        </div>
      </div>
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1}>
            <NetflixIconButton
              sx={{ p: 0 }}
              onClick={() => navigate(`/${MAIN_PATH.watch}`)}
            >
              <PlayCircleIcon sx={{ width: 40, height: 40 }} />
            </NetflixIconButton>
            <NetflixIconButton>
              <AddIcon />
            </NetflixIconButton>
            <NetflixIconButton>
              <ThumbUpOffAltIcon />
            </NetflixIconButton>
            <div style={{ flexGrow: 1 }} />
            <NetflixIconButton
              onClick={() => {
                setDetailType({ mediaType: MEDIA_TYPE.Movie, id: video.id });
              }}
            >
              <ExpandMoreIcon />
            </NetflixIconButton>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography
              variant="subtitle1"
              sx={{ color: "success.main" }}
            >{`${getRandomNumber(100)}% Match`}</Typography>
            <AgeLimitChip label={`${getRandomNumber(20)}+`} />
            <Typography variant="subtitle2">{`${formatMinuteToReadable(
              getRandomNumber(180)
            )}`}</Typography>
            <QualityChip label="HD" />
          </Stack>
          {genres && (
            <GenreBreadcrumbs
              genres={genres
                .filter((genre) => video.genre_ids.includes(genre.id))
                .map((genre) => genre.name)}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
