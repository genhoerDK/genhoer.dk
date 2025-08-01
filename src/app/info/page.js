"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useFooter } from "@/context/FooterContext";
import { EnvelopeIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

export default function Info() {
  const [showContactInfo, setShowContactInfo] = useState(false);
  const { setButtons } = useFooter();

  // ControlBar button
  useEffect(() => {
    setButtons([{ label: "Kontakt", icon: !showContactInfo ? <EnvelopeIcon /> : <ChevronDownIcon />, onClick: () => setShowContactInfo((prev) => !prev), },]);
    return () => setButtons([]);
  }, [showContactInfo]);

  return (
    <motion.article initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>

      <section className="flex flex-col justify-center px-2 md:px-4 py-14 md:min-h-screen">
        <div className="grid grid-cols-12 md:grid-cols-24 gap-4 py-8">
          <div className="col-span-full md:col-start-4 max-w-3xl">
            <p className="font-light pb-2 md:text-xl">Rundt omkring i land og by står levn fra svundne tider. Jættestuer, slotsruiner, nedlagte jernbanespor og tomme fabrikshaller – alle er de tavse vidner til en verden af i går.</p>
            <p className="font-light md:text-xl">De er et kig til et fortidigt lokalsamfund, dets borgere og deres liv. Skønt denne materielle arv stadigvæk kan ses, er aktiviteterne de engang husede borte med blæsten, og den første brise førte lyden af dette liv med sig.</p>
          </div>
        </div>

        <div className="grid grid-cols-12 md:grid-cols-24 gap-4 pt-8 md:pt-16">
          <div className="col-span-full col-start-3 md:col-span-9 lg:col-span-6 xl:col-span-5 md:col-start-8 lg:col-start-10 xl:col-start-12">
            <p className="font-light text-xs md:text-sm">Genhør er en nonprofitorganisation, der i samarbejde med lokale aktører engagerer unge i lokal kulturskabelse og udstiller offentlig tilgængelig lydkunst, der styrker kendskabet til den stedbundne kulturarv og den nære danmarkshistorie.</p>
          </div>
          <div className="col-span-full col-start-3 md:col-span-9 lg:col-span-6 xl:col-span-5 md:col-start-17 lg:col-start-16 xl:col-start-17">
            <p className="font-light text-xs md:text-sm">Vi fortolker fortidens lydmiljø på lokalhistoriske lokaliteter og udstiller lydkunst som et ekko fra fortiden i autentiske fysiske rammer. I tomme fabrikshaller, på nedlagte togstationer, i ruiner og i gaderum får publikum mulighed for at høre lokalhistoriens vingesus.</p>
          </div>
        </div>
      </section>

      {/* Contact info */}
      <section>
        <div className={`fixed bottom-0 left-0 w-full h-screen bg-zinc-200 transition-transform duration-500 ease-in-out ${showContactInfo ? 'translate-y-0' : 'translate-y-full'}`}>
          {/* contact */}
        </div>
      </section>
    </motion.article>
  );
}