"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useFooter } from "@/context/FooterContext";
import { PhoneIcon, EnvelopeIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { FiFacebook, FiInstagram, FiLinkedin } from 'react-icons/fi';

export default function Info() {
  const [showContactInfo, setShowContactInfo] = useState(false);
  const { setButtons } = useFooter();

  // ControlBar button
  useEffect(() => {
    setButtons([{ label: "Kontakt", icon: !showContactInfo ? <EnvelopeIcon /> : <ChevronDownIcon />, onClick: () => setShowContactInfo((prev) => !prev), },]);
    return () => setButtons([]);
  }, [showContactInfo]);

  return (
    <motion.article initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.2 }}>

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

      {/* Contact info */}
      <section>
        <div className={`fixed bottom-14 left-0 w-full bg-zinc-200 transition-transform duration-300 ease-in-out ${showContactInfo ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="flex items-center justify-between md:justify-center gap-4 px-2 md:px-4">
            {/* Phone */}
            <a href="tel:+4591611093" className="flex items-center gap-2 p-4 md:hover:bg-zinc-800 md:hover:text-zinc-200">
              <PhoneIcon className="h-6 w-6" />
              <span className="hidden md:block">+45 91 61 10 93</span>
            </a>

            {/* Email */}
            <a href="mailto:hej@genhoer.dk" className="flex items-center gap-2 p-4 md:hover:bg-zinc-800 md:hover:text-zinc-200">
              <EnvelopeIcon className="h-6 w-6" />
              <span className="hidden md:block">hej@genhoer.dk</span>
            </a>

            {/* Facebook */}
            <a href="https://www.facebook.com/people/Genh%C3%B8r/61559553821169/" target="_blank" rel="noopener noreferrer" className="p-4 text-sm md:hover:bg-zinc-800 md:hover:text-zinc-200">
              <FiFacebook className="h-6 w-6" />
            </a>

            {/* Instagram */}
            <a href="https://www.instagram.com/genhoer_dk/" target="_blank" rel="noopener noreferrer" className="p-4 text-sm md:hover:bg-zinc-800 md:hover:text-zinc-200">
              <FiInstagram className="h-6 w-6" />
            </a>

            {/* LinkedIn */}
            <a href="https://linkedin.com/company/genhoer" target="_blank" rel="noopener noreferrer" className="p-4 text-sm md:hover:bg-zinc-800 md:hover:text-zinc-200">
              <FiLinkedin className="h-6 w-6" />
            </a>
          </div>
        </div>
      </section>
    </motion.article>
  );
}