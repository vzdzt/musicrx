import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Row, Col, Spinner, Alert, Badge } from 'react-bootstrap';

function FeaturedAlbums() {
  const [featuredAlbums, setFeaturedAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) {
    return (
      <div className="text-center my-4">
        <Spinner animation="border" />
        <p>Loading featured albums...</p>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger" className="my-4">{error}</Alert>;
  }

  if (!featuredAlbums.length) {
    return <Alert variant="info" className="my-4">No featured albums available.</Alert>;
  }

  return (
    <div className="my-4">
      <h2 className="text-center mb-4">Featured Albums</h2>
      <Row>
        {featuredAlbums.map((album) => (
          <Col key={album.albumId} md={6} lg={4} className="mb-4">
            <Card className="h-100">
              <Card.Body className="d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <Badge bg="primary" className="mb-2">#{album.ranking}</Badge>
                  <div className="text-end">
                    <h3 className="mb-0">{album.score}/10</h3>
                  </div>
                </div>
                <Card.Title className="mb-1">{album.title}</Card.Title>
                <Card.Subtitle className="mb-2 text-muted">by {album.artist}</Card.Subtitle>
                <Card.Text className="small text-muted mb-2">
                  Released: {new Date(album.releaseDate).toLocaleDateString()}
                </Card.Text>
                {album.imageUrl && (
                  <Card.Img
                    variant="top"
                    src={album.imageUrl}
                    alt={`${album.title} cover`}
                    style={{ maxHeight: '150px', objectFit: 'cover' }}
                    className="mb-2"
                  />
                )}
                <div className="mt-auto">
                  {album.strengths?.length > 0 && (
                    <div className="mb-2">
                      <strong className="text-success">Strengths:</strong>
                      <ul className="mb-0 small">
                        {album.strengths.slice(0, 2).map((s, i) => (
                          <li key={i}>{s}</li>
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
    </div>
  );
}

export default FeaturedAlbums;
