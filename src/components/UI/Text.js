// Running text. Spacing (margins/padding) is added by the parent through className.
// small: info lists, dates · body: paragraphs · lead: intro paragraphs

const sizes = {
    small: "text-xs",
    body: "text-xs md:text-sm",
    lead: "md:text-xl",
};

export default function Text({ size = "body", as: Tag = "p", className = "", children }) {
    return <Tag className={`font-light ${sizes[size]} ${className}`}>{children}</Tag>;
}
