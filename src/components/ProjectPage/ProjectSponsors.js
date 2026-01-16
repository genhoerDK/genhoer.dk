export default function ProjectSponsors({ sponsorLogos }) {
    return (
        <div className='absolute right-4 bottom-14 flex gap-2 h-4 md:right-6 md:bottom-6 md:gap-4 md:h-6'>
          {sponsorLogos.map((sponsor, i) => ( <img src={`/sponsor-logos/${sponsor}-logo.svg`} alt="Sponsorlogo" key={i} />))}
        </div>
    );
}