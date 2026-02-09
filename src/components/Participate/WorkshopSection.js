import TextBlock from "../TextBlock";

export default function WorkshopSection() {
    return (
        <section className="md:py-16">
            <div className="grid grid-cols-24">
                <div className="flex items-end col-span-full md:col-start-2 py-16 order-2 lg:col-span-6 lg:order-1 xl:col-start-2">
                    <figure className="relative w-full overflow-hidden sm:w-3/5 lg:w-auto aspect-5/4 lg:aspect-4/5 bg-soft">
                        <video src="https://cdn.genhoer.dk/media/workshop.mp4" playsInline muted loop autoPlay className="size-full object-cover" />
                    </figure>
                </div>
                <div className="col-span-full order-1 md:col-start-4 lg:col-start-8 lg:order-2 xl:col-start-9 xl:col-span-14">
                    <TextBlock label="Workshops"
                        largeText={[
                            "I forbindelse med hvert projekt afholder Genhør et workshopforløb for lokale unge mellem 12-24 år. Her dykker vi ned i den stedbundne historie og udforsker hvordan vi med musik og lyddesign kan skabe en udstilling der gør lokalhistorien levende for publikum.",
                        ]}
                        smallText={[
                            "Kommer Genhør til dit lokalområde og har du lyst til at være medskaber, er du velkommen til at kontakte os eller vores lokale samarbejdspartner. Projektet formes af de deltagende og kræver ikke særlige forudsætninger. Forløbet er ikke udelukkende for musikere, men henvender sig til alle unge, der har lyst til at arbejde kreativt med lydkunst og udstillingsdesign.",
                            "Vi har tidligere afholdt workshops med blandt andet makerspaces, teaterhold, skrivegrupper og musikskoler. Forløbet er et åbent arbejdsrum hvor vi sammen undersøger det historiske tema og udvikler en ny kulturoplevelse. Deltagerne kan arbejde med alt fra idéudvikling til interviews, elektronisk lyd, komposition og interaktivitet.",
                        ]}
                    />
                </div>
            </div>
        </section >
    );
}
