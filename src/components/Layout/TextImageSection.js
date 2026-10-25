import ContentSection from "@/components/Layout/ContentSection";
import Label from "@/components/UI/Label";
import Text from "@/components/UI/Text";

export default function TextImageSection({ label, text, image, children }) {
    return (
        <ContentSection className="pb-32" innerClassName="flex flex-col md:flex-row gap-x-gutter">
            <div className="relative flex-1 aspect-video md:aspect-square">
                <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="w-2xs pt-8 md:pt-0 md:w-xs shrink-0 self-end">
                <Label>{label}</Label>
                <Text className="pt-1">{text}</Text>
                {children}
            </div>
        </ContentSection>
    );
}
