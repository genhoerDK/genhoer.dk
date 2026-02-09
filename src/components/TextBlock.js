import LabelSmall from "@/components/LabelSmall";

export default function TextBlock({ label, largeText = [], smallText = [] }) {
    return (
        <>
            <div className="max-w-3xl py-16">
                {label && <LabelSmall>{label}</LabelSmall>}
                {largeText.map((text, i) => (
                    <p key={i} className="font-light py-1 md:text-xl">{text}</p>
                ))}

            </div>
            <div className="flex flex-col gap-4 ml-auto md:flex-row max-w-4/5 sm:max-w-3/5 md:max-w-xl">
                {smallText.map((text, i) => (
                    <p key={i} className="flex-1 font-light text-xs md:text-sm">{text}</p>
                ))}
            </div>
        </>
    );
}