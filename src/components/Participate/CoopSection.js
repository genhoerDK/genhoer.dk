"use client";

import { useState } from "react";
import LabelLarge from "@/components/LabelLarge";
import TextImageSection from "@/components/TextImageSection";
import { UserPlusIcon, HandRaisedIcon } from "@heroicons/react/20/solid";
import MembershipForm from "@/components/Forms/MembershipForm";
import ContactForm from "@/components/Forms/ContactForm";
import Overlay from "../Overlay";

export default function CoopSection() {
    const [membershipFormOpen, setMembershipFormOpen] = useState(false);
    const [contactFormOpen, setContactFormOpen] = useState(false);

    return (
        <>

            <TextImageSection
                label="Medlemskab"
                text="Bak op om Genhørs formål. Medlemskabet er gratis og uden binding. Som medlem får du løbende indsigt i de aktuelle projekter og indflydelse på foreningens udvikling ved den årlige generalforsamling."
                image="https://cdn.genhoer.dk/media/medlemskab-image.webp"
            >
                <button onClick={() => setMembershipFormOpen(true)} className="flex gap-1.5 items-center px-3 py-1.5 mt-2 bg-soft cursor-pointer md:hover:bg-ink md:hover:text-paper">
                    <UserPlusIcon className="size-4" />
                    <LabelLarge>Bliv medlem</LabelLarge>
                </button>
            </TextImageSection>

            <TextImageSection
                label="Kunstner"
                text="Arbejder du med lyd og har du lyst til at skabe stedspecifik lydkunst i fællesskab med unge? Drømmer du om at gøre alvor af et lydværk som udforsker og fortolker stedbunden kulturarv? Vi er åbne over for nye idéer, kunstneriske eksperimenter og projektforslag."
                image="https://cdn.genhoer.dk/media/kunstner-image.webp"
            >
                <button onClick={() => setContactFormOpen(true)} className="flex gap-1.5 items-center px-3 py-1.5 mt-2 bg-soft cursor-pointer md:hover:bg-ink md:hover:text-paper">
                    <HandRaisedIcon className="size-4" />
                    <LabelLarge>Ræk ud</LabelLarge>
                </button>
            </TextImageSection>

            <Overlay active={membershipFormOpen}>
                <MembershipForm onClose={() => setMembershipFormOpen(false)} />
            </Overlay>

            <Overlay active={contactFormOpen}>
                <ContactForm onClose={() => setContactFormOpen(false)} />
            </Overlay>

        </>
    );
}