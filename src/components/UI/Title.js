// Light, single-line title.
// sm: project cards · lg: project page

const sizes = {
    sm: "",
    lg: "text-lg md:text-xl",
};

export default function Title({ size = "sm", as: Tag = "h2", children }) {
    return <Tag className={`font-light leading-none pointer-events-none whitespace-nowrap ${sizes[size]}`}>{children}</Tag>;
}
