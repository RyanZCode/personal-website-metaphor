// Inside the "0" div in MenuIndex, which has writingMode: vertical-rl + rotate(180deg).
// left: 25% ends up visually toward the right side of the "0" after the flip
export default function CommandLabel() {
  return (
    <span
      data-command-label
      style={{
        position: 'absolute',
        left: '25%',
        top: '55%',
        transform: 'translateY(-50%)',
        fontFamily: '"Cinzel", serif',
        fontSize: '1.25vw',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: 'rgba(240, 232, 236, 1)',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}
    >
      Command
    </span>
  );
}
