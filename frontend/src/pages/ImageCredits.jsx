import React from 'react';

const ImageCredits = () => {
  const credits = [
    {
      destination: 'Colombo',
      title: 'Beautiful Sunrise over the Colombo Skyline as seen from the ocean.jpg',
      author: 'Praveenshashika',
      url: 'https://commons.wikimedia.org/wiki/File:Beautiful_Sunrise_over_the_Colombo_Skyline_as_seen_from_the_ocean.jpg',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
    },
    {
      destination: 'Kandy',
      title: 'Kandy, Sri Lanka.jpg',
      author: 'DilanC lw',
      url: 'https://commons.wikimedia.org/wiki/File:Kandy,_Sri_Lanka.jpg',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
    },
    {
      destination: 'Galle',
      title: 'Galle fort sri lanka.jpg',
      author: 'Diwyanjalee Wanigasekara',
      url: 'https://commons.wikimedia.org/wiki/File:Galle_fort_sri_lanka.jpg',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
    },
    {
      destination: 'Ella',
      title: 'Nine Arches Bridge in Ella.jpg',
      author: 'Knthabrew',
      url: 'https://commons.wikimedia.org/wiki/File:Nine_Arches_Bridge_in_Ella.jpg',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
    },
    {
      destination: 'Sigiriya',
      title: 'Sigiriya Rock fortress.jpg',
      author: 'Chamixth',
      url: 'https://commons.wikimedia.org/wiki/File:Sigiriya_Rock_fortress.jpg',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
    },
    {
      destination: 'Bentota',
      title: 'Sri Lanka, Bentota, beach (2).JPG',
      author: 'Vincent van Zeijst',
      url: 'https://commons.wikimedia.org/wiki/File:Sri_Lanka,_Bentota,_beach_(2).JPG',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/'
    }
  ];

  return (
    <div className="page-wrapper fade-in py-5" style={{ background: 'var(--color-bg)' }}>
      <div className="container py-4">
        <h2 className="fw-bold font-serif mb-4">Image Credits</h2>
        <p className="text-muted mb-5">
          This project uses authentic, real photographs for its destination cards, generously provided by creators on Wikimedia Commons under Creative Commons licenses. All images were resized, cropped, and converted to WebP format.
        </p>

        <div className="row g-4">
          {credits.map((credit) => (
            <div key={credit.destination} className="col-md-6 col-lg-4">
              <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: '1rem' }}>
                <div className="card-body">
                  <h5 className="card-title fw-bold text-accent">{credit.destination}</h5>
                  <p className="small mb-2 text-muted fst-italic">{credit.title}</p>
                  <p className="mb-2"><strong>Author:</strong> {credit.author}</p>
                  <p className="mb-2">
                    <strong>Source:</strong> <a href={credit.url} target="_blank" rel="noreferrer">Wikimedia Commons</a>
                  </p>
                  <p className="mb-0">
                    <strong>License:</strong> <a href={credit.licenseUrl} target="_blank" rel="noreferrer">{credit.license}</a>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ImageCredits;
