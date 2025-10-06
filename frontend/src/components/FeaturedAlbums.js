import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, Row, Col, Spinner, Alert, Badge } from 'react-bootstrap';

function FeaturedAlbums() {
  const [featuredAlbums, setFeaturedAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visibleAlbums, setVisibleAlbums] = useState(6);
  const observerRef = useRef();

  useEffect(() => {
    const fetchFeaturedAlbums = async () => {
      try {
        const res = await axios.get('http://localhost:3000/api/featured-albums');
        setFeaturedAlbums(res.data);
      } catch (err) {
        setError('Failed to load featured albums.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeaturedAlbums();
  }, []);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleAlbums < featuredAlbums.length) {
          setVisibleAlbums(prev => Math.min(prev + 6, featuredAlbums.length));
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [visibleAlbums, featuredAlbums.length]);

  if (loading) {
    return (
      <section className="my-4 my-md-5">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="text-muted mb-0">Loading featured albums...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="my-4 my-md-5">
        <Alert variant="danger" className="text-center">
          <strong>Unable to load albums:</strong> {error}
        </Alert>
      </section>
    );
  }

  if (!featuredAlbums.length) {
    return (
      <section className="my-4 my-md-5">
        <Alert variant="info" className="text-center">
          No featured albums available at the moment.
        </Alert>
      </section>
    );
  }

  return (
    <section className="my-4 my-md-5">
      <div className="text-center mb-4 mb-md-5">
        <h2 className="display-5 fw-bold text-dark mb-3">Featured Albums</h2>
        <p className="text-muted lead">Discover the highest-rated albums of the year</p>
      </div>

      <Row className="g-3 g-md-4">
        {featuredAlbums.slice(0, visibleAlbums).map((album, index) => (
          <Col key={album.albumId} xs={12} sm={6} lg={4} className="mb-3 mb-md-4">
            <Card className="h-100 border-0 shadow-sm hover-shadow transition-all">
              <Card.Body className="d-flex flex-column p-3 p-md-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <Badge bg="primary" className="fs-6 px-2 py-1">#{album.ranking}</Badge>
                  <div className="text-end">
                    <span className="display-6 fw-bold text-primary mb-0">{album.score}</span>
                    <small className="text-muted d-block">/10</small>
                  </div>
                </div>

                <Card.Title className="h5 mb-2 fw-bold line-clamp-2" title={album.title}>
                  {album.title}
                </Card.Title>

                <Card.Subtitle className="text-muted mb-2 fw-medium" title={album.artist}>
                  by {album.artist}
                </Card.Subtitle>

                <Card.Text className="small text-muted mb-3">
                  Released: {new Date(album.releaseDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </Card.Text>

                {album.imageUrl && (
                  <div className="mb-3">
                    <img
                      src={album.imageUrl}
                      alt={`${album.title} album cover`}
                      className="img-fluid rounded shadow-sm w-100"
                      style={{ aspectRatio: '1', objectFit: 'cover' }}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                )}

                <div className="mt-auto">
                  {album.strengths?.length > 0 && (
                    <div>
                      <strong className="text-success small fw-semibold d-block mb-1">Strengths:</strong>
                      <ul className="list-unstyled mb-0 small">
                        {album.strengths.slice(0, 2).map((strength, i) => (
                          <li key={i} className="mb-1">
                            <span className="text-success me-1">✓</span>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {visibleAlbums < featuredAlbums.length && (
        <div ref={observerRef} className="text-center py-4">
          <Spinner animation="border" variant="primary" size="sm" />
          <p className="text-muted small mt-2">Loading more albums...</p>
        </div>
      )}
    </section>
  );
}

export default FeaturedAlbums;
