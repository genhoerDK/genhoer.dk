export default function BackgroundImage({ portrait, landscape, visible = true }) {
    return (
        <picture className={`absolute inset-0 transition-opacity duration-500 bg-ink ${visible ? "opacity-100" : "opacity-0"}`}>
            <source media="(max-width: 768px)" srcSet={portrait} />
            <img src={landscape} className="size-full object-cover opacity-15" loading="lazy" alt="" />
            
            {/* Grain overlay */}
            <div
              className="pointer-events-none absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat',
                backgroundSize: '128px',
              }}
            />

            {/* Vignettes */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.2) 45%, transparent 70%)', }}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 30%)', }}
            />
        </picture>
    );
}