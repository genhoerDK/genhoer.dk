import TextBlock from "@/components/TextBlock";
import LabelSmall from "@/components/LabelSmall";
import Marquee from "react-fast-marquee";

export const metadata = {
    title: "Info",
    description: "Information om Genhør, vores formål, arbejdsmetoder og samarbejder.",
    alternates: { canonical: "/info", },
};

export default function Info() {

    const partners = ['billund-kommune', 'bulows-makerspace', 'den-jyske-sparekasses-stoettefond', 'den-kreative-skole', 'fonden-for-sjf-bank', 'fredericia-kommune', 'faaborg-midtfyn-kommune', 'historie-haderslev', 'holbaek-stadsarkiv', 'johan-hoffmann-fonden', 'koege-arkiverne', 'koege-bibliotekerne', 'koege-ungdomsskole', 'kulturkasernen', 'kulturvirket-grindsted', 'mark-museet', 'museum-fredericia', 'nordea-fonden', 'oernes-kunstfond', 'poly-udstillingsplatform', 'region-syddanmark', 'spar-nord-fonden', 'vordingborg-kommune', 'william-demant-fonden']

    return (
        <article>
            <section className="grid grid-cols-24 items-center px-2 md:px-4 py-14 md:min-h-svh">
                <div className="col-span-full md:col-start-4 lg:col-start-4 lg:col-span-18">
                    <TextBlock
                        largeText={[
                            "Rundt omkring i land og by står levn fra svundne tider. Jættestuer, slotsruiner, nedlagte jernbanespor og tomme fabrikshaller – alle er de tavse vidner til en verden af i går.",
                            "De er et kig til et fortidigt lokalsamfund, dets borgere og deres liv. Skønt denne materielle arv stadigvæk kan ses, er aktiviteterne de engang husede borte med blæsten, og den første brise førte lyden af dette liv med sig.",
                        ]}
                        smallText={[
                            "Genhør er en nonprofitorganisation, der i samarbejde med lokale aktører engagerer unge i kulturskabelse og udstiller offentlig tilgængelig lydkunst, der styrker kendskabet til den stedbundne kulturarv og den nære danmarkshistorie.",
                            "Vi fortolker fortidens liv og lydmiljø på lokalhistoriske lokaliteter og udstiller lydkunst som et ekko fra fortiden i autentiske fysiske rammer. De digitale værker – kompositoriske forløb sammensat af musik, reallyde, personlige anekdoter og arkiveret lydmateriale – afspilles fra rumlige lydanlæg, der lader de besøgende træde ind i et levende erindringsbillede.",
                        ]}
                    />
                </div>
            </section>

            <section className="flex flex-col items-center gap-4 py-8 bg-ink text-paper">
                <h2 className="uppercase font-light md:text-lg pt-4">Samarbejdspartnere</h2>
                <Marquee gradient={true} pauseOnHover={false} speed={80} gradientColor="#27272a" gradientWidth={15}>
                    {partners.map(partner => (
                        <img key={partner} src={`/logos/${partner}-logo.svg`} alt="" className="h-8 m-8 md:h-12 md:m-12" />
                    ))}
                </Marquee>
            </section>

            <section className="grid grid-cols-24 px-2 md:px-4 py-24">
                <div className="col-span-full md:col-start-4">
                    <div className="flex gap-8 mb-10">
                        <div className="w-20 pt-1.5">
                            <LabelSmall>Kontakt</LabelSmall>
                        </div>
                        <div className="text-xs md:text-sm font-light space-y-1">
                            <p>hej@genhoer.dk</p>
                            <p>+45 91 61 10 93</p>
                            <p>Sofiendalvej 120</p>
                            <p>5500 Middelfart</p>
                            <p>CVR 44733196</p>
                        </div>
                    </div>
                    <div className="flex gap-8">
                        <div className="w-20 pt-1.5">
                            <LabelSmall>Sociale medier</LabelSmall>
                        </div>
                        <div className="text-xs md:text-sm font-light space-y-1">
                            <a
                                href="https://www.instagram.com/genhoer_dk/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                            >
                                Instagram
                            </a>

                            <a
                                href="https://www.facebook.com/profile.php?id=61559553821169"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                            >
                                Facebook
                            </a>

                            <a
                                href="https://www.linkedin.com/company/genhoer/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                            >
                                LinkedIn
                            </a>
                        </div>
                    </div>
                </div>

            </section>


        </article>
    );
}