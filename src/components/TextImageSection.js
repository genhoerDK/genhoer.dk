import LabelSmall from "@/components/LabelSmall";

export default function TextImageSection({ label, text, image, children }) {
    return (
        <section className="grid grid-cols-24 px-2 md:px-4 pb-32">
            <div className="flex col-span-full lg:col-start-3 lg:col-span-18 xl:col-start-5 xl:col-span-14 gap-x-2 md:gap-x-4">
                <div className="relative flex-1 aspect-square">
                    <img src={image} className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <div className="w-2xs md:w-xs shrink-0 self-end">
                    <LabelSmall>{label}</LabelSmall>
                    <p className="font-light text-xs md:text-sm pt-1">{text}</p>
                    {children}
                </div>
            </div>
        </section>
    );
}