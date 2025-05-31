import Link from 'next/link';

export default function ProjectCard({ slug, title, description, coverImage }) {
  return (
    <Link
      href={`/projekter/${slug}`}
      className="block overflow-hidden"
    >
      <img
        src={coverImage}
        alt={title}
        className="w-full h-48 object-cover"
      />
      <div className="p-4 bg-white">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>
    </Link>
  );
}