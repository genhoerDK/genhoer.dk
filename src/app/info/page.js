import Marquee from "react-fast-marquee";
import { partners } from "@/data/partners";
import { colors } from "@/styles/colors";
import TextSection from "@/components/Layout/TextSection";
import Label from "@/components/UI/Label";
import Text from "@/components/UI/Text";

export const metadata = {
    title: "Info",
    description: "Information om Genhør, vores formål, arbejdsmetoder og samarbejder.",
    alternates: { canonical: "/info", },
};

export default function Info() {
    return (
        <article>
            
            <TextSection
                label="Om os"
                largeText={[
                    "Genhør er en nonprofitorganisation, der i samarbejde med lokale aktører engagerer unge i kulturskabelse og udstiller offentlig tilgængelig lydkunst, der styrker kendskabet til den stedbundne kulturarv og den nære danmarkshistorie."
                ]}
                smallText={[
                    "Danmark er en mosaik af lokalsamfund med hver deres særegne historie. Genhør sætter spot på lokalhistorien ved at fortolke fortiden gennem lydkunst, der udstilles netop der hvor den har fundet sted.",
                    "Ved hvert projekt afholdes der workshops for lokale unge mellem 12-24 år. Her udforsker vi historien og gør den levende for publikum gennem lydlige virkemidler.",
                    "Værkerne – kompositoriske forløb sammensat af musik, reallyde,  anekdoter og arkivmateriale – udstilles offentligt tilgængeligt og lader de besøgende træde ind i et lydligt erindringsbillede.",
                    ]}
            />

            <section className="relative w-full bg-ink mb-10 md:mb-0">
              <img src="https://cdn.genhoer.dk/media/info-footer-image.webp" alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />

              <div className="relative text-paper grid grid-cols-[auto_1fr] gap-8 px-gutter md:px-48 py-24">
                <div className="pt-1.25 md:pt-1.75">
                    <Label>Kontakt</Label>
                </div>
                <Text as="div" className="flex flex-col gap-0.5">
                  <p>hej@genhoer.dk</p>
                  <p>91611093</p>
                  <p>Sofiendalvej 120</p>
                  <p>5500 Middelfart</p>
                  <p>CVR 44733196</p>
                </Text>

                <div className="pt-1.25 md:pt-1.75">
                    <Label>Social</Label>
                </div>
                <Text as="div" className="flex flex-col gap-0.5">
                    <a className="w-fit" href="https://www.instagram.com/genhoer_dk/" target="_blank" rel="noopener noreferrer">Instagram</a>
                    <a className="w-fit" href="https://www.facebook.com/profile.php?id=61559553821169" target="_blank" rel="noopener noreferrer">Facebook</a>
                    <a className="w-fit" href="https://www.linkedin.com/company/genhoer/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                </Text>
              </div>

                <Marquee pauseOnHover={false} speed={40} gradientColor={colors.ink} gradientWidth={80}>
                    {partners.map(partner => (
                        <img key={partner} src={`/logos/${partner}-logo.svg`} alt="" className="h-6 mx-6 mb-6" />
                    ))}
                </Marquee>
            </section>

        </article>
    );
}