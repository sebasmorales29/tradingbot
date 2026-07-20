export function MarketVisual() {
  return (
    <div className="animate-float relative h-full min-h-[220px] w-full md:min-h-[340px] lg:min-h-[380px]">
      <div className="animate-pulse-glow absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-pulse/25 blur-[80px]" />
      <svg
        viewBox="0 0 640 400"
        className="relative z-10 h-full w-full"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00ADB5" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#00ADB5" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00ADB5" stopOpacity="0.2" />
            <stop offset="40%" stopColor="#00ADB5" />
            <stop offset="100%" stopColor="#EEEEEE" />
          </linearGradient>
        </defs>

        {[80, 140, 200, 260, 320].map((y) => (
          <line
            key={y}
            x1="40"
            x2="600"
            y1={y}
            y2={y}
            stroke="#393E46"
            strokeWidth="1"
          />
        ))}

        <path
          d="M40 290 C 90 280, 120 250, 160 255 C 210 262, 240 210, 290 195 C 340 180, 370 220, 410 160 C 450 105, 490 120, 530 90 C 560 72, 580 85, 600 70 L 600 360 L 40 360 Z"
          fill="url(#areaFill)"
          opacity="0.9"
        />

        <path
          className="chart-path"
          d="M40 290 C 90 280, 120 250, 160 255 C 210 262, 240 210, 290 195 C 340 180, 370 220, 410 160 C 450 105, 490 120, 530 90 C 560 72, 580 85, 600 70"
          stroke="url(#lineGrad)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        <circle cx="410" cy="160" r="6" fill="#00ADB5" />
        <circle cx="410" cy="160" r="14" stroke="#00ADB5" strokeOpacity="0.4" />
        <circle cx="600" cy="70" r="5" fill="#EEEEEE" />
      </svg>
    </div>
  );
}
