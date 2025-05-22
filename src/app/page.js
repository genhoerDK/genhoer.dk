export default function Home() {

  return (
    <>
      <div className="flex justify-center items-center h-screen bg-gray-200">
        <img className="size-1/2 lg:size-1/3" src="/images/logo.svg" alt="Genhør Logo" />
      </div>

      <div className="bg-black px-4 md:px-24 lg:px-48 py-24">
        <p className="text-white md:text-xl text-center">Genhør er en nonprofitorganisation, der i samarbejde med kommuner, arkiver og museer engagerer unge i lokal kulturskabelse og udstiller offentlig tilgængelig lydkunst, der styrker kendskabet til den stedbundne kulturarv og den lokale kulturhistorie.</p>
      </div>

      <div className="flex flex-col justify-center gap-4 px-4 md:px-24 lg:px-48 py-24">
        <h2 className="text-4xl">Projekter</h2>
        <div className="flex gap-4">
          <h3 className="text-orange-400">2024</h3>
          <h3 className="text-green-400">2025</h3>
          <h3 className="text-blue-400">2026</h3>
        </div>
        
        <img className="max-h-screen" src="/images/map.svg" alt="Denmark Map" />
        <div className="flex flex-col flex-wrap gap-4">
          <div className="flex flex-wrap gap-4">
            <h3 className="text-orange-400 inline-block">Grindsted</h3>
          </div>
          <div className="flex flex-wrap gap-4">
            <h3 className="text-green-400 inline-block">Vordingborg</h3>
            <h3 className="text-green-400 inline-block">Faaborg</h3>
            <h3 className="text-green-400 inline-block">Haderslev</h3>
            <h3 className="text-green-400 inline-block">Holbæk</h3>
            <h3 className="text-green-400 inline-block">Køge</h3>
            <h3 className="text-green-400 inline-block">Fredericia</h3>
          </div>
          <div className="flex flex-wrap gap-4">
            <h3 className="text-blue-400 inline-block">Hvide Sande</h3>
            <h3 className="text-blue-400 inline-block">Dianalund</h3>
            <h3 className="text-blue-400 inline-block">Kolding</h3>
          </div>
        </div>
      </div>

      <div className="bg-black px-4 md:px-24 lg:px-48 py-24">
        <h2 className="text-white text-4xl text-center pb-4">Kontakt</h2>
        <p className="text-white md:text-xl text-center pb-4">hej@genhoer.dk</p>
        <p className="text-white md:text-xl text-center">+45 91 61 10 93</p>
      </div>

    </>
  );
}