import LabelSmall from "@/components/LabelSmall";

export default function InfoRow({ label, children, truncate = true }) {
    return (
        <div className="grid grid-cols-6 pb-2">
            <div className="col-span-1 pt-1.25">
                <LabelSmall>{label}</LabelSmall>
            </div>
            <div className="col-start-2 col-span-full">
                <p className={`font-light text-xs pointer-events-none ${truncate ? "truncate" : ""}`}>{children}</p>
            </div>
        </div>
    );
}