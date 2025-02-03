'use client';

const ProjectCard = ({ title, description, imageUrl }) => {
    return (
        <div className="project-card">
            <img src={imageUrl} alt={title} className="project-card-image" />
            <div className="project-card-content">
                <h3>{title}</h3>
                <p>{description}</p>
            </div>
        </div>
    );
};

export default ProjectCard;