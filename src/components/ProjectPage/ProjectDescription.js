import TitleLarge from '@/components/TitleLarge';
import InfoList from '@/components/InfoList';

export default function ProjectDescription({ title, text, info, children }) {
    return (
        <div className="relative size-full grid items-center grid-cols-12 px-2 md:px-4 pt-12 pb-24">
            <div className='max-w-lg col-span-10 sm:col-start-2 sm:col-span-8 md:col-start-3 md:col-span-7 lg:col-start-4'>
                <div className='flex items-center h-10'>
                    {children}
                    <TitleLarge>{title}</TitleLarge>
                </div>

                {text.map((t, i) => ( 
                    <p key={i} className="font-light text-xs md:text-sm pb-2">{t}</p> 
                ))}

                <div className='mt-4'>
                    <InfoList items={info} truncate={false} />
                </div>
            </div>
        </div>
    );
}