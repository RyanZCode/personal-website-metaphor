export default function CharacterPortrait() {
  return (
    <div
      style={{
        position: 'absolute',
        left: '28%',
        right: 0,
        bottom: 0,
        top: 0,
        zIndex: 1,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        WebkitMaskImage:
          'linear-gradient(to right, transparent 0%, black 20%), ' +
          'linear-gradient(to top, transparent 0%, black 8%)',
        maskImage:
          'linear-gradient(to right, transparent 0%, black 20%), ' +
          'linear-gradient(to top, transparent 0%, black 8%)',
        WebkitMaskComposite: 'destination-in',
        maskComposite: 'intersect',
      }}
    >

      <img
        src="/assets/dog.png"
        alt=""
        data-portrait
        style={{
          height: '105%',
          width: 'auto',
          objectFit: 'contain',
          objectPosition: 'bottom center',
          position: 'relative',
          zIndex: 1,
          maxWidth: 'none',
        }}
      />
    </div>
  );
}
