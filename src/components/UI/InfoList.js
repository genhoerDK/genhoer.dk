import { Fragment } from "react";
import Label from "@/components/UI/Label";
import Text from "@/components/UI/Text";

export default function InfoList({ items, truncate = true }) {
    return (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 md:gap-x-8 gap-y-2 cursor-default">
            {items.map(({ label, value }) => (
                <Fragment key={label}>
                    <dt className="pt-1.25">
                        <Label>{label}</Label>
                    </dt>
                    <dd className="min-w-0">
                        <Text size="small" className={truncate ? "truncate" : ""}>{value}</Text>
                    </dd>
                </Fragment>
            ))}
        </dl>
    );
}
