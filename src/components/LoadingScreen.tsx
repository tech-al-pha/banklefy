const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4" role="status" aria-live="polite">
    <div className="h-28 w-28 rounded-full overflow-hidden bg-black">
      <video
        className="h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/banklefy-loader.mp4" type="video/mp4" />
      </video>
    </div>
    <span className="sr-only">Loading</span>
  </div>
);

export default LoadingScreen;
