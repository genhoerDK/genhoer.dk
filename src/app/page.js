export default function Home() {

  return (
    <>
      {/* Landing Page Hero */}
      <section className="flex justify-center items-end h-svh px-8">
        <div className='absolute inset-0 size-full bg-zinc-50 opacity-75 z-0'></div> {/* Hero Underlay */}
        <div className="container w-3xl text-center py-24 z-10">
          <h2 className="font-rem font-thin text-5xl uppercase">Et lydligt vindue til den nære Danmarkshistorie</h2>
          <p className="py-4">Genhør er en nonprofitorganisation, der i samarbejde med kommuner, arkiver og museer engagerer unge i lokal kulturskabelse og udstiller offentlig tilgængelig lydkunst, der styrker kendskabet til den stedbundne kulturarv og den lokale kulturhistorie.</p>
        </div>
      </section>
    </>
  );
}