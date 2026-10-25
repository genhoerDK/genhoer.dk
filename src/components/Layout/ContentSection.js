// Section with the site's centered content column (24-column grid that narrows on large screens).
// className styles the section, innerClassName styles the content column.

export default function ContentSection({ className = "", innerClassName = "", children }) {
    return (
        <section className={`grid grid-cols-24 px-gutter ${className}`}>
            <div className={`col-span-full lg:col-start-3 lg:col-span-18 xl:col-start-5 xl:col-span-14 ${innerClassName}`}>
                {children}
            </div>
        </section>
    );
}
