"use client";

import { useState } from "react";
import { UserPlusIcon, HandRaisedIcon } from "@heroicons/react/20/solid";
import Button from "@/components/UI/Button";
import Label from "@/components/UI/Label";
import TextImageSection from "@/components/Layout/TextImageSection";
import Overlay from "@/components/Layout/Overlay";
import MembershipForm from "@/components/Forms/MembershipForm";
import ContactForm from "@/components/Forms/ContactForm";

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
                <Button variant="soft" onClick={() => setMembershipFormOpen(true)} className="gap-1.5 px-3 py-1.5 mt-2">
                    <UserPlusIcon className="size-4" />
                    <Label size="lg">Bliv medlem</Label>
                </Button>
            </TextImageSection>

            <TextImageSection
                label="Kunstner"
                text="Arbejder du med lyd og har du lyst til at skabe stedspecifik lydkunst i fællesskab med unge? Drømmer du om at gøre alvor af et lydværk som udforsker og fortolker stedbunden kulturarv? Vi er åbne over for nye idéer, kunstneriske eksperimenter og projektforslag."
                image="https://cdn.genhoer.dk/media/kunstner-image.webp"
            >
                <Button variant="soft" onClick={() => setContactFormOpen(true)} className="gap-1.5 px-3 py-1.5 mt-2">
                    <HandRaisedIcon className="size-4" />
                    <Label size="lg">Ræk ud</Label>
                </Button>
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
