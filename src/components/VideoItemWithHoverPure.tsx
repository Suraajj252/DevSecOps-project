import { PureComponent, ForwardedRef, forwardRef } from "react";

type VideoItemWithHoverPureType = {
  src: string;
  innerRef: ForwardedRef<HTMLDivElement>;
  handleHover: (value: boolean) => void;
};

// Local UI-only state: whether the pointer is currently over this card.
// This drives the glassmorphism scale/glow effect below and is separate
// from `handleHover`, which tells the PARENT component (VideoItemWithHover)
// to open the bigger preview portal - two different concerns, two different
// pieces of state.
type VideoItemWithHoverPureState = {
  isHovered: boolean;
};

class VideoItemWithHoverPure extends PureComponent<
  VideoItemWithHoverPureType,
  VideoItemWithHoverPureState
> {
  state: VideoItemWithHoverPureState = {
    isHovered: false,
  };

  render() {
    // Track hover state locally (in addition to bubbling it up via
    // handleHover) purely so THIS component can drive its own inline
    // scale/glow styles without needing MUI's styled()/sx system, since
    // this is a plain class component.
    const { isHovered } = this.state;

    return (
      <div
        ref={this.props.innerRef}
        style={{
          zIndex: 9,
          cursor: "pointer",
          borderRadius: "6px",
          width: "100%",
          position: "relative",
          paddingTop: "calc(9 / 16 * 100%)",
          // "Glassmorphism" card frame: a soft frosted border plus a
          // gentle ambient shadow that intensifies on hover, giving cards
          // a sense of floating above the background like frosted glass.
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: isHovered
            ? "0 12px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.14)"
            : "0 2px 8px rgba(0,0,0,0.3)",
          // The actual "card scale on hover" effect: grows slightly and
          // lifts up, using a Netflix-style cubic-bezier ease so it feels
          // snappy rather than linear/robotic.
          transform: isHovered
            ? "scale(1.08) translateY(-6px)"
            : "scale(1) translateY(0)",
          transition:
            "transform 300ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1)",
          transformOrigin: "center center",
          overflow: "hidden",
        }}
      >
        <img
          src={this.props.src}
          style={{
            top: 0,
            height: "100%",
            width: "100%",
            objectFit: "cover",
            position: "absolute",
            borderRadius: "6px",
          }}
          onPointerEnter={() => {
            this.setState({ isHovered: true });
            this.props.handleHover(true);
          }}
          onPointerLeave={() => {
            this.setState({ isHovered: false });
            this.props.handleHover(false);
          }}
        />
        {/* Frosted-glass sheen: a very faint gradient overlay that only
            shows up on hover, reinforcing the "glass" look without
            obscuring the poster artwork underneath. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "6px",
            pointerEvents: "none",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 40%)",
            opacity: isHovered ? 1 : 0,
            transition: "opacity 300ms ease",
          }}
        />
      </div>
    );
  }
}

const VideoItemWithHoverRef = forwardRef<
  HTMLDivElement,
  Omit<VideoItemWithHoverPureType, "innerRef">
>((props, ref) => <VideoItemWithHoverPure {...props} innerRef={ref} />);
VideoItemWithHoverRef.displayName = "VideoItemWithHoverRef";

export default VideoItemWithHoverRef;
