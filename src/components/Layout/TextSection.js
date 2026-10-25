import ContentSection from "@/components/Layout/ContentSection";
import Label from "@/components/UI/Label";
import Text from "@/components/UI/Text";

// Intro section of a page. The label is the page's <h1>.
export default function TextSection({ label, largeText = [], smallText = [] }) {
    return (
        <ContentSection className="items-center min-h-svh pt-14 animate-fade-in">
            <div className="pb-12">
                {label && <Label as="h1">{label}</Label>}
                {largeText.map((text) => (
                    <Text key={text} size="lead" className="pt-1">{text}</Text>
                ))}
            </div>

            <div className="flex flex-col gap-4 w-2xs md:w-xs ml-auto text-left">
                {smallText.map((text) => (
                    <Text key={text}>{text}</Text>
                ))}
            </div>
        </ContentSection>
    );
}
