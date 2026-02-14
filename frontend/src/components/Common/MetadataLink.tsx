import React from 'react';
import { useNavigate } from 'react-router-dom';

export type MetadataType = 'genre' | 'actor' | 'director' | 'company';

interface MetadataLinkProps {
  type: MetadataType;
  id: number;
  name: string;
  className?: string;
  onNavigate?: () => void; // Called before navigation (e.g., to close modal)
}

const MetadataLink: React.FC<MetadataLinkProps> = ({
  type,
  id,
  name,
  className,
  onNavigate
}) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent parent click handlers
    e.preventDefault();

    // Call onNavigate callback first (e.g., to close modal)
    if (onNavigate) {
      onNavigate();
    }

    // Navigate to discover page with filter
    // Pass the entity name via router state for display
    navigate(`/discovery?${type}=${id}`, {
      state: { filterName: name, filterType: type }
    });
  };

  // Get display label based on type
  const getTypeLabel = (): string => {
    switch (type) {
      case 'genre': return name;
      case 'actor': return 'actor';
      case 'director': return 'director';
      case 'company': return 'studio';
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`cursor-pointer hover:underline transition-colors ${className || ''}`}
      title={`View ${type === 'genre' ? name : getTypeLabel()} movies`}
    >
      {name}
    </button>
  );
};

export default MetadataLink;
