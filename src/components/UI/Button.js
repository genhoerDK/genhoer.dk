// Button with the site's color variants. Size, padding and position are added through className.
// Use buttonVariants directly to style a <Link> as a button.

export const buttonVariants = {
    ghost: "md:hover:bg-ink md:hover:text-paper",                             // Toolbar
    soft: "bg-soft md:hover:bg-ink md:hover:text-paper",                      // Calls to action on light background
    solid: "bg-ink text-paper hover:bg-hard",                                 // Form buttons
    pill: "rounded-full bg-ink text-paper md:hover:bg-muted md:hover:text-ink", // Floating button in overlays
    light: "rounded-full bg-paper",                                           // Round button on dark background
};

export default function Button({ variant = "soft", type = "button", className = "", ...props }) {
    return <button type={type} className={`flex items-center cursor-pointer ${buttonVariants[variant]} ${className}`} {...props} />;
}
