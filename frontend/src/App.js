import React, { useState } from 'react';
import AlbumReview from './components/AlbumReview';
import FeaturedAlbums from './components/FeaturedAlbums';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import axios from 'axios';

function App() {
  const [albumId, setAlbumId] = useState('');
  const [currentAlbum, setCurrentAlbum] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!albumId.trim()) return;

    setLoading(true);
    setError('');
    try {
      const res = await axios.post('http://localhost:3000/api/album', { albumId: albumId.trim() });
      setCurrentAlbum(res.data);
    } catch (err) {
      setError('Failed to add album. Please check the Spotify Album ID.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 bg-light">
      <Container fluid className="px-3 px-md-4 py-4">
        <Row className="justify-content-center">
          <Col xs={12} lg={10} xl={8}>
            <header className="text-center mb-4 mb-md-5">
              <h1 className="display-4 display-md-3 fw-bold text-dark mb-3">
                MusicRx Album Reviewer
              </h1>
              <p className="lead text-muted">
                Automated album reviews based on streams, sales, reviews, and sentiment
              </p>
            </header>

            <main>
              <FeaturedAlbums />

              <section className="my-4 my-md-5">
                <div className="bg-white rounded-3 shadow-sm p-4 p-md-5">
                  <h2 className="h3 text-center mb-4 fw-bold">Add Album Manually</h2>
                  <Form onSubmit={handleSearch}>
                    <Form.Group controlId="albumId" className="mb-3">
                      <Form.Label className="fw-semibold">Spotify Album ID</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter Spotify Album ID (e.g., 4aawyAB9vmqN3uQ7FjRGTy)"
                        value={albumId}
                        onChange={(e) => setAlbumId(e.target.value)}
                        required
                        className="form-control-lg"
                        size="lg"
                      />
                      <Form.Text className="text-muted">
                        Find the album ID in the Spotify URL or share link
                      </Form.Text>
                    </Form.Group>
                    <div className="d-grid d-md-block">
                      <Button
                        variant="primary"
                        type="submit"
                        disabled={loading}
                        size="lg"
                        className="px-4 py-2 fw-semibold"
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Adding Album...
                          </>
                        ) : (
                          'Add Album for Review'
                        )}
                      </Button>
                    </div>
                  </Form>
                </div>
              </section>

              {error && (
                <Alert variant="danger" className="mb-4" dismissible onClose={() => setError('')}>
                  <strong>Error:</strong> {error}
                </Alert>
              )}

              {currentAlbum && (
                <section className="mb-5">
                  <AlbumReview albumId={currentAlbum.albumId} />
                </section>
              )}
            </main>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default App;
