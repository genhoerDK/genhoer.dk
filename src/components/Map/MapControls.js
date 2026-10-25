import Link from "next/link";
import Button, { buttonVariants } from "@/components/UI/Button";
import Label from "@/components/UI/Label";
import { XCircleIcon, ArrowRightCircleIcon } from "@heroicons/react/20/solid";

export default function MapControls({ activeProject, setActiveProject, onMarkerNavigate }) {
    return (
        <div className={`absolute bottom-10 right-0 flex gap-2 p-4 transition-transform duration-500 delay-200 md:hidden ${activeProject ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}>
            <Button variant="light" onClick={() => setActiveProject(null)} className="p-2">
                <XCircleIcon className="size-6" />
            </Button>
            <Link href={activeProject?.slug || ""} onClick={() => onMarkerNavigate?.()} className={`flex items-center gap-2 py-2 pr-2 pl-4 ${buttonVariants.light}`}>
                <Label size="lg">Se mere </Label>
                <ArrowRightCircleIcon className="size-6" />
            </Link>
        </div>
    );
}