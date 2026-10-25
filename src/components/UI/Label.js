// Small uppercase label — used for field names, button text and status tags.
// sm: tiny tags and field names · lg: button text
// className adds layout, e.g. "truncate" to cut long text with …

const sizes = {
    sm: "text-[0.5rem]",
    lg: "text-xs mb-[1px]",
};

export default function Label({ size = "sm", as: Tag = "span", className = "", children }) {
    return <Tag className={`block uppercase leading-none pointer-events-none ${sizes[size]} ${className}`}>{children}</Tag>;
}
