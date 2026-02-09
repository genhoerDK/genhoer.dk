import WorkshopSection from "@/components/Participate/WorkshopSection";
import CoopSection from "@/components/Participate/CoopSection";

export const metadata = {
    title: "Deltag",
    description: "Bliv en del af Genhør. Bliv medlem eller deltag i projekter, workshops og skabelsen af lydinstallationer.",
    alternates: { canonical: "/deltag", },
};

export default function Participate() {

    return (
        <article className="px-2 md:px-4 py-10">
            <WorkshopSection />
            <CoopSection />
        </article>
    );
}