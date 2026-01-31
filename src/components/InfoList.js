import { Fragment } from "react";
import LabelSmall from "@/components/LabelSmall";

export default function InfoList({ items, truncate = true }) {
    return (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 md:gap-x-8 gap-y-2">
            {items.map(({ label, value }) => (
                <Fragment key={label}>
                    <dt className="pt-1.25">
                        <LabelSmall>{label}</LabelSmall>
                    </dt>
                    <dd className="min-w-0">
                        <p className={`font-light text-xs ${truncate ? "truncate" : ""}`}>{value}</p>
                    </dd>
                </Fragment>
            ))}
        </dl>
    );
}