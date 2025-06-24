export default function Home() {

  return (
    <>
      {/* Landing Page Hero */}
      <section className="flex justify-center items-end h-svh px-4 md:px-8">

        {/* Background Video */}
        <video
          className="absolute inset-0 w-full h-full object-cover -z-10 filter grayscale opacity-50"
          src="/testfilm.mp4"
          autoPlay
          loop
          muted
          playsInline
        />

        {/* Hero Underlay */}
        <div className='absolute inset-0 size-full bg-zinc-50 opacity-50 -z-10'></div>
        <div className="container w-full md:w-3xl text-center py-24">
          <h2 className="font-rem font-thin text-3xl md:text-5xl uppercase">Et lydligt vindue til den nære Danmarkshistorie</h2>
          <p className="py-4">Genhør er en nonprofitorganisation, der i samarbejde med kommuner, arkiver og museer engagerer unge i lokal kulturskabelse og udstiller offentlig tilgængelig lydkunst, der styrker kendskabet til den stedbundne kulturarv og den lokale kulturhistorie.</p>
        </div>
      </section>
    </>
  );
}