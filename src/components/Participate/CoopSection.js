"use client";

import { useState } from "react";
import LabelSmall from "@/components/LabelSmall";
import LabelLarge from "@/components/LabelLarge";
import { UserPlusIcon, UserGroupIcon, HandRaisedIcon, PaperAirplaneIcon } from "@heroicons/react/20/solid";
import MembershipForm from "@/components/Forms/MembershipForm";
import PartnershipForm from "@/components/Forms/PartnershipForm";
import ContactForm from "@/components/Forms/ContactForm";
import Overlay from "../Overlay";

export default function CoopSection() {
    const [membershipFormOpen, setMembershipFormOpen] = useState(false);
    const [contactFormOpen, setContactFormOpen] = useState(false);
    const [partnershipFormOpen, setPartnershipFormOpen] = useState(false);

    return (
        <>
        <section className="grid grid-cols-24 pb-16 lg:pt-8">
            <div className="col-span-full lg:col-start-4 lg:col-span-18 xl:col-start-4 xl:col-span-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-16">
                    <div>
                        <LabelSmall>Medlemskab</LabelSmall>
                        <p className="font-light text-sm md:text-base pt-1 pb-3">
                            Bak op om ungeinddragelse i lokal kulturskabelse og tilblivelsen af offentligt tilgængelig lydkunst, der styrker kendskabet til den nære danmarkshistorie. Medlemskabet er gratis og uden binding. Som medlem får du løbende indsigt i de aktuelle projekter og indflydelse på foreningens udvikling ved den årlige generalforsamling.
                        </p>
                        <button onClick={() => setMembershipFormOpen(true)} className="flex gap-1.5 items-center px-3 py-1.5 bg-soft rounded-full cursor-pointer md:hover:bg-ink md:hover:text-paper">
                            <UserPlusIcon className="size-4" />
                            <LabelLarge>Bliv medlem</LabelLarge>
                        </button>
                    </div>

                    <div>
                        <LabelSmall>Partnerskab</LabelSmall>
                        <p className="font-light text-sm md:text-base pt-1 pb-3">
                            Genhør samarbejder med lokale aktører om at udvikle offentligt tilgængelige lydinstallationer. Samarbejdet tager afsæt i lokale muligheder, behov og stedbundne potentialer og realiseres gennem en fælles indsats. Henvend jer gerne, hvis I ønsker at indgå i et samarbejde med foreningen.
                        </p>
                        <button onClick={() => setPartnershipFormOpen(true)} className="flex gap-1.5 items-center px-3 py-1.5 bg-soft rounded-full cursor-pointer md:hover:bg-ink md:hover:text-paper">
                            <UserGroupIcon className="size-4" />
                            <LabelLarge>Samarbejd med os</LabelLarge>
                        </button>
                    </div>

                    <div>
                        <LabelSmall>Kunstner</LabelSmall>
                        <p className="font-light text-sm md:text-base pt-1 pb-3">
                            Er du komponist, lyddesigner eller sonisk jonglør og har du lyst til at arbejde med stedspecifik lydkunst, der tager afsæt i ungeinddragelse og kulturhistorie? Drømmer du om at gøre alvor af et lydværk som udforsker og fortolker stedbunden kulturarv? Så ræk ud til os. Vi er åbne over for nye idéer, kunstneriske eksperimenter og projektforslag.
                        </p>
                        <button onClick={() => setContactFormOpen(true)} className="flex gap-1.5 items-center px-3 py-1.5 bg-soft rounded-full cursor-pointer md:hover:bg-ink md:hover:text-paper">
                            <HandRaisedIcon className="size-4" />
                            <LabelLarge>Ræk ud</LabelLarge>
                        </button>
                    </div>

                    <div>
                        <LabelSmall>Lokalhistorisk tip</LabelSmall>
                        <p className="font-light text-sm md:text-base pt-1 pb-3">
                            Kender du til en bygning, et sted eller en hændelse som har haft stor historisk betydning for dit lokalområde. En historie som har rodfæstet sig i egnsfortællingen? Sagn, folkefortællinger eller myter som er unikke for dit nærområde? Send dem gerne til os så vi kan indsamle lokaliteter og temaer til fremtidige projekter.
                        </p>
                        <button onClick={() => setContactFormOpen(true)} className="flex gap-1.5 items-center px-3 py-1.5 bg-soft rounded-full cursor-pointer md:hover:bg-ink md:hover:text-paper">
                            <PaperAirplaneIcon className="size-4" />
                            <LabelLarge>Send os et tip</LabelLarge>
                        </button>
                    </div>
                </div>
            </div>


        </section>

            
        <Overlay active={membershipFormOpen}>
            <MembershipForm onClose={() => setMembershipFormOpen(false)} />
        </Overlay>

        <Overlay active={partnershipFormOpen}>
            <PartnershipForm onClose={() => setPartnershipFormOpen(false)} />
        </Overlay>

        <Overlay active={contactFormOpen}>
            <ContactForm onClose={() => setContactFormOpen(false)} />
        </Overlay>

        </>
    );
}