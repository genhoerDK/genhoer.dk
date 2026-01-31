export const metadata = {
    title: "Info",
    description: "Information om Genhør, vores formål, arbejdsmetoder og samarbejder.",
    alternates: { canonical: "/info", },
};

export default function Info() {

    return (
        <article>

            <section className="flex flex-col justify-center px-2 md:px-4 py-14 md:min-h-screen">
                <div className="grid grid-cols-12 md:grid-cols-24 gap-4 py-8">
                    <div className="col-span-full md:col-start-4 max-w-3xl">
                        <p className="font-light pb-2 md:text-xl">Rundt omkring i land og by står levn fra svundne tider. Jættestuer, slotsruiner, nedlagte jernbanespor og tomme fabrikshaller – alle er de tavse vidner til en verden af i går.</p>
                        <p className="font-light md:text-xl">De er et kig til et fortidigt lokalsamfund, dets borgere og deres liv. Skønt denne materielle arv stadigvæk kan ses, er aktiviteterne de engang husede borte med blæsten, og den første brise førte lyden af dette liv med sig.</p>
                    </div>
                </div>

                <div className="grid grid-cols-12 md:grid-cols-24 gap-4 pt-8 md:pt-16">
                    <div className="col-span-full col-start-3 md:col-span-9 lg:col-span-6 xl:col-span-5 md:col-start-8 lg:col-start-10 xl:col-start-12">
                        <p className="font-light text-xs md:text-sm">Genhør er en nonprofitorganisation, der i samarbejde med lokale aktører engagerer unge i kulturskabelse og udstiller offentlig tilgængelig lydkunst, der styrker kendskabet til den stedbundne kulturarv og den nære danmarkshistorie.</p>
                    </div>
                    <div className="col-span-full col-start-3 md:col-span-9 lg:col-span-6 xl:col-span-5 md:col-start-17 lg:col-start-16 xl:col-start-17">
                        <p className="font-light text-xs md:text-sm">Vi fortolker fortidens liv og lydmiljø på lokalhistoriske lokaliteter og udstiller lydkunst som et ekko fra fortiden i autentiske fysiske rammer. De digitale værker – kompositoriske forløb sammensat af musik, reallyde, personlige anekdoter og arkiveret lydmateriale – afspilles fra rumlige lydanlæg, der lader de besøgende træde ind i et levende erindringsbillede.</p>
                    </div>
                </div>
            </section>


        </article>
    );
}