import Link from "next/link";
import LabelLarge from "@/components/LabelLarge";
import { XCircleIcon, ArrowRightCircleIcon } from "@heroicons/react/20/solid";

export default function MapControls({ activeProject, setActiveProject }) {
    return (
        <div className={`absolute bottom-14 right-2 flex gap-2 transition-transform duration-500 delay-200 md:hidden ${activeProject ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}>
            <button onClick={() => {setActiveProject(null)}} className="p-2 rounded-full bg-paper cursor-pointer">
                <XCircleIcon className="size-6" />            
            </button>
            <Link href={activeProject?.slug || ""} className="flex items-center gap-2 py-2 pr-2 pl-4 rounded-full bg-paper">
                <LabelLarge>Se mere </LabelLarge>
                <ArrowRightCircleIcon className="size-6" />
            </Link>
        </div>
    );
}