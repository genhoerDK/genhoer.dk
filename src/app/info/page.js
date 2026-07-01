import TextBlock from "@/components/TextBlock";
import LabelSmall from "@/components/LabelSmall";
import Marquee from "react-fast-marquee";

export const metadata = {
    title: "Info",
    description: "Information om Genhør, vores formål, arbejdsmetoder og samarbejder.",
    alternates: { canonical: "/info", },
};

export default function Info() {

    // Partners and sponsors in alphabetic order
    const partners = [  'billund-kommune', 'bulows-makerspace', 'den-jyske-sparekasses-stoettefond', 'den-kreative-skole', 'esbjerg-kommune', 'ewii', 'fonden-for-sjf-bank', 'fredericia-kommune', 'faaborg-midtfyn-kommune', 'geopark-odsherred', 'historie-haderslev', 'holbaek-stadsarkiv', 'huset-esbjerg', 'johan-hoffmann-fonden', 'koege-arkiverne', 'koege-bibliotekerne', 'koege-ungdomsskole', 'kulturkasernen', 'kulturvirket-grindsted', 'mark-museet', 'museum-fredericia', 'nakskov-2030', 'nordea-fonden', 'nordjyllands-fonden', 'oernes-kunstfond', 'poly-udstillingsplatform', 'region-syddanmark', 'spar-nord-fonden', 'sparekassen-bornholms-fond', 'trelleborg-fonden', 'vordingborg-kommune', 'william-demant-fonden']

    return (
        <article>
            <section className="grid grid-cols-24 items-center px-2 md:px-4 py-14 min-h-svh">
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

            <section className="flex flex-col gap-4 p-2 md:p-8">
                    <div>
                        <LabelSmall>Email</LabelSmall>
                        <p className="text-xs md:text-sm font-light pt-1">hej@genhoer.dk</p>
                    </div>

                    <div>
                        <LabelSmall>Telefon</LabelSmall>
                        <p className="text-xs md:text-sm font-light pt-1">+45 91 61 10 93</p>
                    </div>

                    <div>
                        <LabelSmall>Sociale medier</LabelSmall>
                        <div className="flex gap-4 text-xs md:text-sm font-light pt-1">
                            <a href="https://www.instagram.com/genhoer_dk/" target="_blank" rel="noopener noreferrer">
                                Instagram
                            </a>
                            <a href="https://www.facebook.com/profile.php?id=61559553821169" target="_blank" rel="noopener noreferrer">
                                Facebook
                            </a>
                            <a href="https://www.linkedin.com/company/genhoer/" target="_blank" rel="noopener noreferrer">
                                LinkedIn
                            </a>
                        </div>
                    </div>
            </section>

            <section className="mb-10 md:mb-0 md:p-4 bg-ink text-paper">
                <Marquee gradient={true} pauseOnHover={false} speed={40} gradientColor="#27272a" gradientWidth={80} className="z-0">
                    {partners.map(partner => (
                        <img key={partner} src={`/logos/${partner}-logo.svg`} alt="" className="h-6 m-6" />
                    ))}
                </Marquee>
            </section>

        </article>
    );
}