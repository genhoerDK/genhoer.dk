import TextSection from "@/components/TextSection";
import CoopSection from "@/components/Participate/CoopSection";

export const metadata = {
    title: "Deltag",
    description: "Bliv en del af Genhør. Bliv medlem eller deltag i projekter, workshops og skabelsen af lydinstallationer.",
    alternates: { canonical: "/deltag", },
};

export default function Participate() {
    return (
        <article>
            <TextSection
                label="Deltag i Genhør"
                largeText={[
                    "Vær med til at skabe en stedspecifik kulturoplevelse, der åbner et lydligt vindue til fortidens lokalsamfund. Vi vil meget gerne høre fra dig, hvis du eller din organisation har lyst til at opstarte et projekt."
                ]}
                smallText={[
                    "Genhør samarbejder med lokale aktører om at udvikle offentligt tilgængelige lydinstallationer. Samarbejdet tager afsæt i lokale muligheder, behov og stedbundne potentialer og realiseres gennem en fælles indsats.",
                ]}
            />

            <CoopSection />
        </article>
    );
}