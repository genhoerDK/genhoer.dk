import Title from '@/components/UI/Title';
import Text from '@/components/UI/Text';
import InfoList from '@/components/UI/InfoList';

export default function ProjectDescription({ title, text, info, children }) {
    return (
        <div className="relative grid items-center grid-cols-12 min-h-svh px-gutter pt-12 pb-24 animate-fade-in">
            <div className='max-w-lg col-span-10 sm:col-start-2 sm:col-span-8 md:col-start-3 md:col-span-7 lg:col-start-4'>
                <div className='flex items-center h-10'>
                    {children} {/* Insert play button as child */}
                    <Title size="lg" as="h1">{title}</Title>
                </div>

                {text.map((t, i) => (
                    <Text key={i} className="pb-2">{t}</Text>
                ))}

                <div className='mt-4'>
                    <InfoList items={info} truncate={false} />
                </div>
            </div>
        </div>
    );
}